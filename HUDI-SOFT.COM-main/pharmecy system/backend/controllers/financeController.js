const Sale = require('../models/Sale');
const Expense = require('../models/Expense');

// @desc    Get financial summary (Sales vs Expenses)
// @route   GET /api/v1/finance/summary
// @access  Private (Owner)
const getFinancialSummary = async (req, res) => {
  try {
    const { startDate, endDate, branchId } = req.query;

    let query = { tenant: req.tenantId };
    if (startDate && endDate) {
      query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (branchId) {
      query.branch = branchId;
    }

    const sales = await Sale.find(query);
    const expenses = await Expense.find(query);

    const totalSales = sales.reduce((acc, sale) => acc + sale.grandTotal, 0);
    const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);
    const netProfit = totalSales - totalExpenses;

    res.json({
      totalSales,
      totalExpenses,
      netProfit,
      salesCount: sales.length,
      expensesCount: expenses.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getFinancialSummary };

