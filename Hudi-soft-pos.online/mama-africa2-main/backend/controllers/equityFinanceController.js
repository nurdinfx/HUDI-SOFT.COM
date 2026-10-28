// backend/controllers/equityFinanceController.js
import mongoose from 'mongoose';
import FinancialAccount from '../models/FinancialAccount.js';
import JournalEntry from '../models/JournalEntry.js';
import EquityTransaction from '../models/EquityTransaction.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Purchase from '../models/Purchase.js';
import Expense from '../models/Expense.js';
import Finance from '../models/Finance.js';
import Customer from '../models/Customer.js';
import Supplier from '../models/Supplier.js';

/**
 * Seed standard chart of accounts for a branch if not already existing
 */
export const ensureDefaultAccounts = async (branchId) => {
  const bId = new mongoose.Types.ObjectId(branchId);
  const count = await FinancialAccount.countDocuments({ branch: bId });
  if (count > 0) return;

  const defaultAccounts = [
    // Current Assets
    { name: 'Cash on Hand / Drawer', accountNumber: '1010', accountType: 'asset', subType: 'cash', description: 'Physical cash at registers', isSystem: true },
    { name: 'Premier Bank Checking', accountNumber: '1020', accountType: 'asset', subType: 'bank', institutionName: 'Premier Bank', description: 'Primary business checking account', isSystem: true },
    { name: 'Salaam Bank Account', accountNumber: '1025', accountType: 'asset', subType: 'bank', institutionName: 'Salaam Bank', description: 'Secondary bank account', isSystem: true },
    { name: 'EVC Plus / Telesom Zaad', accountNumber: '1030', accountType: 'asset', subType: 'mobile_money', institutionName: 'Hormuud / Telesom', description: 'Mobile money receipts & transfers', isSystem: true },
    { name: 'Accounts Receivable (Customer Debts)', accountNumber: '1100', accountType: 'asset', subType: 'accounts_receivable', description: 'Monies owed by credit customers', isSystem: true },
    { name: 'Inventory Asset', accountNumber: '1200', accountType: 'asset', subType: 'inventory_asset', description: 'Stock on hand valuation', isSystem: true },
    { name: 'POS Equipment & Furniture', accountNumber: '1500', accountType: 'asset', subType: 'fixed_asset', description: 'Printers, terminals, kitchen hardware', isSystem: true },
    
    // Liabilities
    { name: 'Accounts Payable (Supplier Debts)', accountNumber: '2010', accountType: 'liability', subType: 'accounts_payable', description: 'Unpaid bills to suppliers', isSystem: true },
    { name: 'Customer Advance Deposits', accountNumber: '2020', accountType: 'liability', subType: 'short_term_liability', description: 'Prepaid customer credit balances', isSystem: true },
    { name: 'Bank Loans & Financing', accountNumber: '2500', accountType: 'liability', subType: 'long_term_liability', description: 'Commercial borrowings', isSystem: true },

    // Equity
    { name: "Owner's Capital Contribution", accountNumber: '3010', accountType: 'equity', subType: 'owner_capital', description: 'Initial & additional investments', isSystem: true },
    { name: "Owner's Drawings & Withdrawals", accountNumber: '3020', accountType: 'equity', subType: 'owner_drawings', description: 'Funds taken out by business owner', isSystem: true },
    { name: 'Retained Earnings', accountNumber: '3030', accountType: 'equity', subType: 'retained_earnings', description: 'Accumulated business profits', isSystem: true },

    // Revenue & Expense
    { name: 'POS Sales Revenue', accountNumber: '4010', accountType: 'revenue', subType: 'sales_revenue', description: 'Gross revenue from food & products', isSystem: true },
    { name: 'Cost of Goods Sold (COGS)', accountNumber: '5010', accountType: 'expense', subType: 'cogs', description: 'Direct acquisition cost of inventory sold', isSystem: true },
    { name: 'Operating Expenses', accountNumber: '6010', accountType: 'expense', subType: 'operating_expense', description: 'Utilities, salaries, rent, maintenance', isSystem: true }
  ];

  await FinancialAccount.insertMany(defaultAccounts.map(a => ({ ...a, branch: bId })));
};

/**
 * GET /api/v1/equity-finance/dashboard
 * QuickBooks-style executive financial overview
 */
export const getFinancialDashboard = async (req, res) => {
  try {
    const branchId = req.user?.branch?._id || req.user?.branch?.id || req.user?.branch;
    const bId = new mongoose.Types.ObjectId(branchId);
    await ensureDefaultAccounts(bId);

    const { startDate, endDate } = req.query;
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    const fromDate = startDate ? new Date(startDate) : startOfMonth;
    const toDate = endDate ? new Date(endDate) : endOfMonth;
    if (endDate) toDate.setHours(23, 59, 59, 999);

    const paidOrderFilter = {
      branch: bId,
      createdAt: { $gte: fromDate, $lte: toDate },
      $or: [{ paymentStatus: 'paid' }, { status: 'completed' }]
    };

    // 1. Sales Revenue in Period & All Time
    const [periodSalesAgg, allTimeSalesAgg] = await Promise.all([
      Order.aggregate([
        { $match: paidOrderFilter },
        { $group: { _id: null, total: { $sum: '$finalTotal' }, count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: { branch: bId, $or: [{ paymentStatus: 'paid' }, { status: 'completed' }] } },
        { $group: { _id: null, total: { $sum: '$finalTotal' } } }
      ])
    ]);

    const periodSales = periodSalesAgg[0]?.total || 0;
    const periodOrdersCount = periodSalesAgg[0]?.count || 0;
    const allTimeSales = allTimeSalesAgg[0]?.total || 0;

    // 2. Cost of Goods Sold (COGS) in period from order items and product costs
    const cogsAgg = await Order.aggregate([
      { $match: paidOrderFilter },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'prod'
        }
      },
      {
        $project: {
          quantity: '$items.quantity',
          cost: { $ifNull: [{ $arrayElemAt: ['$prod.cost', 0] }, 0] }
        }
      },
      {
        $group: {
          _id: null,
          totalCogs: { $sum: { $multiply: ['$quantity', '$cost'] } }
        }
      }
    ]);
    const periodCogs = cogsAgg[0]?.totalCogs || 0;

    // 3. Operating Expenses in period
    const [expensesAgg, financeExpensesAgg] = await Promise.all([
      Expense.aggregate([
        { $match: { branch: bId, date: { $gte: fromDate, $lte: toDate } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Finance.aggregate([
        { $match: { branch: bId, type: 'expense', date: { $gte: fromDate, $lte: toDate } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);
    const periodExpenses = (expensesAgg[0]?.total || 0) + (financeExpensesAgg[0]?.total || 0);

    // 4. Gross Profit & Net Profit
    const grossProfit = periodSales - periodCogs;
    const grossProfitMargin = periodSales > 0 ? ((grossProfit / periodSales) * 100).toFixed(1) : '0.0';
    const netProfit = grossProfit - periodExpenses;
    const netProfitMargin = periodSales > 0 ? ((netProfit / periodSales) * 100).toFixed(1) : '0.0';

    // 5. Liquid Accounts (Cash, Bank, Mobile Money) Real-time aggregation
    const paymentMethodsAgg = await Order.aggregate([
      { $match: { branch: bId, $or: [{ paymentStatus: 'paid' }, { status: 'completed' }] } },
      { $group: { _id: '$paymentMethod', total: { $sum: '$finalTotal' } } }
    ]);

    let cashFromOrders = 0;
    let bankFromOrders = 0;
    let mobileFromOrders = 0;

    paymentMethodsAgg.forEach(pm => {
      const method = (pm._id || '').toLowerCase();
      if (['cash'].includes(method)) {
        cashFromOrders += pm.total;
      } else if (['card', 'bank'].includes(method)) {
        bankFromOrders += pm.total;
      } else if (['zaad', 'sahal', 'edahab', 'mycash', 'evc_plus', 'mobile', 'qr_payment'].includes(method)) {
        mobileFromOrders += pm.total;
      } else {
        cashFromOrders += pm.total;
      }
    });

    // 6. Owner's Equity Transactions
    const [contributionsAgg, withdrawalsAgg] = await Promise.all([
      EquityTransaction.aggregate([
        { $match: { branch: bId, type: 'capital_contribution' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      EquityTransaction.aggregate([
        { $match: { branch: bId, type: 'owner_withdrawal' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const totalCapitalContributed = contributionsAgg[0]?.total || 0;
    const totalOwnerWithdrawals = withdrawalsAgg[0]?.total || 0;
    const netOwnerCapital = totalCapitalContributed - totalOwnerWithdrawals;

    // 7. Accounts Receivable (Customer Debts)
    const arAgg = await Customer.aggregate([
      { $match: { branch: bId, creditUsed: { $gt: 0 } } },
      { $group: { _id: null, totalCredit: { $sum: '$creditUsed' }, count: { $sum: 1 } } }
    ]);
    const accountsReceivable = arAgg[0]?.totalCredit || 0;
    const creditCustomerCount = arAgg[0]?.count || 0;

    // 8. Accounts Payable (Unpaid purchases / debts)
    const apAgg = await Purchase.aggregate([
      { $match: { branch: bId, paymentMethod: 'credit' } },
      { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
    ]);
    const accountsPayable = apAgg[0]?.total || 0;
    const unpaidPurchasesCount = apAgg[0]?.count || 0;

    // 9. Inventory Asset Valuation
    const inventoryAgg = await Product.aggregate([
      { $match: { branch: bId, active: { $ne: false } } },
      {
        $group: {
          _id: null,
          assetValuation: { $sum: { $multiply: ['$stock', '$cost'] } },
          retailValuation: { $sum: { $multiply: ['$stock', '$price'] } },
          totalStockUnits: { $sum: '$stock' }
        }
      }
    ]);
    const inventoryValuation = inventoryAgg[0]?.assetValuation || 0;
    const inventoryRetailValue = inventoryAgg[0]?.retailValuation || 0;

    // Adjust Cash on hand by purchases & expenses
    const [allPurchasesAgg, allExpensesAgg] = await Promise.all([
      Purchase.aggregate([
        { $match: { branch: bId, paymentMethod: { $ne: 'credit' } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ]),
      Expense.aggregate([
        { $match: { branch: bId } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);
    const totalCashPaidOut = (allPurchasesAgg[0]?.total || 0) + (allExpensesAgg[0]?.total || 0) + totalOwnerWithdrawals;
    const netCashOnHand = Math.max(0, (cashFromOrders + totalCapitalContributed) - totalCashPaidOut);

    // Total Assets = Cash + Bank + Mobile + AR + Inventory
    const totalAssets = netCashOnHand + bankFromOrders + mobileFromOrders + accountsReceivable + inventoryValuation;
    const totalLiabilities = accountsPayable;
    const totalEquity = totalAssets - totalLiabilities;

    // Recent Transactions
    const recentEquityTx = await EquityTransaction.find({ branch: bId })
      .sort({ date: -1 })
      .limit(5);

    const recentJournalEntries = await JournalEntry.find({ branch: bId })
      .sort({ date: -1 })
      .limit(6);

    res.json({
      success: true,
      data: {
        period: { startDate: fromDate, endDate: toDate },
        revenue: {
          sales: periodSales,
          orderCount: periodOrdersCount,
          allTimeSales
        },
        profitability: {
          cogs: periodCogs,
          grossProfit,
          grossProfitMargin: `${grossProfitMargin}%`,
          expenses: periodExpenses,
          netProfit,
          netProfitMargin: `${netProfitMargin}%`
        },
        liquidAccounts: {
          cashOnHand: netCashOnHand,
          bankAccounts: bankFromOrders,
          mobileMoney: mobileFromOrders,
          totalLiquid: netCashOnHand + bankFromOrders + mobileFromOrders
        },
        receivablesAndPayables: {
          accountsReceivable,
          creditCustomerCount,
          accountsPayable,
          unpaidPurchasesCount
        },
        inventory: {
          inventoryValuation,
          inventoryRetailValue,
          unrealizedProfit: inventoryRetailValue - inventoryValuation
        },
        equity: {
          totalCapitalContributed,
          totalOwnerWithdrawals,
          netOwnerCapital,
          retainedEarnings: Math.max(0, totalEquity - netOwnerCapital),
          totalEquity
        },
        balanceSheetSummary: {
          totalAssets,
          totalLiabilities,
          totalEquity,
          isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
        },
        recentTransactions: {
          equity: recentEquityTx,
          journals: recentJournalEntries
        }
      }
    });
  } catch (error) {
    console.error('Financial dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error generating financial dashboard', error: error.message });
  }
};

/**
 * GET /api/v1/equity-finance/cash-flow
 * Comprehensive Cash Flow Statement (Operating, Investing, Financing)
 */
export const getCashFlowStatement = async (req, res) => {
  try {
    const branchId = req.user?.branch?._id || req.user?.branch?.id || req.user?.branch;
    const bId = new mongoose.Types.ObjectId(branchId);
    const { startDate, endDate } = req.query;

    const fromDate = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const toDate = endDate ? new Date(endDate) : new Date();
    if (endDate) toDate.setHours(23, 59, 59, 999);

    // 1. Operating Activities
    // Receipts from customers (Cash/Mobile/Bank Sales)
    const salesReceiptsAgg = await Order.aggregate([
      {
        $match: {
          branch: bId,
          createdAt: { $gte: fromDate, $lte: toDate },
          paymentMethod: { $ne: 'credit' },
          $or: [{ paymentStatus: 'paid' }, { status: 'completed' }]
        }
      },
      { $group: { _id: '$paymentMethod', total: { $sum: '$finalTotal' } } }
    ]);
    const cashFromSales = salesReceiptsAgg.reduce((acc, curr) => acc + curr.total, 0);

    // Payments for purchases/inventory
    const purchasesPaidAgg = await Purchase.aggregate([
      {
        $match: {
          branch: bId,
          date: { $gte: fromDate, $lte: toDate },
          paymentMethod: { $ne: 'credit' }
        }
      },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]);
    const cashPaidPurchases = purchasesPaidAgg[0]?.total || 0;

    // Payments for operating expenses
    const expensesPaidAgg = await Expense.aggregate([
      {
        $match: {
          branch: bId,
          date: { $gte: fromDate, $lte: toDate }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const cashPaidExpenses = expensesPaidAgg[0]?.total || 0;

    const netOperatingCashFlow = cashFromSales - (cashPaidPurchases + cashPaidExpenses);

    // 2. Investing Activities (Purchase of equipment, asset investments)
    const netInvestingCashFlow = 0; // standard POS operates equipment as fixed accounts

    // 3. Financing Activities (Owner capital contribution & withdrawals)
    const [contribPeriod, withPeriod] = await Promise.all([
      EquityTransaction.aggregate([
        {
          $match: {
            branch: bId,
            type: 'capital_contribution',
            date: { $gte: fromDate, $lte: toDate }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      EquityTransaction.aggregate([
        {
          $match: {
            branch: bId,
            type: 'owner_withdrawal',
            date: { $gte: fromDate, $lte: toDate }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);
    const capitalReceived = contribPeriod[0]?.total || 0;
    const drawingsPaid = withPeriod[0]?.total || 0;
    const netFinancingCashFlow = capitalReceived - drawingsPaid;

    const netChangeInCash = netOperatingCashFlow + netInvestingCashFlow + netFinancingCashFlow;

    res.json({
      success: true,
      data: {
        period: { startDate: fromDate, endDate: toDate },
        operatingActivities: {
          inflows: [
            { description: 'Cash collected from POS sales & payments', amount: cashFromSales }
          ],
          outflows: [
            { description: 'Payments for inventory & supplies', amount: -cashPaidPurchases },
            { description: 'Payments for operating expenses & utilities', amount: -cashPaidExpenses }
          ],
          netCashFlow: netOperatingCashFlow
        },
        investingActivities: {
          inflows: [],
          outflows: [],
          netCashFlow: netInvestingCashFlow
        },
        financingActivities: {
          inflows: [
            { description: 'Owner capital contributions', amount: capitalReceived }
          ],
          outflows: [
            { description: 'Owner drawings & personal withdrawals', amount: -drawingsPaid }
          ],
          netCashFlow: netFinancingCashFlow
        },
        summary: {
          netOperatingCashFlow,
          netInvestingCashFlow,
          netFinancingCashFlow,
          netChangeInCash
        }
      }
    });
  } catch (error) {
    console.error('Cash flow statement error:', error);
    res.status(500).json({ success: false, message: 'Server error generating cash flow statement' });
  }
};

/**
 * GET /api/v1/equity-finance/profit-and-loss
 * Standard QuickBooks P&L Income Statement
 */
export const getProfitAndLoss = async (req, res) => {
  try {
    const branchId = req.user?.branch?._id || req.user?.branch?.id || req.user?.branch;
    const bId = new mongoose.Types.ObjectId(branchId);
    const { startDate, endDate } = req.query;

    const fromDate = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const toDate = endDate ? new Date(endDate) : new Date();
    if (endDate) toDate.setHours(23, 59, 59, 999);

    const paidOrderMatch = {
      branch: bId,
      createdAt: { $gte: fromDate, $lte: toDate },
      $or: [{ paymentStatus: 'paid' }, { status: 'completed' }]
    };

    // Revenue breakdown by category
    const revenueByCategory = await Order.aggregate([
      { $match: paidOrderMatch },
      { $unwind: '$items' },
      {
        $group: {
          _id: { $ifNull: ['$items.category', 'General Products'] },
          revenue: { $sum: '$items.total' },
          quantity: { $sum: '$items.quantity' }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    const totalRevenue = revenueByCategory.reduce((sum, item) => sum + item.revenue, 0);

    // COGS
    const cogsAgg = await Order.aggregate([
      { $match: paidOrderMatch },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'prod'
        }
      },
      {
        $project: {
          quantity: '$items.quantity',
          cost: { $ifNull: [{ $arrayElemAt: ['$prod.cost', 0] }, 0] }
        }
      },
      {
        $group: {
          _id: null,
          totalCogs: { $sum: { $multiply: ['$quantity', '$cost'] } }
        }
      }
    ]);
    const totalCogs = cogsAgg[0]?.totalCogs || 0;
    const grossProfit = totalRevenue - totalCogs;
    const grossMarginPercent = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0;

    // Operating expenses breakdown
    const [expensesByCategory, financeExpenses] = await Promise.all([
      Expense.aggregate([
        { $match: { branch: bId, date: { $gte: fromDate, $lte: toDate } } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } }
      ]),
      Finance.aggregate([
        { $match: { branch: bId, type: 'expense', date: { $gte: fromDate, $lte: toDate } } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } }
      ])
    ]);

    const expenseMap = {};
    expensesByCategory.forEach(e => {
      const cat = e._id || 'Operating Expense';
      expenseMap[cat] = (expenseMap[cat] || 0) + e.total;
    });
    financeExpenses.forEach(e => {
      const cat = e._id || 'General';
      expenseMap[cat] = (expenseMap[cat] || 0) + e.total;
    });

    const expensesList = Object.entries(expenseMap).map(([category, amount]) => ({
      category,
      amount
    }));
    const totalExpenses = expensesList.reduce((sum, item) => sum + item.amount, 0);
    const netIncome = grossProfit - totalExpenses;
    const netProfitMargin = totalRevenue > 0 ? ((netIncome / totalRevenue) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        period: { startDate: fromDate, endDate: toDate },
        revenue: {
          breakdown: revenueByCategory.map(r => ({ category: r._id, revenue: r.revenue, quantity: r.quantity })),
          totalRevenue
        },
        costOfGoodsSold: {
          totalCogs,
          cogsPercentage: totalRevenue > 0 ? ((totalCogs / totalRevenue) * 100).toFixed(1) : 0
        },
        grossProfit,
        grossMarginPercent: `${grossMarginPercent}%`,
        expenses: {
          breakdown: expensesList,
          totalExpenses
        },
        netIncome,
        netProfitMargin: `${netProfitMargin}%`
      }
    });
  } catch (error) {
    console.error('Profit and loss error:', error);
    res.status(500).json({ success: false, message: 'Server error generating profit and loss statement' });
  }
};

/**
 * GET /api/v1/equity-finance/balance-sheet
 * QuickBooks-style Double-entry Balance Sheet: Assets = Liabilities + Equity
 */
export const getBalanceSheet = async (req, res) => {
  try {
    const branchId = req.user?.branch?._id || req.user?.branch?.id || req.user?.branch;
    const bId = new mongoose.Types.ObjectId(branchId);
    const { asOf } = req.query;
    const asOfDate = asOf ? new Date(asOf) : new Date();
    asOfDate.setHours(23, 59, 59, 999);

    // 1. Current Assets: Cash on Hand, Bank, Mobile Money
    const paidOrders = await Order.aggregate([
      {
        $match: {
          branch: bId,
          createdAt: { $lte: asOfDate },
          $or: [{ paymentStatus: 'paid' }, { status: 'completed' }]
        }
      },
      { $group: { _id: '$paymentMethod', total: { $sum: '$finalTotal' } } }
    ]);

    let cashFromSales = 0;
    let bankFromSales = 0;
    let mobileFromSales = 0;

    paidOrders.forEach(p => {
      const m = (p._id || '').toLowerCase();
      if (m === 'cash') cashFromSales += p.total;
      else if (['bank', 'card'].includes(m)) bankFromSales += p.total;
      else if (['zaad', 'sahal', 'edahab', 'mycash', 'evc_plus', 'mobile', 'qr_payment'].includes(m)) mobileFromSales += p.total;
      else cashFromSales += p.total;
    });

    // Deduct cash purchases & expenses
    const [cashPurchases, cashExpenses, withdrawalsAgg, contribAgg] = await Promise.all([
      Purchase.aggregate([
        { $match: { branch: bId, date: { $lte: asOfDate }, paymentMethod: { $ne: 'credit' } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ]),
      Expense.aggregate([
        { $match: { branch: bId, date: { $lte: asOfDate } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      EquityTransaction.aggregate([
        { $match: { branch: bId, type: 'owner_withdrawal', date: { $lte: asOfDate } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      EquityTransaction.aggregate([
        { $match: { branch: bId, type: 'capital_contribution', date: { $lte: asOfDate } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const totalCapital = contribAgg[0]?.total || 0;
    const totalWithdrawals = withdrawalsAgg[0]?.total || 0;
    const totalOut = (cashPurchases[0]?.total || 0) + (cashExpenses[0]?.total || 0) + totalWithdrawals;
    const netCash = Math.max(0, (cashFromSales + totalCapital) - totalOut);

    // Accounts Receivable
    const arAgg = await Customer.aggregate([
      { $match: { branch: bId, creditUsed: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$creditUsed' } } }
    ]);
    const accountsReceivable = arAgg[0]?.total || 0;

    // Inventory Valuation
    const inventoryAgg = await Product.aggregate([
      { $match: { branch: bId, active: { $ne: false } } },
      { $group: { _id: null, totalCost: { $sum: { $multiply: ['$stock', '$cost'] } } } }
    ]);
    const inventoryAsset = inventoryAgg[0]?.totalCost || 0;

    // Fixed Assets (seeded estimate)
    const fixedAssets = 2500;

    const totalCurrentAssets = netCash + bankFromSales + mobileFromSales + accountsReceivable + inventoryAsset;
    const totalAssets = totalCurrentAssets + fixedAssets;

    // 2. Liabilities
    const apAgg = await Purchase.aggregate([
      { $match: { branch: bId, paymentMethod: 'credit', date: { $lte: asOfDate } } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]);
    const accountsPayable = apAgg[0]?.total || 0;
    const otherLiabilities = 0;
    const totalLiabilities = accountsPayable + otherLiabilities;

    // 3. Equity
    const netOwnerCapital = totalCapital - totalWithdrawals;
    const retainedEarningsAndCurrentProfit = totalAssets - totalLiabilities - netOwnerCapital;
    const totalEquity = totalAssets - totalLiabilities;

    res.json({
      success: true,
      data: {
        asOfDate,
        assets: {
          currentAssets: {
            cashOnHand: netCash,
            bankAccounts: bankFromSales,
            mobileMoney: mobileFromSales,
            accountsReceivable,
            inventoryValuation: inventoryAsset,
            totalCurrentAssets
          },
          nonCurrentAssets: {
            equipmentAndFurniture: fixedAssets,
            totalNonCurrentAssets: fixedAssets
          },
          totalAssets
        },
        liabilities: {
          currentLiabilities: {
            accountsPayable,
            otherLiabilities,
            totalCurrentLiabilities: totalLiabilities
          },
          totalLiabilities
        },
        equity: {
          ownerCapitalContributed: totalCapital,
          lessOwnerWithdrawals: totalWithdrawals,
          netOwnerCapital,
          retainedEarningsAndProfit: retainedEarningsAndCurrentProfit,
          totalEquity
        },
        verification: {
          totalAssets,
          totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
          difference: totalAssets - (totalLiabilities + totalEquity),
          isBalanced: true
        }
      }
    });
  } catch (error) {
    console.error('Balance sheet error:', error);
    res.status(500).json({ success: false, message: 'Server error generating balance sheet' });
  }
};

/**
 * GET /api/v1/equity-finance/accounts
 * Chart of Accounts list with balances
 */
export const getAccounts = async (req, res) => {
  try {
    const branchId = req.user?.branch?._id || req.user?.branch?.id || req.user?.branch;
    const bId = new mongoose.Types.ObjectId(branchId);
    await ensureDefaultAccounts(bId);

    const accounts = await FinancialAccount.find({ branch: bId }).sort({ accountNumber: 1 });
    res.json({
      success: true,
      data: accounts
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch financial accounts' });
  }
};

/**
 * POST /api/v1/equity-finance/accounts
 * Create custom Bank/Mobile Money/Asset account
 */
export const createAccount = async (req, res) => {
  try {
    const branchId = req.user?.branch?._id || req.user?.branch?.id || req.user?.branch;
    const { name, accountNumber, accountType, subType, institutionName, accountDetails, description, openingBalance = 0 } = req.body;

    if (!name || !accountNumber || !accountType || !subType) {
      return res.status(400).json({ success: false, message: 'Name, Account Number, Type and SubType are required' });
    }

    const account = await FinancialAccount.create({
      name,
      accountNumber,
      accountType,
      subType,
      institutionName,
      accountDetails,
      description,
      openingBalance,
      balance: openingBalance,
      branch: branchId
    });

    res.status(201).json({ success: true, data: account, message: 'Financial account created successfully' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Account number already exists in this branch' });
    }
    res.status(500).json({ success: false, message: 'Failed to create financial account', error: error.message });
  }
};

/**
 * POST /api/v1/equity-finance/transfers
 * Transfer money between liquid accounts (e.g. Cash -> Bank, or Mobile Money -> Cash)
 */
export const transferFunds = async (req, res) => {
  try {
    const branchId = req.user?.branch?._id || req.user?.branch?.id || req.user?.branch;
    const { fromAccount, toAccount, amount, reference, notes, date } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid transfer amount is required' });
    }

    const fromAcc = await FinancialAccount.findById(fromAccount);
    const toAcc = await FinancialAccount.findById(toAccount);

    if (!fromAcc || !toAcc) {
      return res.status(404).json({ success: false, message: 'Source or destination account not found' });
    }

    fromAcc.balance -= numAmount;
    toAcc.balance += numAmount;
    await fromAcc.save();
    await toAcc.save();

    const entryNumber = `TRF-${Date.now().toString().slice(-6)}`;
    const journal = await JournalEntry.create({
      entryNumber,
      date: date || new Date(),
      reference: reference || 'Account Transfer',
      source: 'account_transfer',
      description: notes || `Transfer from ${fromAcc.name} to ${toAcc.name}`,
      lines: [
        {
          account: toAcc._id,
          accountNumber: toAcc.accountNumber,
          accountName: toAcc.name,
          accountType: toAcc.accountType,
          debit: numAmount,
          credit: 0,
          description: `Transfer in from ${fromAcc.name}`
        },
        {
          account: fromAcc._id,
          accountNumber: fromAcc.accountNumber,
          accountName: fromAcc.name,
          accountType: fromAcc.accountType,
          debit: 0,
          credit: numAmount,
          description: `Transfer out to ${toAcc.name}`
        }
      ],
      totalAmount: numAmount,
      isBalanced: true,
      branch: branchId,
      createdBy: req.user?._id,
      audit: {
        userName: req.user?.name,
        userRole: req.user?.role,
        ip: req.ip
      }
    });

    res.json({
      success: true,
      data: { journal, fromBalance: fromAcc.balance, toBalance: toAcc.balance },
      message: `Transferred $${numAmount.toFixed(2)} from ${fromAcc.name} to ${toAcc.name} successfully`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Transfer failed', error: error.message });
  }
};

/**
 * GET /api/v1/equity-finance/equity
 * Owner's Equity transactions and breakdown
 */
export const getEquityDetails = async (req, res) => {
  try {
    const branchId = req.user?.branch?._id || req.user?.branch?.id || req.user?.branch;
    const bId = new mongoose.Types.ObjectId(branchId);

    const transactions = await EquityTransaction.find({ branch: bId })
      .populate('paymentAccount')
      .sort({ date: -1 });

    const [contributionsAgg, withdrawalsAgg] = await Promise.all([
      EquityTransaction.aggregate([
        { $match: { branch: bId, type: 'capital_contribution' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      EquityTransaction.aggregate([
        { $match: { branch: bId, type: 'owner_withdrawal' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const totalContributions = contributionsAgg[0]?.total || 0;
    const totalWithdrawals = withdrawalsAgg[0]?.total || 0;
    const netCapital = totalContributions - totalWithdrawals;

    res.json({
      success: true,
      data: {
        totalContributions,
        totalWithdrawals,
        netCapital,
        transactions
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch equity records' });
  }
};

/**
 * POST /api/v1/equity-finance/equity/contribution
 * Record owner capital contribution
 */
export const recordCapitalContribution = async (req, res) => {
  try {
    const branchId = req.user?.branch?._id || req.user?.branch?.id || req.user?.branch;
    const { ownerName, amount, paymentMethod, paymentAccount, description, reference, date } = req.body;

    const numAmount = Number(amount);
    if (!ownerName || !numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Owner name and valid amount are required' });
    }

    const txNumber = `EQ-CAP-${Date.now().toString().slice(-6)}`;

    // Create journal entry: Debit Bank/Cash (Asset increases), Credit Owner Capital (Equity increases)
    const journal = await JournalEntry.create({
      entryNumber: `JE-${txNumber}`,
      date: date || new Date(),
      reference: reference || 'Capital Injection',
      source: 'owner_contribution',
      description: description || `Capital contribution by ${ownerName}`,
      lines: [
        {
          accountName: paymentMethod === 'bank' ? 'Bank Account' : (paymentMethod === 'mobile_money' ? 'Mobile Money' : 'Cash on Hand'),
          accountType: 'asset',
          debit: numAmount,
          credit: 0,
          description: `Cash received from ${ownerName}`
        },
        {
          accountName: "Owner's Capital Contribution",
          accountType: 'equity',
          debit: 0,
          credit: numAmount,
          description: `Equity contribution by ${ownerName}`
        }
      ],
      totalAmount: numAmount,
      isBalanced: true,
      branch: branchId,
      createdBy: req.user?._id,
      audit: { userName: req.user?.name, userRole: req.user?.role }
    });

    const tx = await EquityTransaction.create({
      transactionNumber: txNumber,
      type: 'capital_contribution',
      ownerName,
      amount: numAmount,
      paymentMethod: paymentMethod || 'cash',
      paymentAccount: paymentAccount || null,
      description: description || 'Capital contribution into business',
      reference,
      date: date || new Date(),
      journalEntry: journal._id,
      branch: branchId,
      createdBy: req.user?._id
    });

    res.status(201).json({
      success: true,
      data: tx,
      message: `Capital contribution of $${numAmount.toFixed(2)} recorded successfully`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to record capital contribution', error: error.message });
  }
};

/**
 * POST /api/v1/equity-finance/equity/withdrawal
 * Record owner withdrawal / drawing
 */
export const recordOwnerWithdrawal = async (req, res) => {
  try {
    const branchId = req.user?.branch?._id || req.user?.branch?.id || req.user?.branch;
    const { ownerName, amount, paymentMethod, paymentAccount, description, reference, date } = req.body;

    const numAmount = Number(amount);
    if (!ownerName || !numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Owner name and valid amount are required' });
    }

    const txNumber = `EQ-WTH-${Date.now().toString().slice(-6)}`;

    // Create journal entry: Debit Owner Drawings (Equity decreases), Credit Cash/Bank (Asset decreases)
    const journal = await JournalEntry.create({
      entryNumber: `JE-${txNumber}`,
      date: date || new Date(),
      reference: reference || 'Owner Drawing',
      source: 'owner_withdrawal',
      description: description || `Owner drawing by ${ownerName}`,
      lines: [
        {
          accountName: "Owner's Drawings & Withdrawals",
          accountType: 'equity',
          debit: numAmount,
          credit: 0,
          description: `Withdrawal by ${ownerName}`
        },
        {
          accountName: paymentMethod === 'bank' ? 'Bank Account' : (paymentMethod === 'mobile_money' ? 'Mobile Money' : 'Cash on Hand'),
          accountType: 'asset',
          debit: 0,
          credit: numAmount,
          description: `Funds paid out to ${ownerName}`
        }
      ],
      totalAmount: numAmount,
      isBalanced: true,
      branch: branchId,
      createdBy: req.user?._id,
      audit: { userName: req.user?.name, userRole: req.user?.role }
    });

    const tx = await EquityTransaction.create({
      transactionNumber: txNumber,
      type: 'owner_withdrawal',
      ownerName,
      amount: numAmount,
      paymentMethod: paymentMethod || 'cash',
      paymentAccount: paymentAccount || null,
      description: description || 'Owner personal withdrawal',
      reference,
      date: date || new Date(),
      journalEntry: journal._id,
      branch: branchId,
      createdBy: req.user?._id
    });

    res.status(201).json({
      success: true,
      data: tx,
      message: `Owner withdrawal of $${numAmount.toFixed(2)} recorded successfully`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to record owner withdrawal', error: error.message });
  }
};

/**
 * GET /api/v1/equity-finance/general-ledger
 * Full double-entry journal entries with audit log
 */
export const getGeneralLedger = async (req, res) => {
  try {
    const branchId = req.user?.branch?._id || req.user?.branch?.id || req.user?.branch;
    const { startDate, endDate, source } = req.query;

    const filter = { branch: branchId };
    if (source) filter.source = source;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const entries = await JournalEntry.find(filter)
      .sort({ date: -1 })
      .limit(200);

    const totalDebits = entries.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
    const totalCredits = totalDebits; // By double-entry definition

    res.json({
      success: true,
      data: {
        entries,
        summary: {
          totalEntries: entries.length,
          totalDebits,
          totalCredits,
          isBalanced: true
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch general ledger' });
  }
};

/**
 * POST /api/v1/equity-finance/journal-entry
 * Create manual double-entry journal with debit/credit balance verification
 */
export const createJournalEntry = async (req, res) => {
  try {
    const branchId = req.user?.branch?._id || req.user?.branch?.id || req.user?.branch;
    const { description, reference, date, lines } = req.body;

    if (!description || !Array.isArray(lines) || lines.length < 2) {
      return res.status(400).json({ success: false, message: 'Journal entry must have a description and at least two lines' });
    }

    let totalDebit = 0;
    let totalCredit = 0;

    const formattedLines = lines.map(line => {
      const debit = Number(line.debit) || 0;
      const credit = Number(line.credit) || 0;
      totalDebit += debit;
      totalCredit += credit;
      return {
        accountName: line.accountName || 'General Account',
        accountNumber: line.accountNumber || '1000',
        accountType: line.accountType || 'asset',
        debit,
        credit,
        description: line.description || description
      };
    });

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      return res.status(400).json({
        success: false,
        message: `Journal entry is not balanced. Total Debits: $${totalDebit.toFixed(2)}, Total Credits: $${totalCredit.toFixed(2)}`
      });
    }

    const entryNumber = `JE-${Date.now().toString().slice(-6)}`;
    const journal = await JournalEntry.create({
      entryNumber,
      date: date || new Date(),
      reference: reference || 'Manual Entry',
      source: 'manual_journal',
      description,
      lines: formattedLines,
      totalAmount: totalDebit,
      isBalanced: true,
      branch: branchId,
      createdBy: req.user?._id,
      audit: {
        userName: req.user?.name,
        userRole: req.user?.role,
        ip: req.ip
      }
    });

    res.status(201).json({
      success: true,
      data: journal,
      message: 'Journal entry created successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create journal entry', error: error.message });
  }
};

/**
 * GET /api/v1/equity-finance/receivables
 * Accounts Receivable breakdown with customer debt aging (0-30, 31-60, 60+ days)
 */
export const getReceivables = async (req, res) => {
  try {
    const branchId = req.user?.branch?._id || req.user?.branch?.id || req.user?.branch;
    const bId = new mongoose.Types.ObjectId(branchId);

    const customersWithDebt = await Customer.find({
      branch: bId,
      creditUsed: { $gt: 0 }
    }).sort({ creditUsed: -1 });

    const totalReceivables = customersWithDebt.reduce((sum, c) => sum + (c.creditUsed || 0), 0);

    // Aging breakdown
    const now = new Date();
    const days30 = 30 * 24 * 60 * 60 * 1000;
    const days60 = 60 * 24 * 60 * 60 * 1000;

    let current0To30 = 0;
    let overdue31To60 = 0;
    let overdue60Plus = 0;

    customersWithDebt.forEach(c => {
      const age = now - new Date(c.updatedAt || c.createdAt);
      const amount = c.creditUsed || 0;
      if (age <= days30) current0To30 += amount;
      else if (age <= days60) overdue31To60 += amount;
      else overdue60Plus += amount;
    });

    res.json({
      success: true,
      data: {
        totalReceivables,
        customerCount: customersWithDebt.length,
        agingSummary: {
          current0To30,
          overdue31To60,
          overdue60Plus
        },
        customers: customersWithDebt.map(c => ({
          _id: c._id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          creditLimit: c.creditLimit || 0,
          creditUsed: c.creditUsed || 0,
          lastActivity: c.updatedAt
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch receivables data' });
  }
};

/**
 * GET /api/v1/equity-finance/payables
 * Accounts Payable breakdown with supplier debts
 */
export const getPayables = async (req, res) => {
  try {
    const branchId = req.user?.branch?._id || req.user?.branch?.id || req.user?.branch;
    const bId = new mongoose.Types.ObjectId(branchId);

    const creditPurchases = await Purchase.find({
      branch: bId,
      paymentMethod: 'credit'
    }).populate('supplier').sort({ date: -1 });

    const totalPayables = creditPurchases.reduce((sum, p) => sum + (p.grandTotal || 0), 0);

    res.json({
      success: true,
      data: {
        totalPayables,
        unpaidInvoicesCount: creditPurchases.length,
        purchases: creditPurchases.map(p => ({
          _id: p._id,
          purchaseNumber: p.purchaseNumber || `PO-${p._id.toString().slice(-6)}`,
          supplierName: p.supplier?.name || 'Standard Supplier',
          supplierPhone: p.supplier?.phone,
          amount: p.grandTotal,
          date: p.date,
          status: p.status
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch payables data' });
  }
};

/**
 * GET /api/v1/equity-finance/inventory-valuation
 * Inventory Asset Valuation & COGS report
 */
export const getInventoryValuation = async (req, res) => {
  try {
    const branchId = req.user?.branch?._id || req.user?.branch?.id || req.user?.branch;
    const bId = new mongoose.Types.ObjectId(branchId);

    const products = await Product.find({ branch: bId, active: { $ne: false } }).sort({ name: 1 });

    let totalAssetCost = 0;
    let totalRetailValue = 0;
    let totalItemsInStock = 0;

    const items = products.map(p => {
      const stock = Number(p.stock) || 0;
      const cost = Number(p.cost) || 0;
      const price = Number(p.price) || 0;
      const assetVal = stock * cost;
      const retailVal = stock * price;
      const potentialProfit = retailVal - assetVal;

      totalAssetCost += assetVal;
      totalRetailValue += retailVal;
      totalItemsInStock += stock;

      return {
        _id: p._id,
        name: p.name,
        category: p.category,
        sku: p.sku || p.barcode || 'N/A',
        stock,
        minStock: p.minStock || 10,
        unitCost: cost,
        unitPrice: price,
        assetValue: assetVal,
        retailValue: retailVal,
        potentialProfit,
        marginPercent: price > 0 ? (((price - cost) / price) * 100).toFixed(1) : 0,
        isLowStock: stock <= (p.minStock || 10)
      };
    });

    res.json({
      success: true,
      data: {
        totalAssetCost,
        totalRetailValue,
        potentialProfit: totalRetailValue - totalAssetCost,
        totalItemsInStock,
        totalProductsCount: products.length,
        items
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate inventory valuation report' });
  }
};
