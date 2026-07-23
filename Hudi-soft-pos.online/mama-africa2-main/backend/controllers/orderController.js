// MongoDB order controller
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Table from '../models/Table.js';
import Customer from '../models/Customer.js';
import CustomerLedger from '../models/CustomerLedger.js';
import Branch from '../models/Branch.js';
import mongoose from 'mongoose';

// Generate order number
const generateOrderNumber = async (branchCode, branchId) => {
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

  // Get last order number for today in this branch
  // Using regex to match [branchCode]-[dateStr]-XXXX
  const lastOrder = await Order.findOne({
    branch: branchId,
    orderNumber: { $regex: new RegExp(`^${branchCode}-${dateStr}-`) }
  }).sort({ createdAt: -1 });

  let sequence = 1;
  if (lastOrder && lastOrder.orderNumber) {
    const parts = lastOrder.orderNumber.split('-');
    const lastSeq = parseInt(parts[parts.length - 1]);
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }

  return `${branchCode}-${dateStr}-${String(sequence).padStart(4, '0')}`;
};

// Helper to format order response
const formatOrder = (order) => {
  if (!order) return null;
  const o = order.toObject ? order.toObject() : order;
  return {
    ...o,
    _id: o._id.toString(),
    id: o._id.toString(),
    notes: o.kitchenNotes || o.notes || o.specialInstructions || '',
    customer: o.customer ? o.customer.toString() : null,
    table: o.table ? o.table.toString() : null,
    branch: o.branch ? o.branch.toString() : null,
    cashier: o.cashier ? (o.cashier._id ? { ...o.cashier, _id: o.cashier._id.toString() } : o.cashier.toString()) : null,
    servedBy: o.servedBy ? (o.servedBy._id ? { ...o.servedBy, _id: o.servedBy._id.toString() } : o.servedBy.toString()) : null,
    items: o.items ? o.items.map(i => {
      const item = i.toObject ? i.toObject() : i;
      const productName = item.product_name || item.productName || item.name || item.itemName || (item.product && typeof item.product === 'object' ? item.product.name : '');
      return {
        ...item,
        _id: item._id ? item._id.toString() : undefined,
        product: item.product ? (typeof item.product === 'object' ? { ...item.product, _id: item.product._id.toString() } : item.product.toString()) : null,
        product_name: productName
      };
    }) : []
  };
};

// Create new order - MongoDB
export const createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { items, orderType, notes, paymentMethod, tax: providedTax, finalTotal: providedTotal, bookedRoom } = req.body;

    // Handle parameter aliases from POS
    const customerId = req.body.customerId || req.body.customer; 
    const customerName = req.body.customerName;
    const customerPhone = req.body.customerPhone;

    // Handle table lookup
    let tableId = req.body.tableId;
    const tableNumberParam = req.body.tableNumber;

    const branchId = req.user.branch._id || req.user.branch.id;
    const branchCode = req.user.branch.branchCode || 'MAIN';

    // Look up table by number if ID is missing but number is provided
    if (!tableId && tableNumberParam) {
      const tableObj = await Table.findOne({
        branch: branchId,
        $or: [{ number: tableNumberParam }, { tableNumber: tableNumberParam }]
      }).session(session);
      if (tableObj) {
        tableId = tableObj._id;
      }
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Order must contain at least one item');
    }

    // Generate order number
    const orderNumber = await generateOrderNumber(branchCode, branchId);

    // Process items and calculate totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findOne({ _id: item.product, branch: branchId }).session(session);
      if (!product) {
        throw new Error(`Product not found: ${item.product}`);
      }

      if (!product.isAvailable) {
        throw new Error(`Product ${product.name} is not available`);
      }

      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
      }

      // Update product stock
      product.stock -= item.quantity;
      await product.save({ session });

      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product: product._id,
        product_name: product.name,
        productName: product.name,
        name: product.name,
        itemName: product.name,
        quantity: item.quantity,
        price: product.price,
        total: itemTotal,
        notes: item.notes || ''
      });
    }

    // Get branch settings for tax/service charge
    const branch = await Branch.findById(branchId).session(session);
    const taxRate = branch?.settings?.taxRate || 4;
    const serviceChargeRate = branch?.settings?.serviceCharge || 5;

    const tax = providedTax !== undefined ? providedTax : (subtotal * (taxRate / 100));
    const serviceCharge = (subtotal * (serviceChargeRate / 100));
    const finalTotal = providedTotal !== undefined ? providedTotal : (subtotal + tax + serviceCharge);

    // Handle customer
    let customer = null;
    if (customerId) {
      customer = await Customer.findOne({ _id: customerId, branch: branchId }).session(session);
    } else if (customerPhone) {
      customer = await Customer.findOne({ phone: customerPhone, branch: branchId }).session(session);
      if (!customer && customerName) {
        customer = await Customer.create([{
          name: customerName,
          phone: customerPhone,
          branch: branchId
        }], { session });
        customer = customer[0];
      }
    }

    // Handle table assignment
    let table = null;
    let tableNumber = '';
    if (tableId && orderType === 'dine-in') {
      table = await Table.findOne({ _id: tableId, branch: branchId }).session(session);
      if (!table) {
        throw new Error('Table not found');
      }

      if (table.status !== 'available') {
        throw new Error(`Table ${table.number} is not available`);
      }

      // Update table status
      table.status = 'occupied';
      await table.save({ session });
      tableNumber = table.number;
    }

    // Handle customer ledger if payment is credit
    let paymentStatusToSave = 'pending';
    if (paymentMethod === 'credit') {
      if (!customer) throw new Error('Customer account selected but no customer linked to this order.');
      
      let newBal = 0;
      
      if (customer.accountType === 'debit') {
        if (customer.balance < finalTotal) {
           throw new Error(`Insufficient debit deposit. Available: $${(customer.balance || 0).toFixed(2)}, Required: $${finalTotal.toFixed(2)}`);
        }
        customer.balance -= finalTotal;
        newBal = -customer.balance;
      } else if (customer.accountType === 'credit') {
        const available = (customer.creditLimit || 0) - (customer.creditUsed || 0);
        if (available < finalTotal) {
           throw new Error(`Credit limit exceeded. Available: $${available.toFixed(2)}, Required: $${finalTotal.toFixed(2)}`);
        }
        customer.creditUsed += finalTotal;
        newBal = customer.creditUsed;
      } else {
        // For standard/unmigrated customer, we subtract from running balance
        const lastTx = await CustomerLedger.findOne({ customer: customer._id })
          .sort({ date: -1, _id: -1 })
          .session(session);
        
        let currentBalance = lastTx ? lastTx.balance : 0;
        currentBalance += finalTotal;
        customer.balance = -currentBalance;
        newBal = currentBalance;
      }
      
      await customer.save({ session });
      paymentStatusToSave = 'paid'; // Consider order paid since it hit the ledger
      
      // Create ledger entry
      await CustomerLedger.create([{
        customer: customer._id,
        transactionType: 'sale',
        amount: finalTotal,
        balance: newBal, // Tracking new balance (or new credit used)
        description: `POS Order ${orderNumber}`,
        branch: branchId
      }], { session });
    }

    // Create order
    const order = await Order.create([{
      orderNumber,
      orderType,
      status: 'pending',
      customer: customer ? customer._id : null,
      table: tableId || null,
      tableNumber,
      customerName: customer?.name || customerName || 'Walking Customer',
      customerPhone: customer?.phone || customerPhone,
      subtotal,
      tax,
      serviceCharge,
      finalTotal,
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: paymentStatusToSave,
      cashier: req.user.id,
      servedBy: req.body.servedBy || req.user.id,
      bookedRoom: bookedRoom || '',
      branch: branchId,
      items: orderItems,
      kitchenStatus: 'pending',
      kitchenNotes: notes || ''
    }], { session });

    const createdOrder = order[0];
    await session.commitTransaction();
    session.endSession();

    const formattedOrder = formatOrder(createdOrder);

    // Emit real-time events
    if (req.io) {
      req.io.to(`branch-${branchId}`).emit('new-order', formattedOrder);
      req.io.to(`kitchen-${branchId}`).emit('new-kitchen-order', formattedOrder);
      req.io.to(`pos-${branchId}`).emit('order-created', formattedOrder);
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: formattedOrder
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Order creation error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create order'
    });
  }
};

// Get all orders - MongoDB
export const getOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      orderType,
      paymentStatus,
      kitchenStatus,
      startDate,
      endDate,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const branchId = req.user.branch._id || req.user.branch.id;

    const query = { branch: branchId };

    if (status) {
      if (status === 'active') {
        query.status = { $in: ['pending', 'confirmed', 'preparing', 'ready'] };
      } else {
        query.status = status;
      }
    }

    if (kitchenStatus) {
      query.kitchenStatus = kitchenStatus;
    }

    if (orderType) {
      query.orderType = orderType;
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
        { tableNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Order.countDocuments(query);
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const orders = await Order.find(query)
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('items.product', 'name')
      .populate('servedBy', 'name')
      .populate('cashier', 'name');

    res.json({
      success: true,
      data: {
        orders: orders.map(formatOrder),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
};

// Get single order - MongoDB
export const getOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user.branch._id || req.user.branch.id;

    const order = await Order.findOne({ _id: id, branch: branchId })
      .populate('items.product', 'name price image category')
      .populate('servedBy', 'name')
      .populate('cashier', 'name');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: formatOrder(order)
    });
  } catch (error) {
    console.error('Get single order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order details'
    });
  }
};

// Get kitchen orders - MongoDB
export const getKitchenOrders = async (req, res) => {
  try {
    const {
      kitchenStatus = 'all',
      limit = 50,
      startDate,
      endDate
    } = req.query;

    const branchId = req.user.branch._id || req.user.branch.id;

    const query = {
      branch: branchId,
      status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] }
    };

    if (kitchenStatus && kitchenStatus !== 'all') {
      query.kitchenStatus = kitchenStatus;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(query)
      .sort({ createdAt: 1 })
      .limit(parseInt(limit));

    // Get kitchen statistics
    const stats = await Order.aggregate([
      { $match: { branch: new mongoose.Types.ObjectId(branchId), status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] } } },
      { $group: { _id: "$kitchenStatus", count: { $sum: 1 } } }
    ]);

    const statusStats = {
      pending: 0,
      preparing: 0,
      ready: 0
    };

    stats.forEach(s => {
      if (statusStats.hasOwnProperty(s._id)) {
        statusStats[s._id] = s.count;
      }
    });

    res.json({
      success: true,
      data: {
        orders: orders.map(formatOrder),
        stats: statusStats
      }
    });
  } catch (error) {
    console.error('Get kitchen orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch kitchen orders'
    });
  }
};

// Update order status - MongoDB
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, kitchenStatus } = req.body;
    const branchId = req.user.branch._id || req.user.branch.id;

    const order = await Order.findOne({ _id: id, branch: branchId })
      .populate('items.product', 'name')
      .populate('servedBy', 'name')
      .populate('cashier', 'name');
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (status) {
      const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }
      
      const oldStatus = order.status;
      order.status = status;

      // Handle stock restoration on cancel
      if (status === 'cancelled' && oldStatus !== 'cancelled') {
        for (const item of order.items) {
          await Product.updateOne(
            { _id: item.product },
            { $inc: { stock: item.quantity } }
          );
        }

        // Free table
        if (order.table) {
          await Table.updateOne({ _id: order.table }, { status: 'available' });
        }
      }

      if (status === 'completed') {
        order.paymentStatus = 'paid';
      }
    }

    if (kitchenStatus) {
      const validKitchenStatuses = ['pending', 'preparing', 'ready', 'served'];
      if (!validKitchenStatuses.includes(kitchenStatus)) {
        return res.status(400).json({ success: false, message: 'Invalid kitchen status' });
      }
      order.kitchenStatus = kitchenStatus;

      if (kitchenStatus === 'ready') {
        order.status = 'ready';
      }
    }

    await order.save();
    const formattedOrder = formatOrder(order);

    // Emit real-time events
    if (req.io) {
      req.io.to(`branch-${branchId}`).emit('order-status-updated', formattedOrder);
      req.io.to(`kitchen-${branchId}`).emit('kitchen-order-updated', formattedOrder);
      req.io.to(`pos-${branchId}`).emit('order-updated', formattedOrder);

      if (formattedOrder.kitchenStatus === 'ready') {
        req.io.to(`branch-${branchId}`).emit('order-ready', formattedOrder);
      }
    }

    res.json({
      success: true,
      message: 'Order updated successfully',
      data: formattedOrder
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
};

// Process payment - MongoDB
export const processPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { paymentMethod, amount, customerId } = req.body;
    const branchId = req.user.branch._id || req.user.branch.id;

    const order = await Order.findOne({ _id: id, branch: branchId }).session(session);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.paymentStatus === 'paid') {
      throw new Error('Order is already paid');
    }

    if (amount < order.finalTotal) {
      throw new Error(`Payment amount (${amount}) is less than order total (${order.finalTotal})`);
    }

    // Associate customer if customerId is passed
    if (customerId) {
      const dbCustomer = await Customer.findById(customerId).session(session);
      if (dbCustomer) {
        order.customer = dbCustomer._id;
        order.customerName = dbCustomer.name;
      }
    }

    // Handle customer ledger if payment is credit
    if (paymentMethod === 'credit') {
      const customerIdToUse = order.customer || customerId;
      if (!customerIdToUse) {
        throw new Error('Customer account selected but order has no linked customer.');
      }
      const customer = await Customer.findById(customerIdToUse).session(session);
      if (!customer) throw new Error('Customer account selected but order has no linked customer.');
      
      let newBal = 0;
      
      if (customer.accountType === 'debit') {
        if (customer.balance < order.finalTotal) {
           throw new Error(`Insufficient debit deposit. Available: $${(customer.balance || 0).toFixed(2)}, Required: $${order.finalTotal.toFixed(2)}`);
        }
        customer.balance -= order.finalTotal;
        newBal = -customer.balance;
      } else if (customer.accountType === 'credit') {
        const available = (customer.creditLimit || 0) - (customer.creditUsed || 0);
        if (available < order.finalTotal) {
           throw new Error(`Credit limit exceeded. Available: $${available.toFixed(2)}, Required: $${order.finalTotal.toFixed(2)}`);
        }
        customer.creditUsed += order.finalTotal;
        newBal = customer.creditUsed;
      } else {
        // For standard/unmigrated customer, we subtract from running balance
        const lastTx = await CustomerLedger.findOne({ customer: customer._id })
          .sort({ date: -1, _id: -1 })
          .session(session);
        
        let currentBalance = lastTx ? lastTx.balance : 0;
        currentBalance += order.finalTotal;
        customer.balance = -currentBalance;
        newBal = currentBalance;
      }
      
      await customer.save({ session });
      
      // Create ledger entry
      await CustomerLedger.create([{
        customer: customer._id,
        transactionType: 'sale',
        amount: order.finalTotal,
        balance: newBal,
        description: `POS Order ${order.orderNumber}`,
        branch: branchId
      }], { session });
    }

    // Update order
    order.paymentMethod = paymentMethod || 'cash';
    order.paymentStatus = 'paid';
    order.status = 'completed';
    await order.save({ session });

    // Free table
    if (order.table) {
      await Table.updateOne({ _id: order.table }, { status: 'available' }).session(session);
    }

    await session.commitTransaction();
    session.endSession();

    const formattedOrder = formatOrder(order);

    // Emit events
    if (req.io) {
      req.io.to(`branch-${branchId}`).emit('order-completed', formattedOrder);
      req.io.to(`kitchen-${branchId}`).emit('order-completed', formattedOrder);
    }

    res.json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        order: formattedOrder,
        change: amount - order.finalTotal
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Process payment error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to process payment'
    });
  }
};

// Update order - MongoDB
export const updateOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { items, notes, tax: providedTax, finalTotal: providedTotal, bookedRoom } = req.body;
    const branchId = req.user.branch._id || req.user.branch.id;

    const order = await Order.findOne({ _id: id, branch: branchId }).session(session);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status === 'completed' || order.status === 'cancelled' || order.paymentStatus === 'paid') {
      throw new Error('Cannot update completed or paid orders');
    }

    // Revert previous stock
    for (const item of order.items) {
      await Product.updateOne(
        { _id: item.product },
        { $inc: { stock: item.quantity } }
      ).session(session);
    }

    // Validate and reserve new stock
    let subtotal = 0;
    const newOrderItems = [];

    for (const item of items) {
      const product = await Product.findOne({ _id: item.product, branch: branchId }).session(session);
      if (!product) throw new Error(`Product not found: ${item.product}`);
      if (!product.isAvailable) throw new Error(`Product ${product.name} is not available`);
      if (product.stock < item.quantity) throw new Error(`Insufficient stock for ${product.name}`);

      product.stock -= item.quantity;
      await product.save({ session });

      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      newOrderItems.push({
        product: product._id,
        product_name: product.name,
        productName: product.name,
        name: product.name,
        itemName: product.name,
        quantity: item.quantity,
        price: product.price,
        total: itemTotal,
        notes: item.notes || ''
      });
    }

    // Get settings for re-calculation
    const branch = await Branch.findById(branchId).session(session);
    const taxRate = branch?.settings?.taxRate || 4;
    const serviceChargeRate = branch?.settings?.serviceCharge || 5;

    const tax = providedTax !== undefined ? providedTax : (subtotal * (taxRate / 100));
    const serviceCharge = (subtotal * (serviceChargeRate / 100));
    const finalTotal = providedTotal !== undefined ? providedTotal : (subtotal + tax + serviceCharge);

    // Update order fields
    order.items = newOrderItems;
    order.subtotal = subtotal;
    order.tax = tax;
    order.serviceCharge = serviceCharge;
    order.finalTotal = finalTotal;
    order.kitchenNotes = notes || '';
    if (bookedRoom !== undefined) {
      order.bookedRoom = bookedRoom;
    }
    if (req.body.servedBy) {
      order.servedBy = req.body.servedBy;
    }
    
    await order.save({ session });
    await session.commitTransaction();
    session.endSession();

    const formattedOrder = formatOrder(order);

    // Emit events
    if (req.io) {
      req.io.to(`branch-${branchId}`).emit('pos-order-updated', formattedOrder);
      req.io.to(`kitchen-${branchId}`).emit('kitchen-order-updated', formattedOrder);
    }

    res.json({
      success: true,
      message: 'Order updated successfully',
      data: formattedOrder
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Update order error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update order'
    });
  }
};

// Get order statistics - MongoDB
export const getOrderStats = async (req, res) => {
  try {
    const { period = 'today' } = req.query;
    const branchId = req.user.branch._id || req.user.branch.id;

    let startDate = new Date();
    const now = new Date();

    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate.setHours(0, 0, 0, 0);
    }

    const stats = await Order.aggregate([
      { $match: { branch: new mongoose.Types.ObjectId(branchId), createdAt: { $gte: startDate } } },
      { $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: "$finalTotal" },
        completedOrders: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
        pendingOrders: { $sum: { $cond: [{ $in: ["$status", ["pending", "confirmed", "preparing"]] }, 1, 0] } },
        averageOrderValue: { $avg: "$finalTotal" }
      }}
    ]);

    const overview = stats.length > 0 ? stats[0] : {
      totalOrders: 0,
      totalRevenue: 0,
      completedOrders: 0,
      pendingOrders: 0,
      averageOrderValue: 0
    };

    delete overview._id;

    res.json({
      success: true,
      data: {
        period,
        overview
      }
    });
  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order statistics'
    });
  }
};

// Hard delete order - MongoDB (Admin/Manager only)
export const deleteOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const branchId = req.user.branch._id || req.user.branch.id;

    const order = await Order.findOne({ _id: id, branch: branchId }).session(session);
    if (!order) {
      throw new Error('Order not found');
    }

    // Restore stock if order wasn't already cancelled
    if (order.status !== 'cancelled') {
      for (const item of order.items) {
        await Product.updateOne(
          { _id: item.product },
          { $inc: { stock: item.quantity } }
        ).session(session);
      }
    }

    // Free table if occupied by this order
    if (order.table && order.status !== 'completed' && order.status !== 'cancelled') {
      await Table.updateOne({ _id: order.table }, { status: 'available' }).session(session);
    }

    await Order.deleteOne({ _id: id }).session(session);
    
    await session.commitTransaction();
    session.endSession();

    // Emit real-time event
    if (req.io) {
      req.io.to(`branch-${branchId}`).emit('order-deleted', { id });
    }

    res.json({
      success: true,
      message: 'Order permanently deleted'
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Delete order error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete order'
    });
  }
};

