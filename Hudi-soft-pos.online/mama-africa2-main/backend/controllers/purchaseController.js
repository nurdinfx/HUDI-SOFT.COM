import Purchase from '../models/Purchase.js';
import Product from '../models/Product.js';
import mongoose from 'mongoose';

const formatPurchase = (purchase) => {
  if (!purchase) return null;
  const p = purchase.toObject ? purchase.toObject() : purchase;
  const supp = p.supplierId || p.supplier;
  return {
    ...p,
    _id: p._id.toString(),
    id: p._id.toString(),
    supplierId: supp ? (supp._id ? supp._id.toString() : supp.toString()) : null,
    supplier: typeof supp === 'object' ? { ...supp, _id: supp._id.toString() } : null,
    branch: p.branch ? p.branch.toString() : null,
    createdBy: p.createdBy ? (typeof p.createdBy === 'object' ? p.createdBy : p.createdBy.toString()) : null,
    createdAt: p.createdAt || p.date,
    date: p.date || p.createdAt,
    updatedAt: p.updatedAt
  };
};

export const createPurchase = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { supplierId, supplier, items, paymentMethod, notes, status, date } = req.body;
    const userId = req.user?._id || req.user?.id;
    const branchId = req.user?.branch?._id || req.user?.branch?.id || req.user?.branch;

    const actualSupplierId = supplierId || supplier;
    if (!actualSupplierId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Supplier and at least one item are required'
      });
    }

    let subtotal = 0;
    let taxTotal = 0;
    let discountTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const pId = item.productId || item.product;
      const product = await Product.findOne({ _id: pId, branch: branchId }).session(session);
      if (!product) {
        throw new Error(`Product not found: ${pId}`);
      }

      const qty = Number(item.qty || item.quantity || 1);
      const unitCost = Number(item.unitCost || item.cost || 0);
      const baseAmount = qty * unitCost;
      const discountAmount = baseAmount * ((Number(item.discount) || 0) / 100);
      const taxAmount = (baseAmount - discountAmount) * ((Number(item.tax) || 0) / 100);
      const total = baseAmount - discountAmount + taxAmount;

      subtotal += baseAmount;
      discountTotal += discountAmount;
      taxTotal += taxAmount;

      validatedItems.push({
        product: pId,
        productId: pId,
        productName: product.name,
        qty,
        unitCost,
        discount: Number(item.discount) || 0,
        tax: Number(item.tax) || 0,
        total: Math.round(total * 100) / 100
      });

      // Update product stock and cost
      await Product.findByIdAndUpdate(
        pId,
        { 
          $inc: { stock: qty },
          $set: { cost: unitCost }
        },
        { session }
      );
    }

    const grandTotal = subtotal - discountTotal + taxTotal;
    const generatedNum = `PUR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const purchaseDate = date ? new Date(date) : new Date();

    const purchase = await Purchase.create([{
      purchaseNumber: generatedNum,
      supplier: actualSupplierId,
      supplierId: actualSupplierId,
      items: validatedItems,
      subtotal: Math.round(subtotal * 100) / 100,
      taxTotal: Math.round(taxTotal * 100) / 100,
      discountTotal: Math.round(discountTotal * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
      paymentMethod: paymentMethod || 'cash',
      notes: notes || '',
      status: status || 'submitted',
      branch: branchId,
      createdBy: userId,
      date: purchaseDate,
      createdAt: purchaseDate
    }], { session });

    await session.commitTransaction();
    session.endSession();

    const populated = await Purchase.findById(purchase[0]._id)
      .populate('supplier', 'name email phone')
      .populate('supplierId', 'name email phone')
      .populate('createdBy', 'name');

    const formatted = formatPurchase(populated);

    if (req.io) {
      req.io.to(`branch-${branchId}`).emit('purchase-created', formatted);
      req.io.to(`inventory-${branchId}`).emit('inventory-updated');
    }

    res.status(201).json({
      success: true,
      data: formatted,
      message: 'Purchase created successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Create purchase error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create purchase'
    });
  }
};

export const getPurchases = async (req, res) => {
  try {
    const { page = 1, limit = 100, status, search, from, to } = req.query;
    const branchId = req.user?.branch?._id || req.user?.branch?.id || req.user?.branch;

    const query = { branch: branchId };
    if (status) query.status = status;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    const total = await Purchase.countDocuments(query);
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const purchases = await Purchase.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('supplier', 'name email phone')
      .populate('supplierId', 'name email phone')
      .populate('createdBy', 'name');

    res.json({
      success: true,
      data: {
        purchases: purchases.map(formatPurchase),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get purchases error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch purchases'
    });
  }
};

export const updatePurchase = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { paymentMethod, notes, status, date } = req.body;
    const branchId = req.user?.branch?._id || req.user?.branch?.id || req.user?.branch;

    const purchase = await Purchase.findOne({ _id: id, branch: branchId }).session(session);
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }

    if (paymentMethod) purchase.paymentMethod = paymentMethod;
    if (notes !== undefined) purchase.notes = notes;
    if (status) purchase.status = status;
    if (date) {
      purchase.date = new Date(date);
      purchase.createdAt = new Date(date);
    }

    await purchase.save({ session });
    await session.commitTransaction();
    session.endSession();

    const updated = await Purchase.findById(id)
      .populate('supplier', 'name email phone')
      .populate('supplierId', 'name email phone')
      .populate('createdBy', 'name');

    res.json({
      success: true,
      data: formatPurchase(updated),
      message: 'Purchase updated successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Update purchase error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update purchase' });
  }
};

export const deletePurchase = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const branchId = req.user?.branch?._id || req.user?.branch?.id || req.user?.branch;

    const purchase = await Purchase.findOne({ _id: id, branch: branchId }).session(session);
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }

    // Revert product stock adjustments
    for (const item of purchase.items) {
      const pId = item.productId || item.product;
      if (pId) {
        await Product.findByIdAndUpdate(pId, { $inc: { stock: -item.qty } }, { session });
      }
    }

    await Purchase.deleteOne({ _id: id }).session(session);
    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: 'Purchase deleted successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Delete purchase error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete purchase' });
  }
};

export const getDailyPurchases = async (req, res) => {
  try {
    const { date } = req.query;
    const branchId = req.user?.branch?._id || req.user?.branch?.id || req.user?.branch;

    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const purchases = await Purchase.find({
      branch: branchId,
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ createdAt: -1 }).populate('supplier', 'name').populate('supplierId', 'name');

    const summaryStats = await Purchase.aggregate([
      { 
        $match: { 
          branch: new mongoose.Types.ObjectId(branchId), 
          createdAt: { $gte: startOfDay, $lte: endOfDay }
        } 
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$grandTotal" },
          totalPurchases: { $sum: 1 },
          averagePurchase: { $avg: "$grandTotal" }
        }
      }
    ]);

    const summary = summaryStats.length > 0 ? summaryStats[0] : {
      totalAmount: 0,
      totalPurchases: 0,
      averagePurchase: 0
    };

    res.json({
      success: true,
      data: {
        purchases: purchases.map(formatPurchase),
        summary: {
          totalAmount: summary.totalAmount,
          totalPurchases: summary.totalPurchases,
          averagePurchase: summary.averagePurchase
        }
      }
    });
  } catch (error) {
    console.error('Get daily purchases error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily purchases'
    });
  }
};