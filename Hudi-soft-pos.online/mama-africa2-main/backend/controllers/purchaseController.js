// MongoDB purchase controller
import Purchase from '../models/Purchase.js';
import Product from '../models/Product.js';
import mongoose from 'mongoose';

// Helper to format purchase response
const formatPurchase = (purchase) => {
  if (!purchase) return null;
  const p = purchase.toObject ? purchase.toObject() : purchase;
  return {
    ...p,
    _id: p._id.toString(),
    id: p._id.toString(),
    supplierId: p.supplierId ? p.supplierId.toString() : null,
    branch: p.branch ? p.branch.toString() : null,
    createdBy: p.createdBy ? p.createdBy.toString() : null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt
  };
};

// Create purchase - MongoDB
export const createPurchase = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { supplierId, items, paymentMethod, notes } = req.body;
    const userId = req.user._id || req.user.id;
    const branchId = req.user.branch._id || req.user.branch.id;

    if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
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
      const product = await Product.findOne({ _id: item.productId, branch: branchId }).session(session);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      const baseAmount = item.qty * item.unitCost;
      const discountAmount = baseAmount * ((item.discount || 0) / 100);
      const taxAmount = (baseAmount - discountAmount) * ((item.tax || 0) / 100);
      const total = baseAmount - discountAmount + taxAmount;

      subtotal += baseAmount;
      discountTotal += discountAmount;
      taxTotal += taxAmount;

      validatedItems.push({
        product: item.productId,
        productName: product.name,
        qty: item.qty,
        unitCost: item.unitCost,
        discount: item.discount || 0,
        tax: item.tax || 0,
        total: Math.round(total * 100) / 100
      });

      // Update product stock and cost
      await Product.findByIdAndUpdate(
        item.productId,
        { 
          $inc: { stock: item.qty },
          $set: { cost: item.unitCost }
        },
        { session }
      );
    }

    const grandTotal = subtotal - discountTotal + taxTotal;

    const purchase = await Purchase.create([{
      supplierId,
      items: validatedItems,
      subtotal: Math.round(subtotal * 100) / 100,
      taxTotal: Math.round(taxTotal * 100) / 100,
      discountTotal: Math.round(discountTotal * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
      paymentMethod: paymentMethod || 'cash',
      notes: notes || '',
      status: 'submitted',
      branch: branchId,
      createdBy: userId
    }], { session });

    await session.commitTransaction();
    session.endSession();

    const formatted = formatPurchase(purchase[0]);

    // Emit real-time events
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

// Get all purchases - MongoDB
export const getPurchases = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const branchId = req.user.branch._id || req.user.branch.id;

    const total = await Purchase.countDocuments({ branch: branchId });
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const purchases = await Purchase.find({ branch: branchId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('supplierId', 'name')
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
      message: 'Failed to fetch purchases'
    });
  }
};

// Get daily purchases - MongoDB
export const getDailyPurchases = async (req, res) => {
  try {
    const { date } = req.query;
    const branchId = req.user.branch._id || req.user.branch.id;

    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const purchases = await Purchase.find({
      branch: branchId,
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ createdAt: -1 }).populate('supplierId', 'name');

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