// MongoDB customer controller
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import CustomerLedger from '../models/CustomerLedger.js';
import mongoose from 'mongoose';

// Helper to format customer response
const formatCustomer = (customer) => {
  if (!customer) return null;
  const c = customer.toObject ? customer.toObject() : customer;
  return {
    ...c,
    _id: c._id.toString(),
    id: c._id.toString(),
    branch: c.branch ? c.branch.toString() : null
  };
};

// Get all customers with ledger summary - MongoDB
export const getCustomers = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const branchId = req.user.branch._id || req.user.branch.id;

    const query = { branch: branchId };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Customer.countDocuments(query);
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const customers = await Customer.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get ledger summary and order stats for each customer
    const customersWithSummary = await Promise.all(customers.map(async (c) => {
      const orderStats = await Order.aggregate([
        { $match: { customer: c._id } },
        { $group: { _id: null, totalOrders: { $sum: 1 }, lastOrder: { $max: "$createdAt" } } }
      ]);

      const lastLedger = await CustomerLedger.findOne({ customer: c._id })
        .sort({ date: -1, _id: -1 });

      const stats = orderStats.length > 0 ? orderStats[0] : { totalOrders: 0, lastOrder: null };

      return {
        ...formatCustomer(c),
        totalOrders: stats.totalOrders,
        lastOrder: stats.lastOrder,
        currentBalance: lastLedger ? lastLedger.balance : 0,
        totalDebit: 0, // Placeholder for specific report needs
        totalCredit: 0
      };
    }));

    res.json({
      success: true,
      data: {
        customers: customersWithSummary,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customers'
    });
  }
};

// Get single customer - MongoDB
export const getCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user.branch._id || req.user.branch.id;

    const customer = await Customer.findOne({ _id: id, branch: branchId });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      data: formatCustomer(customer)
    });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer'
    });
  }
};

// Create customer - MongoDB
export const createCustomer = async (req, res) => {
  try {
    const { name, phone, email } = req.body;
    const branchId = req.user.branch._id || req.user.branch.id;

    const existing = await Customer.findOne({ phone, branch: branchId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Customer with this phone number already exists' });
    }

    const customer = await Customer.create({
      name,
      phone,
      email,
      branch: branchId
    });

    res.status(201).json({
      success: true,
      data: formatCustomer(customer),
      message: 'Customer created successfully'
    });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create customer'
    });
  }
};

// Update customer - MongoDB
export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email } = req.body;
    const branchId = req.user.branch._id || req.user.branch.id;

    const customer = await Customer.findOneAndUpdate(
      { _id: id, branch: branchId },
      { $set: { name, phone, email } },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.json({
      success: true,
      data: formatCustomer(customer),
      message: 'Customer updated successfully'
    });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update customer'
    });
  }
};

// Delete customer - MongoDB
export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user.branch._id || req.user.branch.id;

    const customer = await Customer.findOneAndDelete({ _id: id, branch: branchId });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete customer' });
  }
};

// Search customers - MongoDB
export const searchCustomers = async (req, res) => {
  try {
    const { query } = req.query;
    const branchId = req.user.branch._id || req.user.branch.id;

    if (!query) return res.status(400).json({ success: false, message: 'Search query is required' });

    const customers = await Customer.find({
      branch: branchId,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    }).limit(10);

    res.json({
      success: true,
      data: customers.map(formatCustomer)
    });
  } catch (error) {
    console.error('Search customers error:', error);
    res.status(500).json({ success: false, message: 'Failed to search customers' });
  }
};

// Get customer ledger - MongoDB
export const getCustomerLedger = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user.branch._id || req.user.branch.id;

    const customer = await Customer.findOne({ _id: id, branch: branchId });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    const ledgerTransactions = await CustomerLedger.find({ 
      customer: id, 
      branch: branchId 
    }).sort({ date: -1, _id: -1 }).limit(100);

    res.json({
      success: true,
      data: ledgerTransactions.map(l => ({ 
        ...l.toObject(), 
        _id: l._id.toString(),
        id: l._id.toString()
      }))
    });
  } catch (error) {
    console.error('Get customer ledger error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customer ledger' });
  }
};

// Add ledger transaction - MongoDB
export const addLedgerTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { customerId, type, amount, description, date } = req.body;
    const branchId = req.user.branch._id || req.user.branch.id;

    const customer = await Customer.findOne({ _id: customerId, branch: branchId }).session(session);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    // Calculate new balance
    const lastTx = await CustomerLedger.findOne({ customer: customerId })
      .sort({ date: -1, _id: -1 })
      .session(session);
    
    let currentBalance = lastTx ? lastTx.balance : 0;
    const txAmount = parseFloat(amount);

    if (type === 'debit') {
      currentBalance -= txAmount;
    } else {
      currentBalance += txAmount;
    }

    const tx = await CustomerLedger.create([{
      customer: customerId,
      transactionType: type,
      amount: txAmount,
      balance: currentBalance,
      description,
      date: date ? new Date(date) : new Date(),
      branch: branchId
    }], { session });

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: 'Transaction added successfully',
      data: { ...tx[0].toObject(), _id: tx[0]._id.toString(), id: tx[0]._id.toString() }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Add ledger transaction error:', error);
    res.status(500).json({ success: false, message: 'Failed to add transaction' });
  }
};

// Get customer summary for dashboard - MongoDB
export const getCustomerSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user.branch._id || req.user.branch.id;

    const customer = await Customer.findOne({ _id: id, branch: branchId });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    const totalOrders = await Order.countDocuments({ customer: id });

    const txCount = await CustomerLedger.countDocuments({ customer: id });

    const lastTx = await CustomerLedger.findOne({ customer: id }).sort({ date: -1, _id: -1 });
    const balance = lastTx ? lastTx.balance : 0;

    res.json({
      success: true,
      data: {
        currentBalance: balance,
        totalDebit: 0,
        totalCredit: 0,
        totalTransactions: txCount,
        lastActivity: lastTx ? lastTx.date : null,
        totalOrders: totalOrders
      }
    });

  } catch (error) {
    console.error('Get customer summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customer summary' });
  }
};