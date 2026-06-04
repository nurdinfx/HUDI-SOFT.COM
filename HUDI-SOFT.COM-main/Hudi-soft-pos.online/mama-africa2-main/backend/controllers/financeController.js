// MongoDB finance controller
import Order from '../models/Order.js';
import Finance from '../models/Finance.js';
import mongoose from 'mongoose';

// Get financial dashboard data - MongoDB
export const getDashboardData = async (req, res) => {
    try {
        const branchId = req.user.branch._id || req.user.branch.id;

        const today = new Date();
        const startOfToday = new Date(today.setHours(0, 0, 0, 0));
        const endOfToday = new Date(today.setHours(23, 59, 59, 999));

        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

        // Today's sales
        const todayStats = await Order.aggregate([
            { 
                $match: { 
                    branch: new mongoose.Types.ObjectId(branchId), 
                    createdAt: { $gte: startOfToday, $lte: endOfToday },
                    $or: [{ paymentStatus: 'paid' }, { status: 'completed' }]
                } 
            },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    total: { $sum: "$finalTotal" }
                }
            }
        ]);

        const todaySales = todayStats.length > 0 ? todayStats[0].total : 0;
        const todayOrdersCount = todayStats.length > 0 ? todayStats[0].count : 0;

        // Weekly sales
        const weekStats = await Order.aggregate([
            { 
                $match: { 
                    branch: new mongoose.Types.ObjectId(branchId), 
                    createdAt: { $gte: startOfWeek },
                    $or: [{ paymentStatus: 'paid' }, { status: 'completed' }]
                } 
            },
            { $group: { _id: null, total: { $sum: "$finalTotal" } } }
        ]);

        const weekSales = weekStats.length > 0 ? weekStats[0].total : 0;

        // Monthly sales
        const monthStats = await Order.aggregate([
            { 
                $match: { 
                    branch: new mongoose.Types.ObjectId(branchId), 
                    createdAt: { $gte: startOfMonth, $lte: endOfMonth },
                    $or: [{ paymentStatus: 'paid' }, { status: 'completed' }]
                } 
            },
            { $group: { _id: null, total: { $sum: "$finalTotal" } } }
        ]);

        const monthSales = monthStats.length > 0 ? monthStats[0].total : 0;

        // Recent transactions
        const recentTransactions = await Finance.find({ branch: branchId })
            .sort({ date: -1 })
            .limit(10);

        // Sales by category (using aggregate on orders)
        const categoryStats = await Order.aggregate([
            { 
                $match: { 
                    branch: new mongoose.Types.ObjectId(branchId), 
                    createdAt: { $gte: startOfMonth },
                    $or: [{ paymentStatus: 'paid' }, { status: 'completed' }]
                } 
            },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.category", // Need to ensure category exists in order items or lookup product
                    total: { $sum: "$items.total" }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                todaySales,
                weekSales,
                monthSales,
                todayOrders: todayOrdersCount,
                recentTransactions: recentTransactions.map(t => ({
                    ...t.toObject(),
                    _id: t._id.toString(),
                    id: t._id.toString()
                })),
                categorySales: categoryStats.map(c => ({
                    _id: c._id || 'Uncategorized',
                    total: c.total
                }))
            }
        });
    } catch (error) {
        console.error('Finance dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching finance data'
        });
    }
};

// Get all transactions - MongoDB
export const getTransactions = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            type = '',
            startDate = '',
            endDate = ''
        } = req.query;

        const branchId = req.user.branch._id || req.user.branch.id;

        const query = { branch: branchId };

        if (type) {
            query.type = type;
        }

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        const total = await Finance.countDocuments(query);
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const transactions = await Finance.find(query)
            .sort({ date: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        res.json({
            success: true,
            data: {
                transactions: transactions.map(t => ({ 
                  ...t.toObject(), 
                  _id: t._id.toString(),
                  id: t._id.toString()
                })),
                totalPages: Math.ceil(total / parseInt(limit)),
                currentPage: parseInt(page),
                total
            }
        });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching transactions'
        });
    }
};

// Create transaction - MongoDB
export const createTransaction = async (req, res) => {
    try {
        const { type, amount, description, date, category } = req.body;
        const branchId = req.user.branch._id || req.user.branch.id;

        if (!type || !amount || !description) {
            return res.status(400).json({
                success: false,
                message: 'Type, amount and description are required'
            });
        }

        const transaction = await Finance.create({
            type,
            amount,
            description,
            date: date ? new Date(date) : new Date(),
            branch: branchId,
            category: category || 'General'
        });

        res.status(201).json({
            success: true,
            message: 'Transaction recorded successfully',
            data: { 
              transaction: { 
                ...transaction.toObject(), 
                _id: transaction._id.toString(),
                id: transaction._id.toString()
              } 
            }
        });
    } catch (error) {
        console.error('Create transaction error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error creating transaction'
        });
    }
};

// Generate financial report - MongoDB
export const generateReport = async (req, res) => {
    try {
        const { period, startDate, endDate } = req.body;
        const branchId = req.user.branch._id || req.user.branch.id;

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // Get orders in period
        const ordersStats = await Order.aggregate([
            { 
                $match: { 
                    branch: new mongoose.Types.ObjectId(branchId), 
                    createdAt: { $gte: start, $lte: end },
                    $or: [{ paymentStatus: 'paid' }, { status: 'completed' }]
                } 
            },
            { $group: { _id: null, totalIncome: { $sum: "$finalTotal" } } }
        ]);

        // Get expense transactions in period
        const expenseStats = await Finance.aggregate([
            { 
                $match: { 
                    branch: new mongoose.Types.ObjectId(branchId), 
                    type: 'expense', 
                    date: { $gte: start, $lte: end }
                } 
            },
            { $group: { _id: null, totalExpenses: { $sum: "$amount" } } }
        ]);

        const totalIncome = ordersStats.length > 0 ? ordersStats[0].totalIncome : 0;
        const totalExpenses = expenseStats.length > 0 ? expenseStats[0].totalExpenses : 0;
        const netProfit = totalIncome - totalExpenses;

        const report = {
            period,
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            totalIncome,
            totalExpenses,
            netProfit,
            generatedAt: new Date().toISOString()
        };

        res.json({
            success: true,
            message: 'Financial report generated successfully',
            data: { report }
        });
    } catch (error) {
        console.error('Generate report error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error generating financial report'
        });
    }
};

