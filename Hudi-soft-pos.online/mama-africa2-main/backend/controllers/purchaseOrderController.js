// MongoDB purchase order controller
import PurchaseOrder from '../models/PurchaseOrder.js';
import Product from '../models/Product.js';
import mongoose from 'mongoose';

// Helper to format purchase order response
const formatPurchaseOrder = (po) => {
  if (!po) return null;
  const p = po.toObject ? po.toObject() : po;
  return {
    ...p,
    _id: p._id.toString(),
    id: p._id.toString(),
    supplierId: p.supplierId ? p.supplierId.toString() : null,
    branch: p.branch ? p.branch.toString() : null,
    createdBy: p.createdBy ? p.createdBy.toString() : null,
    approvedBy: p.approvedBy ? p.approvedBy.toString() : null
  };
};

// Create purchase order - MongoDB
export const createPurchaseOrder = async (req, res) => {
  try {
    const { supplierId, items, expectedDelivery, notes } = req.body;
    const userId = req.user._id || req.user.id;
    const branchId = req.user.branch._id || req.user.branch.id;

    if (!supplierId || !Array.isArray(items) || items.length === 0 || !expectedDelivery) {
      return res.status(400).json({ success: false, message: 'supplierId, items and expectedDelivery are required' });
    }

    let subtotal = 0;
    let taxTotal = 0;
    let discountTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, branch: branchId });
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      const base = item.orderedQty * item.unitCost;
      const discount = base * ((item.discount || 0) / 100);
      const tax = (base - discount) * ((item.tax || 0) / 100);
      const total = base - discount + tax;

      subtotal += base;
      discountTotal += discount;
      taxTotal += tax;

      validatedItems.push({
        product: item.productId,
        productName: product.name,
        orderedQty: item.orderedQty,
        receivedQty: 0,
        unitCost: item.unitCost,
        discount: item.discount || 0,
        tax: item.tax || 0,
        total: Math.round(total * 100) / 100
      });
    }

    const grandTotal = subtotal - discountTotal + taxTotal;

    const po = await PurchaseOrder.create({
      supplierId,
      orderNumber: `PO-${Date.now()}`,
      items: validatedItems,
      expectedDelivery: new Date(expectedDelivery),
      status: 'pending',
      subtotal: Math.round(subtotal * 100) / 100,
      taxTotal: Math.round(taxTotal * 100) / 100,
      discountTotal: Math.round(discountTotal * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
      branch: branchId,
      createdBy: userId,
      notes: notes || ''
    });

    res.status(201).json({
      success: true,
      data: formatPurchaseOrder(po),
      message: 'Purchase order created'
    });
  } catch (error) {
    console.error('Create purchase order error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create purchase order' });
  }
};

// Get all purchase orders - MongoDB
export const getPurchaseOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, supplierId, from, to } = req.query;
    const branchId = req.user.branch._id || req.user.branch.id;

    const query = { branch: branchId };

    if (status) query.status = status;
    if (supplierId) query.supplierId = supplierId;
    if (from || to) {
      query.updatedAt = {};
      if (from) query.updatedAt.$gte = new Date(from);
      if (to) query.updatedAt.$lte = new Date(to);
    }

    const total = await PurchaseOrder.countDocuments(query);
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const pos = await PurchaseOrder.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('supplierId', 'name')
      .populate('createdBy', 'name');

    res.json({
      success: true,
      data: {
        purchaseOrders: pos.map(formatPurchaseOrder),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get purchase orders error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch purchase orders' });
  }
};

// Approve purchase order - MongoDB
export const approvePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user.branch._id || req.user.branch.id;
    const userId = req.user._id || req.user.id;

    const po = await PurchaseOrder.findOneAndUpdate(
      { _id: id, branch: branchId, status: 'pending' },
      { 
        $set: { 
          status: 'approved', 
          approvedBy: userId, 
          approvedAt: new Date() 
        } 
      },
      { new: true }
    ).populate('supplierId', 'name').populate('createdBy', 'name');

    if (!po) {
      return res.status(404).json({ success: false, message: 'Purchase order not found or already processed' });
    }

    res.json({ success: true, data: formatPurchaseOrder(po), message: 'Purchase order approved' });
  } catch (error) {
    console.error('Approve purchase order error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to approve purchase order' });
  }
};

