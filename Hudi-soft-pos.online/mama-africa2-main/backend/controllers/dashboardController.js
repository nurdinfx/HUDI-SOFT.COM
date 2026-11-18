// MongoDB dashboard controller
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import Table from '../models/Table.js';
import Expense from '../models/Expense.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

// Get dashboard stats - MongoDB
export const getStats = async (req, res) => {
  try {
    const { period = 'today' } = req.query;
    const branchId = req.user.branch._id || req.user.branch.id;

    let startDate = new Date();
    const now = new Date();

    if (period === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Stats based on Orders using aggregation
    const orderStats = await Order.aggregate([
      { 
        $match: { 
          branch: new mongoose.Types.ObjectId(branchId), 
          createdAt: { $gte: startDate } 
        } 
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$finalTotal" },
          totalOrders: { $sum: 1 },
          completedOrders: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          avgOrderValue: { $avg: "$finalTotal" },
          pendingOrders: { $sum: { $cond: [{ $in: ["$status", ["pending", "confirmed", "preparing", "ready"]] }, 1, 0] } }
        }
      }
    ]);

    const stats = orderStats.length > 0 ? orderStats[0] : {
      totalRevenue: 0,
      totalOrders: 0,
      completedOrders: 0,
      avgOrderValue: 0,
      pendingOrders: 0
    };

    // 2. Monthly Revenue
    const monthlyRevenueResult = await Order.aggregate([
      { 
        $match: { 
          branch: new mongoose.Types.ObjectId(branchId), 
          status: 'completed',
          createdAt: { $gte: startOfMonth } 
        } 
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$finalTotal" }
        }
      }
    ]);

    const monthlyRevenue = monthlyRevenueResult.length > 0 ? monthlyRevenueResult[0].revenue : 0;

    // 3. Simple Counts
    const totalCustomers = await Customer.countDocuments({ branch: branchId });
    const availableTables = await Table.countDocuments({ branch: branchId, status: 'available' });
    const lowStockProducts = await Product.countDocuments({ branch: branchId, stock: { $lte: 10 } });

    res.json({
      success: true,
      data: {
        todayRevenue: stats.totalRevenue,
        todayOrders: stats.totalOrders,
        completedOrders: stats.completedOrders,
        averageOrderValue: stats.avgOrderValue || 0,
        pendingOrders: stats.pendingOrders,
        monthlyRevenue,
        totalCustomers,
        availableTables,
        lowStockProducts
      }
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    });
  }
};

// Get revenue data for chart - MongoDB
export const getRevenueData = async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    const branchId = req.user.branch._id || req.user.branch.id;

    let startDate = new Date();
    const now = new Date();

    if (period === 'week') startDate.setDate(now.getDate() - 7);
    else if (period === 'month') startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (period === 'year') startDate = new Date(now.getFullYear(), 0, 1);
    else startDate.setDate(now.getDate() - 7);

    // Match aggregation for revenue chart
    // We group by day/month based on the period
    const groupStage = {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: period === 'year' ? { $literal: 1 } : { $dayOfMonth: "$createdAt" }
        },
        revenue: { $sum: "$finalTotal" },
        orders: { $sum: 1 }
      }
    };

    const revenueData = await Order.aggregate([
      { 
        $match: { 
          branch: new mongoose.Types.ObjectId(branchId), 
          status: 'completed',
          createdAt: { $gte: startDate }
        } 
      },
      groupStage,
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
    ]);

    res.json({
      success: true,
      data: {
        period,
        revenueData: revenueData
      }
    });
  } catch (error) {
    console.error('Get revenue data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue data'
    });
  }
};

// Get top products - MongoDB
export const getTopProducts = async (req, res) => {
  try {
    const { limit = 5, period = 'month' } = req.query;
    const branchId = req.user.branch._id || req.user.branch.id;

    let startDate = new Date();
    const now = new Date();
    if (period === 'week') startDate.setDate(now.getDate() - 7);
    else if (period === 'month') startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (period === 'year') startDate = new Date(now.getFullYear(), 0, 1);

    const topProducts = await Order.aggregate([
      { 
        $match: { 
          branch: new mongoose.Types.ObjectId(branchId), 
          createdAt: { $gte: startDate },
          status: { $ne: 'cancelled' }
        } 
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          name: { $first: "$items.productName" },
          totalQuantity: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.total" }
        }
      },
      { 
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: "$productInfo" },
      {
        $project: {
          _id: 1,
          name: 1,
          category: "$productInfo.category",
          totalQuantity: 1,
          totalRevenue: 1
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: parseInt(limit) }
    ]);

    res.json({
      success: true,
      data: topProducts
    });
  } catch (error) {
    console.error('Get top products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top products'
    });
  }
};

// Get recent activity - MongoDB
export const getRecentActivity = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const branchId = req.user.branch._id || req.user.branch.id;
    const limitInt = parseInt(limit);

    // Recent Orders with cashier and customer info
    const recentOrders = await Order.find({ branch: branchId })
      .sort({ createdAt: -1 })
      .limit(limitInt)
      .populate('cashier', 'name')
      .populate('customer', 'name');

    // Recent Expenses
    const recentExpenses = await Expense.find({ branch: branchId })
      .sort({ createdAt: -1 })
      .limit(limitInt)
      .populate('createdBy', 'name');

    res.json({
      success: true,
      data: {
        recentOrders: recentOrders.map(o => ({
          ...o.toObject(),
          _id: o._id.toString(),
          id: o._id.toString(),
          cashier: o.cashier || { name: o.customerName || 'Unknown' },
          customer: o.customer || { name: o.customerName || 'Walking Customer' }
        })),
        recentExpenses: recentExpenses.map(e => ({
          ...e.toObject(),
          _id: e._id.toString(),
          id: e._id.toString(),
          recordedBy: e.createdBy
        }))
      }
    });

  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent activity'
    });
  }
};