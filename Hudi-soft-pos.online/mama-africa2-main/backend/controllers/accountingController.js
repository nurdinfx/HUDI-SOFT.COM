// MongoDB accounting controller
import Order from '../models/Order.js';
import Finance from '../models/Finance.js';
import mongoose from 'mongoose';

// Get balance sheet - MongoDB
export const getBalanceSheet = async (req, res) => {
    try {
        const { asOf } = req.query;
        const branchId = req.user.branch._id || req.user.branch.id;
        const asOfDate = asOf ? new Date(asOf) : new Date();

        // Assets: Total income transactions up to date
        const assetsResult = await Finance.aggregate([
          { 
            $match: { 
              branch: new mongoose.Types.ObjectId(branchId), 
              type: 'income', 
              date: { $lte: asOfDate } 
            } 
          },
          { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);

        // Liabilities: Total expense transactions up to date
        const liabilitiesResult = await Finance.aggregate([
          { 
            $match: { 
              branch: new mongoose.Types.ObjectId(branchId), 
              type: 'expense', 
              date: { $lte: asOfDate } 
            } 
          },
          { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);

        const totalAssets = assetsResult.length > 0 ? assetsResult[0].total : 0;
        const totalLiabilities = liabilitiesResult.length > 0 ? liabilitiesResult[0].total : 0;
        const equity = totalAssets - totalLiabilities;

        res.json({
            success: true,
            data: {
                asOf: asOfDate,
                assets: {
                    cash: totalAssets * 0.7, 
                    inventory: totalAssets * 0.3,
                    totalAssets
                },
                liabilities: {
                    accountsPayable: totalLiabilities * 0.6,
                    loans: totalLiabilities * 0.4,
                    totalLiabilities
                },
                equity
            }
        });
    } catch (error) {
        console.error('Balance sheet error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error generating balance sheet'
        });
    }
};

// Get income statement - MongoDB
export const getIncomeStatement = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const branchId = req.user.branch._id || req.user.branch.id;

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // Revenue from Orders
        const revenueResult = await Order.aggregate([
          { 
            $match: { 
              branch: new mongoose.Types.ObjectId(branchId), 
              createdAt: { $gte: start, $lte: end },
              $or: [{ paymentStatus: 'paid' }, { status: 'completed' }]
            } 
          },
          { $group: { _id: null, totalRevenue: { $sum: "$finalTotal" } } }
        ]);

        // Expenses from Finance
        const expensesResult = await Finance.aggregate([
          { 
            $match: { 
              branch: new mongoose.Types.ObjectId(branchId), 
              type: 'expense', 
              date: { $gte: start, $lte: end } 
            } 
          },
          { $group: { _id: "$category", amount: { $sum: "$amount" } } }
        ]);

        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;
        const totalExpenses = expensesResult.reduce((sum, exp) => sum + exp.amount, 0);
        const netIncome = totalRevenue - totalExpenses;

        const revenueByCategory = await Order.aggregate([
          { 
              $match: { 
                  branch: new mongoose.Types.ObjectId(branchId), 
                  createdAt: { $gte: start, $lte: end },
                  $or: [{ paymentStatus: 'paid' }, { status: 'completed' }]
              } 
          },
          { $unwind: "$items" },
          {
              $group: {
                  _id: "$items.category",
                  revenue: { $sum: "$items.total" }
              }
          }
        ]);

        res.json({
            success: true,
            data: {
                period: { startDate: start, endDate: end },
                revenue: {
                    total: totalRevenue,
                    byCategory: revenueByCategory
                },
                expenses: {
                    total: totalExpenses,
                    byCategory: expensesResult.map(e => ({ _id: e._id || 'General', amount: e.amount }))
                },
                netIncome
            }
        });
    } catch (error) {
        console.error('Income statement error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error generating income statement'
        });
    }
};

// Export financial data - MongoDB
export const exportFinancialData = async (req, res) => {
    try {
        const { format = 'json', startDate, endDate } = req.query;
        const branchId = req.user.branch._id || req.user.branch.id;

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const transactions = await Finance.find({
            branch: branchId,
            date: { $gte: start, $lte: end }
        }).sort({ date: 1 });

        const orders = await Order.find({
            branch: branchId,
            createdAt: { $gte: start, $lte: end }
        }).sort({ createdAt: 1 });

        if (format === 'csv') {
            const csvData = transactions.map(t =>
                `${t.date.toISOString()},${t.type},${t.category},${t.amount},${t.description}`
            ).join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=financial-data-${startDate}-to-${endDate}.csv`);
            return res.send('Date,Type,Category,Amount,Description\n' + csvData);
        }

        res.json({
            success: true,
            data: {
                transactions: transactions.map(t => ({ 
                  ...t.toObject(), 
                  _id: t._id.toString(),
                  id: t._id.toString()
                })),
                orders: orders.map(o => ({ 
                  ...o.toObject(), 
                  _id: o._id.toString(),
                  id: o._id.toString()
                })),
                summary: {
                    totalTransactions: transactions.length,
                    totalOrders: orders.length,
                    period: { startDate: start, endDate: end }
                }
            }
        });
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error exporting data'
        });
    }
};

