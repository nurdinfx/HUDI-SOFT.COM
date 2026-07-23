// backend/controllers/qrController.js
import crypto from 'crypto';
import Table from '../models/Table.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Settings from '../models/Settings.js';
import WaiterRequest from '../models/WaiterRequest.js';
import Branch from '../models/Branch.js';

// ─── Helper: generate unique QR token ────────────────────────────────────────
const generateQRToken = () => crypto.randomBytes(20).toString('hex');

// ─── Helper: auto order number ────────────────────────────────────────────────
const generateOrderNumber = async () => {
  const count = await Order.countDocuments();
  return `QR-${Date.now()}-${(count + 1).toString().padStart(4, '0')}`;
};

// ─── PUBLIC: Get menu by QR token ────────────────────────────────────────────
export const getMenuByToken = async (req, res) => {
  try {
    const { tableToken } = req.params;

    if (!tableToken || tableToken === 'null' || tableToken === 'undefined' || tableToken.trim() === '') {
      return res.status(400).json({ success: false, message: 'Invalid or missing table token.' });
    }

    const table = await Table.findOne({ qrToken: tableToken }).populate('branch');
    if (!table || !table.branch) {
      return res.status(404).json({ success: false, message: 'Table or associated branch not found.' });
    }
    if (!table.qrEnabled) {
      return res.status(403).json({ success: false, message: 'QR ordering is currently disabled for this table.' });
    }

    // Increment scan count
    await Table.findByIdAndUpdate(table._id, { $inc: { qrScanCount: 1 } });

    // Get products grouped by category for this branch
    const products = await Product.find({
      branch: table.branch._id,
      isAvailable: true,
      active: true
    }).sort({ category: 1, name: 1 });

    // Group by category
    const categoriesMap = {};
    products.forEach(p => {
      const cat = p.category || 'Other';
      if (!categoriesMap[cat]) categoriesMap[cat] = [];
      categoriesMap[cat].push({
        _id: p._id,
        name: p.name,
        description: p.description || '',
        price: p.price,
        image: p.image || null,
        category: cat,
        isAvailable: p.isAvailable,
      });
    });

    const categories = Object.entries(categoriesMap).map(([name, items]) => ({ name, items }));

    // Get branch/restaurant info for branding
    let restaurantInfo = {
      name: table.branch.name || 'Restaurant',
      logo: null,
      currency: 'USD',
      taxRate: 0,
    };

    try {
      const settings = await Settings.findOne({ branch: table.branch._id });
      if (settings) {
        restaurantInfo = {
          name: settings.restaurantName || table.branch.name,
          logo: settings.logo || settings.restaurantLogo || null,
          currency: settings.currency || 'USD',
          taxRate: settings.taxRate || 0,
          phone: settings.phone || table.branch.phone || '',
          address: settings.address || table.branch.address || '',
          welcomeMessage: settings.welcomeMessage || 'Welcome! Scan, order, and enjoy.',
        };
      }
    } catch (e) {
      // Settings not critical - continue
    }

    res.json({
      success: true,
      data: {
        table: {
          _id: table._id,
          name: table.name,
          number: table.tableNumber || table.number,
          capacity: table.capacity,
          location: table.location,
          status: table.status,
        },
        restaurant: restaurantInfo,
        categories,
        totalProducts: products.length,
      }
    });
  } catch (error) {
    console.error('❌ getMenuByToken error:', error);
    res.status(500).json({ success: false, message: 'Failed to load menu' });
  }
};

// ─── PUBLIC: Place a QR order ─────────────────────────────────────────────────
export const placeQROrder = async (req, res) => {
  try {
    const {
      tableToken,
      items,
      customerName,
      customerPhone,
      specialInstructions,
      paymentMethod,
      sessionId,
    } = req.body;

    if (!tableToken || tableToken === 'null' || tableToken === 'undefined' || tableToken.trim() === '') {
      return res.status(400).json({ success: false, message: 'Invalid or missing table token.' });
    }

    if (!items || !items.length) {
      return res.status(400).json({ success: false, message: 'Items are required.' });
    }

    const table = await Table.findOne({ qrToken: tableToken }).populate('branch');
    if (!table || !table.branch) return res.status(404).json({ success: false, message: 'Table or associated branch not found' });
    if (!table.qrEnabled) return res.status(403).json({ success: false, message: 'QR ordering disabled for this table' });

    // Validate products exist and get current prices
    const productIds = items.map(i => i.productId).filter(Boolean);
    const dbProducts = await Product.find({ _id: { $in: productIds }, branch: table.branch._id });
    const productMap = {};
    dbProducts.forEach(p => { productMap[p._id.toString()] = p; });

    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = productMap[item.productId?.toString()];
      if (!product) continue; // skip invalid products
      const quantity = Math.max(1, parseInt(item.quantity) || 1);
      const price = product.price;
      const total = price * quantity;
      subtotal += total;
      orderItems.push({
        product: product._id,
        productName: product.name,
        product_name: product.name,
        name: product.name,
        quantity,
        price,
        total,
        notes: item.notes || '',
        specialInstructions: item.specialInstructions || '',
      });
    }

    if (!orderItems.length) {
      return res.status(400).json({ success: false, message: 'No valid items found' });
    }

    // Get tax rate from settings
    let taxRate = 0;
    try {
      const settings = await Settings.findOne({ branch: table.branch._id });
      if (settings) taxRate = settings.taxRate || 0;
    } catch (e) {}

    const tax = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const finalTotal = subtotal + tax;
    const orderNumber = await generateOrderNumber();
    const customerSessionId = sessionId || crypto.randomBytes(12).toString('hex');

    const order = await Order.create({
      orderNumber,
      orderType: 'dine-in',
      orderSource: 'qr',
      status: 'pending',
      tableId: table._id,
      tableNumber: table.tableNumber || table.number,
      customerName: customerName || 'QR Customer',
      customerPhone: customerPhone || '',
      customerSessionId,
      specialInstructions: specialInstructions || '',
      paymentMethod: paymentMethod || 'pay_later',
      paymentStatus: 'pending',
      subtotal,
      tax,
      finalTotal,
      branch: table.branch._id,
      kitchenStatus: 'pending',
      estimatedPrepTime: 15, // default 15 min
      items: orderItems,
    });

    // Update table status to occupied if it was available
    if (table.status === 'available') {
      await Table.findByIdAndUpdate(table._id, { status: 'occupied' });
    }

    // Emit real-time events via Socket.io
    const io = req.io;
    if (io) {
      const orderData = {
        _id: order._id,
        orderNumber: order.orderNumber,
        orderSource: 'qr',
        tableId: table._id,
        tableNumber: order.tableNumber,
        tableName: table.name,
        status: 'pending',
        items: orderItems,
        subtotal,
        tax,
        finalTotal,
        customerName: order.customerName,
        specialInstructions: order.specialInstructions,
        estimatedPrepTime: 15,
        createdAt: order.createdAt,
        branch: table.branch._id,
      };

      const branchId = table.branch._id.toString();
      io.to(`kitchen-${branchId}`).emit('qr-new-order', orderData);
      io.to(`pos-${branchId}`).emit('qr-new-order', orderData);
      io.to(`waiter-${branchId}`).emit('qr-new-order', orderData);
      io.to(`branch-${branchId}`).emit('qr-new-order', orderData);
    }

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        sessionId: customerSessionId,
        estimatedPrepTime: 15,
        status: 'pending',
        finalTotal,
      }
    });
  } catch (error) {
    console.error('❌ placeQROrder error:', error);
    res.status(500).json({ success: false, message: 'Failed to place order', error: error.message });
  }
};

// ─── PUBLIC: Track order by session ID ────────────────────────────────────────
export const trackOrderBySession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { tableToken } = req.query;

    if (!tableToken || tableToken === 'null' || tableToken === 'undefined' || tableToken.trim() === '') {
      return res.status(400).json({ success: false, message: 'Invalid or missing table token.' });
    }

    const table = await Table.findOne({ qrToken: tableToken });
    if (!table || !table.branch) {
      return res.status(404).json({ success: false, message: 'Table or associated branch not found.' });
    }

    const orders = await Order.find({
      customerSessionId: sessionId,
      branch: table.branch,
    })
      .sort({ createdAt: -1 })
      .populate('tableId', 'name tableNumber number location')
      .lean();

    if (!orders.length) {
      return res.json({ success: true, data: [] });
    }

    res.json({
      success: true,
      data: orders.map(o => ({
        _id: o._id,
        orderNumber: o.orderNumber,
        status: o.status,
        items: o.items,
        subtotal: o.subtotal,
        tax: o.tax,
        finalTotal: o.finalTotal,
        specialInstructions: o.specialInstructions,
        estimatedPrepTime: o.estimatedPrepTime,
        waiterRequested: o.waiterRequested,
        billRequested: o.billRequested,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        table: o.tableId,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      }))
    });
  } catch (error) {
    console.error('❌ trackOrderBySession error:', error);
    res.status(500).json({ success: false, message: 'Failed to track order' });
  }
};

// ─── PUBLIC: Create waiter request ────────────────────────────────────────────
export const createWaiterRequest = async (req, res) => {
  try {
    const { tableToken, type, notes, sessionId, orderId } = req.body;

    if (!tableToken || tableToken === 'null' || tableToken === 'undefined' || tableToken.trim() === '') {
      return res.status(400).json({ success: false, message: 'Invalid or missing table token.' });
    }

    if (!type) {
      return res.status(400).json({ success: false, message: 'Request type is required.' });
    }

    const table = await Table.findOne({ qrToken: tableToken }).populate('branch');
    if (!table || !table.branch) return res.status(404).json({ success: false, message: 'Table or associated branch not found' });

    const waiterRequest = await WaiterRequest.create({
      tableId: table._id,
      tableNumber: table.tableNumber || table.number,
      tableName: table.name,
      type,
      notes: notes || '',
      customerSessionId: sessionId || '',
      orderId: orderId || null,
      branch: table.branch._id,
    });

    // Update order flags
    if (orderId) {
      const updateField = type === 'bill_request' ? { billRequested: true } : { waiterRequested: true };
      await Order.findByIdAndUpdate(orderId, updateField);
    }

    // Emit to waiter room
    const io = req.io;
    if (io) {
      const branchId = table.branch._id.toString();
      const requestData = {
        _id: waiterRequest._id,
        tableNumber: waiterRequest.tableNumber,
        tableName: table.name,
        type,
        notes,
        createdAt: waiterRequest.createdAt,
      };
      io.to(`waiter-${branchId}`).emit('waiter-requested', requestData);
      io.to(`branch-${branchId}`).emit('waiter-requested', requestData);
    }

    res.status(201).json({
      success: true,
      message: type === 'bill_request' ? 'Bill request sent!' : 'Waiter has been called!',
      data: { requestId: waiterRequest._id }
    });
  } catch (error) {
    console.error('❌ createWaiterRequest error:', error);
    res.status(500).json({ success: false, message: 'Failed to send request' });
  }
};

// ─── ADMIN: Get all tables with QR info ───────────────────────────────────────
export const getTablesWithQR = async (req, res) => {
  try {
    const branchId = req.user.branch._id;
    const tables = await Table.find({ branch: branchId }).sort({ tableNumber: 1, number: 1 });

    // Get order counts per table
    const tableIds = tables.map(t => t._id);
    const activeOrders = await Order.aggregate([
      { $match: { tableId: { $in: tableIds }, status: { $in: ['pending', 'accepted', 'preparing', 'ready'] } } },
      { $group: { _id: '$tableId', count: { $sum: 1 } } }
    ]);
    const orderCountMap = {};
    activeOrders.forEach(o => { orderCountMap[o._id.toString()] = o.count; });

    const baseUrl = req.headers.origin || `${req.protocol}://${req.get('host')}`;

    res.json({
      success: true,
      data: tables.map(t => ({
        _id: t._id,
        name: t.name,
        number: t.tableNumber || t.number,
        capacity: t.capacity,
        location: t.location,
        status: t.status,
        qrToken: t.qrToken || null,
        qrEnabled: t.qrEnabled || false,
        qrGeneratedAt: t.qrGeneratedAt || null,
        qrScanCount: t.qrScanCount || 0,
        qrUrl: t.qrToken ? `${baseUrl}/order?table=${t.qrToken}` : null,
        activeOrders: orderCountMap[t._id.toString()] || 0,
      }))
    });
  } catch (error) {
    console.error('❌ getTablesWithQR error:', error);
    res.status(500).json({ success: false, message: 'Failed to load tables' });
  }
};

// ─── ADMIN: Generate / Regenerate QR for a table ─────────────────────────────
export const generateTableQR = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user.branch._id;

    const table = await Table.findOne({ _id: id, branch: branchId });
    if (!table) return res.status(404).json({ success: false, message: 'Table not found' });

    const qrToken = generateQRToken();

    await Table.findByIdAndUpdate(id, {
      qrToken,
      qrEnabled: true,
      qrGeneratedAt: new Date(),
      qrScanCount: 0,
    });

    const baseUrl = req.headers.origin || `${req.protocol}://${req.get('host')}`;
    const qrUrl = `${baseUrl}/order?table=${qrToken}`;

    res.json({
      success: true,
      message: 'QR code generated successfully',
      data: { qrToken, qrUrl }
    });
  } catch (error) {
    console.error('❌ generateTableQR error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate QR code' });
  }
};

// ─── ADMIN: Toggle QR enabled/disabled ────────────────────────────────────────
export const toggleTableQR = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user.branch._id;

    const table = await Table.findOne({ _id: id, branch: branchId });
    if (!table) return res.status(404).json({ success: false, message: 'Table not found' });

    await Table.findByIdAndUpdate(id, { qrEnabled: !table.qrEnabled });

    res.json({
      success: true,
      message: `QR ordering ${!table.qrEnabled ? 'enabled' : 'disabled'} for ${table.name}`,
      data: { qrEnabled: !table.qrEnabled }
    });
  } catch (error) {
    console.error('❌ toggleTableQR error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle QR status' });
  }
};

// ─── STAFF: Get waiter requests ────────────────────────────────────────────────
export const getWaiterRequests = async (req, res) => {
  try {
    const branchId = req.user.branch._id;
    const { status } = req.query;

    const filter = { branch: branchId };
    if (status) filter.status = status;
    else filter.status = { $in: ['pending', 'acknowledged'] };

    const requests = await WaiterRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate('tableId', 'name tableNumber number')
      .lean();

    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('❌ getWaiterRequests error:', error);
    res.status(500).json({ success: false, message: 'Failed to load waiter requests' });
  }
};

// ─── STAFF: Update waiter request status ─────────────────────────────────────
export const updateWaiterRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const branchId = req.user.branch._id;

    const request = await WaiterRequest.findOne({ _id: id, branch: branchId });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    const updateData = { status };
    if (status === 'acknowledged') {
      updateData.acknowledgedBy = req.user._id;
      updateData.acknowledgedAt = new Date();
    } else if (status === 'resolved') {
      updateData.resolvedBy = req.user._id;
      updateData.resolvedAt = new Date();
    }

    await WaiterRequest.findByIdAndUpdate(id, updateData);

    res.json({ success: true, message: 'Request updated successfully' });
  } catch (error) {
    console.error('❌ updateWaiterRequest error:', error);
    res.status(500).json({ success: false, message: 'Failed to update request' });
  }
};

// ─── ADMIN: QR Analytics ──────────────────────────────────────────────────────
export const getQRAnalytics = async (req, res) => {
  try {
    const branchId = req.user.branch._id;

    const [qrOrders, totalQRRevenue, topItems, waiterRequestStats] = await Promise.all([
      Order.countDocuments({ branch: branchId, orderSource: 'qr' }),
      Order.aggregate([
        { $match: { branch: branchId, orderSource: 'qr', paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$finalTotal' } } }
      ]),
      Order.aggregate([
        { $match: { branch: branchId, orderSource: 'qr' } },
        { $unwind: '$items' },
        { $group: { _id: '$items.name', count: { $sum: '$items.quantity' } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      WaiterRequest.aggregate([
        { $match: { branch: branchId } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ])
    ]);

    const tables = await Table.find({ branch: branchId, qrEnabled: true });
    const totalScans = tables.reduce((acc, t) => acc + (t.qrScanCount || 0), 0);

    res.json({
      success: true,
      data: {
        totalQROrders: qrOrders,
        totalQRRevenue: totalQRRevenue[0]?.total || 0,
        totalScans,
        tablesWithQR: tables.length,
        topItems: topItems.map(i => ({ name: i._id, count: i.count })),
        waiterRequestStats,
      }
    });
  } catch (error) {
    console.error('❌ getQRAnalytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to load QR analytics' });
  }
};
