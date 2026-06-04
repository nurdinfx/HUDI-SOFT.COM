// MongoDB supplier controller
import Supplier from '../models/Supplier.js';
import mongoose from 'mongoose';

// Create supplier - MongoDB
export const createSupplier = async (req, res) => {
  try {
    const { name, contact, phone, email, address } = req.body;
    const branchId = req.user.branch._id || req.user.branch.id;

    // Check duplicate
    const existing = await Supplier.findOne({ name, branch: branchId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Supplier already exists' });
    }

    const supplier = await Supplier.create({
      name,
      contact: contact || '',
      phone: phone || '',
      email: email || '',
      address: address || '',
      branch: branchId
    });

    res.status(201).json({
      success: true,
      data: { ...supplier.toObject(), _id: supplier._id.toString(), id: supplier._id.toString() },
      message: 'Supplier created successfully'
    });
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all suppliers - MongoDB
export const getSuppliers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const branchId = req.user.branch._id || req.user.branch.id;

    const query = { branch: branchId };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { contact: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Supplier.countDocuments(query);
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const suppliers = await Supplier.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        suppliers: suppliers.map(s => ({ 
          ...s.toObject(), 
          _id: s._id.toString(),
          id: s._id.toString()
        })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};