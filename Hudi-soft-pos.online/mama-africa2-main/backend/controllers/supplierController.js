import Supplier from '../models/Supplier.js';
import mongoose from 'mongoose';

const formatSupplier = (s) => {
  if (!s) return null;
  const obj = s.toObject ? s.toObject() : s;
  let phoneStr = obj.phone || '';
  let emailStr = obj.email || '';
  if (obj.contact && typeof obj.contact === 'object') {
    phoneStr = obj.contact.phone || phoneStr;
    emailStr = obj.contact.email || emailStr;
  }
  return {
    ...obj,
    _id: obj._id.toString(),
    id: obj._id.toString(),
    contact: typeof obj.contact === 'object' ? obj.contact : { phone: phoneStr, email: emailStr }
  };
};

export const createSupplier = async (req, res) => {
  try {
    const { name, contact, phone, email, address, paymentTerms, notes } = req.body;
    const branchId = req.user?.branch?._id || req.user?.branch?.id || req.user?.branch;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Supplier name is required' });
    }

    let phoneNum = phone || '';
    let emailAddr = email || '';
    if (contact && typeof contact === 'object') {
      phoneNum = contact.phone || phoneNum;
      emailAddr = contact.email || emailAddr;
    }

    const existing = await Supplier.findOne({ name: name.trim(), branch: branchId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Supplier already exists with this name' });
    }

    const supplier = await Supplier.create({
      name: name.trim(),
      contact: contact || { phone: phoneNum, email: emailAddr },
      phone: phoneNum,
      email: emailAddr,
      address: address || '',
      paymentTerms: paymentTerms || '30 days',
      notes: notes || '',
      branch: branchId
    });

    res.status(201).json({
      success: true,
      data: formatSupplier(supplier),
      message: 'Supplier created successfully'
    });
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create supplier'
    });
  }
};

export const getSuppliers = async (req, res) => {
  try {
    const { page = 1, limit = 100, search } = req.query;
    const branchId = req.user?.branch?._id || req.user?.branch?.id || req.user?.branch;

    const query = { branch: branchId };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Supplier.countDocuments(query);
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const suppliers = await Supplier.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const formattedList = suppliers.map(formatSupplier);

    res.json({
      success: true,
      data: {
        suppliers: formattedList,
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
      message: error.message || 'Failed to fetch suppliers'
    });
  }
};

export const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contact, phone, email, address, paymentTerms, notes } = req.body;
    const branchId = req.user?.branch?._id || req.user?.branch?.id || req.user?.branch;

    const supplier = await Supplier.findOne({ _id: id, branch: branchId });
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    let phoneNum = phone || supplier.phone || '';
    let emailAddr = email || supplier.email || '';
    if (contact && typeof contact === 'object') {
      phoneNum = contact.phone || phoneNum;
      emailAddr = contact.email || emailAddr;
    }

    if (name) supplier.name = name.trim();
    if (contact !== undefined) supplier.contact = contact;
    supplier.phone = phoneNum;
    supplier.email = emailAddr;
    if (address !== undefined) supplier.address = address;
    if (paymentTerms !== undefined) supplier.paymentTerms = paymentTerms;
    if (notes !== undefined) supplier.notes = notes;

    await supplier.save();

    res.json({
      success: true,
      data: formatSupplier(supplier),
      message: 'Supplier updated successfully'
    });
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update supplier' });
  }
};

export const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user?.branch?._id || req.user?.branch?.id || req.user?.branch;

    const supplier = await Supplier.findOneAndDelete({ _id: id, branch: branchId });
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    res.json({
      success: true,
      message: 'Supplier deleted successfully'
    });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete supplier' });
  }
};