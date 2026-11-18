// MongoDB finance controller - Full aggregation from Orders, Purchases, Expenses, Finance transactions
import Order from '../models/Order.js';
import Finance from '../models/Finance.js';
import Purchase from '../models/Purchase.js';
import Expense from '../models/Expense.js';
import mongoose from 'mongoose';

/**
 * Helper: build date range query object
 */
const buildDateQuery = (startDate, endDate, fieldName = 'createdAt') => {
  const q = {};
  if (startDate || endDate) {
    q[fieldName] = {};
    if (startDate) q[fieldName].$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      q[fieldName].$lte = end;
    }
  }
  return q;
};

// ─── GET /finance/dashboard ────────────────────────────────────────────────────
export const getDashboardData = async (req, res) => {
  try {
    const branchId = req.user.branch._id || req.user.branch.id;
    const bId = new mongoose.Types.ObjectId(branchId);

    const today = new Date();
    const startOfToday = new Date(today); startOfToday.setHours(0, 0, 0, 0);
    const endOfToday   = new Date(today); endOfToday.setHours(23, 59, 59, 999);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth   = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    // ─── Income: paid/completed orders ────────────────────────────────
    const paidFilter = { $or: [{ paymentStatus: 'paid' }, { status: 'completed' }] };

    const [todayOrderStats, monthOrderStats, allOrderStats] = await Promise.all([
      Order.aggregate([
        { $match: { branch: bId, createdAt: { $gte: startOfToday, $lte: endOfToday }, ...paidFilter } },
        { $group: { _id: null, total: { $sum: '$finalTotal' }, count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: { branch: bId, createdAt: { $gte: startOfMonth, $lte: endOfMonth }, ...paidFilter } },
        { $group: { _id: null, total: { $sum: '$finalTotal' } } }
      ]),
      Order.aggregate([
        { $match: { branch: bId, ...paidFilter } },
        { $group: { _id: null, total: { $sum: '$finalTotal' } } }
      ])
    ]);

    // ─── Expenses: purchases + expense records + finance expense entries ─
    const [allPurchaseStats, allExpenseStats, allFinanceExpenseStats] = await Promise.all([
      Purchase.aggregate([
        { $match: { branch: bId } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ]),
      Expense.aggregate([
        { $match: { branch: bId } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).catch(() => []), // in case model doesn't exist
      Finance.aggregate([
        { $match: { branch: bId, type: 'expense' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    // ─── Income from Finance entries (manual) ────────────────────────
    const financeIncomeStats = await Finance.aggregate([
      { $match: { branch: bId, type: 'income' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const todaySales     = todayOrderStats[0]?.total || 0;
    const todayOrders    = todayOrderStats[0]?.count  || 0;
    const monthSales     = monthOrderStats[0]?.total  || 0;
    const allOrderIncome = allOrderStats[0]?.total    || 0;
    const financeIncome  = financeIncomeStats[0]?.total || 0;

    const totalIncome   = allOrderIncome + financeIncome;
    const totalPurchase = allPurchaseStats[0]?.total   || 0;
    const totalExpenses = allExpenseStats[0]?.total    || 0;
    const financeExpenses = allFinanceExpenseStats[0]?.total || 0;
    const totalExpense  = totalPurchase + totalExpenses + financeExpenses;
    const netProfit     = totalIncome - totalExpense;

    // Recent transactions (from Finance entries)
    const recentTransactions = await Finance.find({ branch: branchId })
      .sort({ date: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        todaySales,
        todayOrders,
        monthSales,
        totalIncome,
        totalExpense,
        totalPurchase,
        totalExpenses,
        netProfit,
        recentTransactions: recentTransactions.map(t => ({
          ...t.toObject(), _id: t._id.toString(), id: t._id.toString()
        }))
      }
    });
  } catch (error) {
    console.error('Finance dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching finance data' });
  }
};

// ─── GET /finance/transactions ────────────────────────────────────────────────
export const getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 50, type = '', startDate = '', endDate = '' } = req.query;
    const branchId = req.user.branch._id || req.user.branch.id;
    const bId = new mongoose.Types.ObjectId(branchId);

    // Build date filter
    const fromDate = startDate ? new Date(startDate) : null;
    const toDate   = endDate   ? (() => { const d = new Date(endDate); d.setHours(23,59,59,999); return d; })() : null;

    const dateFilter = (field) => {
      if (!fromDate && !toDate) return {};
      const f = {};
      if (fromDate) f.$gte = fromDate;
      if (toDate)   f.$lte = toDate;
      return { [field]: f };
    };

    // ── 1. Paid Orders → income entries ────────────────────────────────
    let orderEntries = [];
    if (!type || type === 'income') {
      const paidFilter = { $or: [{ paymentStatus: 'paid' }, { status: 'completed' }] };
      const orders = await Order.find({
        branch: bId,
        ...paidFilter,
        ...dateFilter('createdAt')
      }).sort({ createdAt: -1 });

      orderEntries = orders.map(o => ({
        _id: o._id.toString(),
        id:  o._id.toString(),
        type: 'income',
        source: 'order',
        amount: o.finalTotal || 0,
        date: o.createdAt,
        description: `Order #${o.orderNumber || o._id.toString().slice(-6)} — ${o.items?.length || 0} item(s)`,
        paymentMethod: o.paymentMethod || 'cash',
        reference: o.orderNumber || ''
      }));
    }

    // ── 2. Purchases → expense entries ────────────────────────────────
    let purchaseEntries = [];
    if (!type || type === 'expense') {
      const purchases = await Purchase.find({
        branch: bId,
        ...dateFilter('createdAt')
      }).populate('supplier', 'name').sort({ createdAt: -1 });

      purchaseEntries = purchases.map(p => ({
        _id: p._id.toString(),
        id:  p._id.toString(),
        type: 'expense',
        source: 'purchase',
        amount: p.grandTotal || 0,
        date: p.purchaseDate || p.createdAt,
        description: `Purchase from ${p.supplier?.name || 'Supplier'} — ${p.items?.length || 0} item(s)`,
        paymentMethod: p.paymentMethod || 'cash',
        reference: p.purchaseNumber || ''
      }));
    }

    // ── 3. Expenses model ─────────────────────────────────────────────
    let expenseEntries = [];
    if (!type || type === 'expense') {
      try {
        const expenses = await Expense.find({
          branch: bId,
          ...dateFilter('date')
        }).sort({ date: -1 });

        expenseEntries = expenses.map(e => ({
          _id: e._id.toString(),
          id:  e._id.toString(),
          type: 'expense',
          source: 'expense',
          amount: e.amount || 0,
          date: e.date || e.createdAt,
          description: e.description || e.title || e.name || 'Expense',
          paymentMethod: e.paymentMethod || 'cash',
          reference: e.reference || ''
        }));
      } catch (_) {}
    }

    // ── 4. Manual Finance entries ─────────────────────────────────────
    const financeQuery = { branch: branchId };
    if (type) financeQuery.type = type;
    Object.assign(financeQuery, dateFilter('date'));

    const financeEntries = await Finance.find(financeQuery).sort({ date: -1 });
    const financeRows = financeEntries.map(t => ({
      ...t.toObject(),
      _id: t._id.toString(),
      id:  t._id.toString(),
      source: 'manual'
    }));

    // ── Merge & sort all entries by date desc ─────────────────────────
    const all = [...orderEntries, ...purchaseEntries, ...expenseEntries, ...financeRows]
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Totals from merged list
    const totalIncome  = all.filter(t => t.type === 'income') .reduce((s, t) => s + (t.amount || 0), 0);
    const totalExpense = all.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
    const netBalance   = totalIncome - totalExpense;

    // Paginate
    const skip   = (parseInt(page) - 1) * parseInt(limit);
    const paged  = all.slice(skip, skip + parseInt(limit));
    const total  = all.length;

    res.json({
      success: true,
      data: {
        transactions: paged,
        total,
        totalIncome,
        totalExpense,
        netBalance,
        totalPages: Math.ceil(total / parseInt(limit)),
        currentPage: parseInt(page)
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching transactions' });
  }
};

// ─── POST /finance/transactions ───────────────────────────────────────────────
export const createTransaction = async (req, res) => {
  try {
    const { type, amount, description, date, category, paymentMethod, reference } = req.body;
    const branchId = req.user.branch._id || req.user.branch.id;

    if (!type || !amount || !description) {
      return res.status(400).json({ success: false, message: 'Type, amount and description are required' });
    }

    const transaction = await Finance.create({
      type,
      amount: parseFloat(amount),
      description,
      date: date ? new Date(date) : new Date(),
      branch: branchId,
      category: category || 'General',
      paymentMethod: paymentMethod || 'cash',
      reference: reference || ''
    });

    res.status(201).json({
      success: true,
      message: 'Transaction recorded successfully',
      data: { transaction: { ...transaction.toObject(), _id: transaction._id.toString(), id: transaction._id.toString() } }
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ success: false, message: 'Server error creating transaction' });
  }
};

// ─── POST /finance/reports/generate ──────────────────────────────────────────
export const generateReport = async (req, res) => {
  try {
    const { period, startDate, endDate } = req.body;
    const branchId = req.user.branch._id || req.user.branch.id;
    const bId = new mongoose.Types.ObjectId(branchId);

    const start = new Date(startDate);
    const end   = new Date(endDate); end.setHours(23, 59, 59, 999);

    const paidFilter = { $or: [{ paymentStatus: 'paid' }, { status: 'completed' }] };

    const [ordersStats, purchaseStats, expenseStats, financeStats] = await Promise.all([
      Order.aggregate([
        { $match: { branch: bId, createdAt: { $gte: start, $lte: end }, ...paidFilter } },
        { $group: { _id: null, totalIncome: { $sum: '$finalTotal' } } }
      ]),
      Purchase.aggregate([
        { $match: { branch: bId, createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ]),
      Expense.aggregate([
        { $match: { branch: bId, date: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).catch(() => []),
      Finance.aggregate([
        { $match: { branch: bId, type: 'expense', date: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const totalIncome   = (ordersStats[0]?.totalIncome  || 0);
    const totalPurchase = (purchaseStats[0]?.total       || 0);
    const totalExpenses = (expenseStats[0]?.total        || 0) + (financeStats[0]?.total || 0);
    const netProfit     = totalIncome - totalPurchase - totalExpenses;

    res.json({
      success: true,
      message: 'Financial report generated successfully',
      data: {
        report: {
          period, startDate: start.toISOString(), endDate: end.toISOString(),
          totalIncome, totalPurchase, totalExpenses,
          totalExpense: totalPurchase + totalExpenses,
          netProfit, generatedAt: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({ success: false, message: 'Server error generating financial report' });
  }
};
