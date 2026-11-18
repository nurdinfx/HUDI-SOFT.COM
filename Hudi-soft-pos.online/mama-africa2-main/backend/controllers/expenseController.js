// MongoDB expense controller
import Expense from '../models/Expense.js';
import Finance from '../models/Finance.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

// Helper to format expense response
const formatExpense = (expense) => {
  if (!expense) return null;
  const e = expense.toObject ? expense.toObject() : expense;
  return {
    ...e,
    _id: e._id.toString(),
    id: e._id.toString(),
    recordedBy: e.createdBy && e.createdBy.name ? { name: e.createdBy.name } : { name: 'Unknown' }
  };
};

// Get all expenses - MongoDB
export const getExpenses = async (req, res) => {
  try {
    const { category, startDate, endDate, page = 1, limit = 20 } = req.query;
    const branchId = req.user.branch._id || req.user.branch.id;

    const query = { branch: branchId };

    if (category) {
      query.category = category;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const total = await Expense.countDocuments(query);
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Total Amount Summary
    const stats = await Expense.aggregate([
      { $match: { branch: new mongoose.Types.ObjectId(branchId), ...(startDate || endDate ? { date: query.date } : {}), ...(category ? { category } : {}) } },
      { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
    ]);
    const totalAmount = stats.length > 0 ? stats[0].totalAmount : 0;

    const expenses = await Expense.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'name');

    res.json({
      success: true,
      data: {
        expenses: expenses.map(formatExpense),
        totalAmount,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expenses'
    });
  }
};

// Get single expense - MongoDB
export const getExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user.branch._id || req.user.branch.id;

    const expense = await Expense.findOne({ _id: id, branch: branchId }).populate('createdBy', 'name');

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    res.json({
      success: true,
      data: formatExpense(expense)
    });
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expense'
    });
  }
};

// Create expense - MongoDB
export const createExpense = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { description, amount, category, date } = req.body;
    const branchId = req.user.branch._id || req.user.branch.id;
    const userId = req.user._id || req.user.id;

    const expense = await Expense.create([{
      description,
      amount,
      category,
      date: date ? new Date(date) : new Date(),
      branch: branchId,
      createdBy: userId
    }], { session });

    // Also record in Finance for unified reporting
    await Finance.create([{
      type: 'expense',
      amount,
      description,
      date: date ? new Date(date) : new Date(),
      branch: branchId,
      category
    }], { session });

    await session.commitTransaction();
    session.endSession();

    // Re-fetch with population
    const populatedExpense = await Expense.findById(expense[0]._id).populate('createdBy', 'name');

    res.status(201).json({
      success: true,
      data: formatExpense(populatedExpense),
      message: 'Expense recorded successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Create expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record expense'
    });
  }
};

// Update expense - MongoDB
export const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, amount, category, date } = req.body;
    const branchId = req.user.branch._id || req.user.branch.id;

    const expense = await Expense.findOneAndUpdate(
      { _id: id, branch: branchId },
      { $set: { description, amount, category, date: date ? new Date(date) : undefined } },
      { new: true }
    ).populate('createdBy', 'name');

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    res.json({
      success: true,
      data: formatExpense(expense),
      message: 'Expense updated successfully'
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update expense'
    });
  }
};

// Delete expense - MongoDB
export const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user.branch._id || req.user.branch.id;

    const expense = await Expense.findOneAndDelete({ _id: id, branch: branchId });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete expense'
    });
  }
};