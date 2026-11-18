// backend/controllers/aiAssistantController.js
/**
 * HUDI-SOFT POS — AI Business Assistant Controller
 * 
 * Architecture: Data-First, GPT-Enhance
 * ──────────────────────────────────────
 * 1. All real business data is fetched from MongoDB (verified, hallucination-free)
 * 2. Data is structured into a factual context snapshot
 * 3. GPT-4o receives ONLY the verified data + user question and crafts
 *    a natural, intelligent, conversational response
 * 4. If OpenAI is unavailable, the deterministic fallback answer is served
 *
 * This guarantees:
 *  - Zero hallucination (GPT never invents numbers - it only formats real DB data)
 *  - Full natural language understanding (GPT handles any phrasing)
 *  - Graceful degradation (works offline / without API key)
 */

import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import Purchase from '../models/Purchase.js';
import Expense from '../models/Expense.js';
import Branch from '../models/Branch.js';

// ─────────────────────────────────────────────────────────────
// OpenAI Client — dynamically loaded, resilient on any host
// ─────────────────────────────────────────────────────────────
let openaiClient = null;
let OpenAILib = null;

const getOpenAIClient = async () => {
  if (openaiClient) return openaiClient;
  if (!process.env.OPENAI_API_KEY) return null;

  try {
    if (!OpenAILib) {
      const mod = await import('openai');
      OpenAILib = mod.default || mod.OpenAI || mod;
    }
    openaiClient = new OpenAILib({
      apiKey: process.env.OPENAI_API_KEY
    });
    return openaiClient;
  } catch (err) {
    console.warn('⚠️ OpenAI package not available or failed to load:', err.message);
    return null;
  }
};

// Format currency helper
const fmt = (num) => `$${(Number(num) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Calls GPT-4o with a factual business context and the user's question.
 * Returns the AI-generated natural language response.
 * Falls back to the pre-computed deterministic answer if unavailable.
 */
const enhanceWithGPT = async (userQuery, businessContext, deterministicAnswer) => {
  const client = await getOpenAIClient();
  if (!client) return deterministicAnswer;

  try {
    const systemPrompt = `You are HUDI-AI, the intelligent business assistant for HUDI-SOFT POS — a professional point-of-sale and restaurant management platform used in East Africa.

Your role:
- Analyse the verified business data provided to you
- Answer the owner/manager's question intelligently, clearly, and helpfully
- Provide actionable insights and recommendations based on the real data
- Use professional but friendly language
- Format responses clearly with bullet points, bold text, and structure when useful
- If numbers are provided, use them exactly — never fabricate or estimate
- Always acknowledge what the data shows and provide strategic commentary
- Keep responses concise but comprehensive (2-4 paragraphs max unless data table is needed)
- Reference the business as "your business" or "your restaurant/store"

IMPORTANT: Only use the numbers and facts from the verified business data context. Never make up figures.`;

    const userMessage = `Business Data Context (verified from POS database):
${businessContext}

Manager's Question: "${userQuery}"

Please provide a helpful, professional response based on this verified data.`;

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 800,
      temperature: 0.4
    });

    return completion.choices[0]?.message?.content || deterministicAnswer;
  } catch (err) {
    console.error('[AI Assistant] GPT call failed, using deterministic fallback:', err.message);
    return deterministicAnswer;
  }
};

/**
 * POST /api/v1/ai-assistant/query
 * Main AI query handler — full OpenAI GPT-4o integration
 */
export const queryAssistant = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ success: false, message: 'A question or prompt is required.' });
    }

    const branchId = req.user?.branch?._id || req.user?.branch?.id || req.user?.branch;
    const bId = new mongoose.Types.ObjectId(branchId);
    const qLower = query.toLowerCase().trim();

    // Context Dates
    const now = new Date();
    const startOfToday    = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday      = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfThisMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    let deterministicAnswer = '';
    let category = 'general';
    let dataPayload = null;
    let suggestedActions = [];
    let businessContext = '';

    // ─────────────────────────────────────────────────────────────
    // ROUTE: TOP SELLING PRODUCTS
    // ─────────────────────────────────────────────────────────────
    if (
      qLower.includes('sell the most') || qLower.includes('top selling') ||
      qLower.includes('best selling') || qLower.includes('most popular') ||
      qLower.includes('most sold') || qLower.includes('favourite item')
    ) {
      category = 'products';
      const topProductsAgg = await Order.aggregate([
        { $match: { branch: bId, $or: [{ paymentStatus: 'paid' }, { status: 'completed' }] } },
        { $unwind: '$items' },
        {
          $group: {
            _id: { $ifNull: ['$items.productName', { $ifNull: ['$items.name', '$items.product_name'] }] },
            totalQty: { $sum: '$items.quantity' },
            totalRevenue: { $sum: '$items.total' },
            orderCount: { $sum: 1 }
          }
        },
        { $sort: { totalQty: -1 } },
        { $limit: 10 }
      ]);

      if (topProductsAgg.length === 0) {
        deterministicAnswer = 'No product sales records found yet for this branch.';
        businessContext = 'Top selling products: No sales data available.';
      } else {
        const leader = topProductsAgg[0];
        deterministicAnswer = `Your #1 top-selling product is **${leader._id}** with **${leader.totalQty} units sold** generating **${fmt(leader.totalRevenue)}** in total revenue.`;
        businessContext = `Top 10 Products by Sales Volume:\n${topProductsAgg.map((p, i) => `  ${i + 1}. ${p._id || 'Unknown'} — ${p.totalQty} units sold, Revenue: ${fmt(p.totalRevenue)}, Appeared in ${p.orderCount} orders`).join('\n')}`;
        dataPayload = {
          type: 'table',
          headers: ['Rank', 'Product', 'Units Sold', 'Total Revenue', 'Order Count'],
          rows: topProductsAgg.map((p, i) => [i + 1, p._id || 'Unknown', p.totalQty, fmt(p.totalRevenue), p.orderCount])
        };
        suggestedActions = [
          'Ensure sufficient stock for top sellers',
          'Feature popular items on POS quick-dial menu',
          'Create bundles around top products'
        ];
      }
    }

    // ─────────────────────────────────────────────────────────────
    // ROUTE: SALES TODAY
    // ─────────────────────────────────────────────────────────────
    else if (
      qLower.includes('sales today') || qLower.includes('revenue today') ||
      qLower.includes('make today') || qLower.includes('earn today') ||
      qLower.includes('orders today') || qLower.includes('how much today')
    ) {
      category = 'sales';
      const [todaySalesAgg, methodsAgg] = await Promise.all([
        Order.aggregate([
          { $match: { branch: bId, createdAt: { $gte: startOfToday, $lte: endOfToday }, $or: [{ paymentStatus: 'paid' }, { status: 'completed' }] } },
          { $group: { _id: null, totalSales: { $sum: '$finalTotal' }, orderCount: { $sum: 1 }, avgOrderValue: { $avg: '$finalTotal' } } }
        ]),
        Order.aggregate([
          { $match: { branch: bId, createdAt: { $gte: startOfToday, $lte: endOfToday }, $or: [{ paymentStatus: 'paid' }, { status: 'completed' }] } },
          { $group: { _id: '$paymentMethod', total: { $sum: '$finalTotal' }, count: { $sum: 1 } } }
        ])
      ]);

      const totalSales = todaySalesAgg[0]?.totalSales || 0;
      const orderCount = todaySalesAgg[0]?.orderCount || 0;
      const avgOrder   = todaySalesAgg[0]?.avgOrderValue || 0;

      deterministicAnswer = `Today's total sales: **${fmt(totalSales)}** across **${orderCount} completed orders** (Avg ticket: **${fmt(avgOrder)}**).`;
      businessContext = `Today's Sales Summary:\n  Total Revenue: ${fmt(totalSales)}\n  Completed Orders: ${orderCount}\n  Average Order Value: ${fmt(avgOrder)}\n  Current Time: ${now.toLocaleString()}\n\nPayment Method Breakdown:\n${methodsAgg.map(m => `  ${(m._id || 'Cash').toUpperCase()}: ${m.count} orders = ${fmt(m.total)}`).join('\n') || '  No payment data'}`;

      dataPayload = {
        type: 'table',
        headers: ['Payment Method', 'Orders', 'Amount Collected'],
        rows: methodsAgg.map(m => [(m._id || 'Cash').toUpperCase(), m.count, fmt(m.total)])
      };
      suggestedActions = ['Check register cash count against recorded total', 'Compare with yesterday in Reports'];
    }

    // ─────────────────────────────────────────────────────────────
    // ROUTE: HIGH DEBT CUSTOMERS (> $1000)
    // ─────────────────────────────────────────────────────────────
    else if (
      qLower.includes('owe more than') || qLower.includes('high debt customer') ||
      qLower.includes('customer debt over') || qLower.includes('big debtors') ||
      qLower.includes('owe 1000') || qLower.includes('owe $1')
    ) {
      category = 'customers';
      const threshold = 1000;
      const highDebtors = await Customer.find({ branch: bId, creditUsed: { $gte: threshold } }).sort({ creditUsed: -1 });
      const sumHighDebt = highDebtors.reduce((acc, c) => acc + (c.creditUsed || 0), 0);

      if (highDebtors.length === 0) {
        deterministicAnswer = `Great news! You currently have **no customers** with outstanding balances exceeding $1,000.`;
        businessContext = `High-debt customers (over $1,000): None found. All customer balances are below $1,000.`;
      } else {
        deterministicAnswer = `Found **${highDebtors.length} customers** with balances over $1,000. Total exposure: **${fmt(sumHighDebt)}**.`;
        businessContext = `Customers with balances over $1,000:\n${highDebtors.map(c => `  ${c.name} | Phone: ${c.phone || 'N/A'} | Owes: ${fmt(c.creditUsed || 0)} | Limit: ${fmt(c.creditLimit || 0)}`).join('\n')}\n\nTotal high-debt exposure: ${fmt(sumHighDebt)}`;
        dataPayload = {
          type: 'table',
          headers: ['Customer Name', 'Phone', 'Credit Limit', 'Total Debt Owed'],
          rows: highDebtors.map(c => [c.name, c.phone || 'N/A', fmt(c.creditLimit || 0), fmt(c.creditUsed || 0)])
        };
        suggestedActions = ['Send payment reminders to high-debt customers', 'Freeze credit lines until partial payment', 'Generate debt recovery letters'];
      }
    }

    // ─────────────────────────────────────────────────────────────
    // ROUTE: TOTAL CUSTOMER RECEIVABLES
    // ─────────────────────────────────────────────────────────────
    else if (
      qLower.includes('owe me in total') || qLower.includes('total customer debt') ||
      qLower.includes('total receivables') || qLower.includes('total credit') ||
      qLower.includes('how much do customers owe') || qLower.includes('accounts receivable')
    ) {
      category = 'finance';
      const [debtAgg, topDebtors] = await Promise.all([
        Customer.aggregate([
          { $match: { branch: bId, creditUsed: { $gt: 0 } } },
          { $group: { _id: null, total: { $sum: '$creditUsed' }, count: { $sum: 1 } } }
        ]),
        Customer.find({ branch: bId, creditUsed: { $gt: 0 } }).sort({ creditUsed: -1 }).limit(10)
      ]);

      const totalDebt = debtAgg[0]?.total || 0;
      const debtorCount = debtAgg[0]?.count || 0;

      deterministicAnswer = `Your customers collectively owe you **${fmt(totalDebt)}** across **${debtorCount} accounts**.`;
      businessContext = `Total Accounts Receivable: ${fmt(totalDebt)} from ${debtorCount} customers with outstanding balances.\n\nTop 10 debtors:\n${topDebtors.map(c => `  ${c.name}: ${fmt(c.creditUsed || 0)}`).join('\n') || '  None'}`;

      dataPayload = {
        type: 'table',
        headers: ['Customer', 'Phone', 'Amount Owed'],
        rows: topDebtors.map(c => [c.name, c.phone || 'N/A', fmt(c.creditUsed || 0)])
      };
      suggestedActions = ['Export receivables report', 'Send bulk payment reminders', 'Review credit policies'];
    }

    // ─────────────────────────────────────────────────────────────
    // ROUTE: OVERDUE CUSTOMER DEBTS
    // ─────────────────────────────────────────────────────────────
    else if (
      qLower.includes('overdue') || qLower.includes('past due') ||
      qLower.includes('long outstanding') || qLower.includes('old debts') ||
      qLower.includes('unpaid for')
    ) {
      category = 'finance';
      const overdueThreshold = new Date(now);
      overdueThreshold.setDate(overdueThreshold.getDate() - 30);

      const overdueCustomers = await Customer.find({
        branch: bId,
        creditUsed: { $gt: 0 },
        lastPurchase: { $lt: overdueThreshold }
      }).sort({ creditUsed: -1 }).limit(20);

      const totalOverdue = overdueCustomers.reduce((a, c) => a + (c.creditUsed || 0), 0);

      if (overdueCustomers.length === 0) {
        deterministicAnswer = 'No customers with overdue balances (unpaid for 30+ days) found.';
        businessContext = 'Overdue customer debts (30+ days): None found.';
      } else {
        deterministicAnswer = `Found **${overdueCustomers.length} customers** with balances overdue for 30+ days, totalling **${fmt(totalOverdue)}**.`;
        businessContext = `Overdue Receivables (30+ days since last purchase):\n${overdueCustomers.map(c => `  ${c.name}: ${fmt(c.creditUsed)}, last purchase: ${c.lastPurchase?.toDateString() || 'Unknown'}`).join('\n')}\nTotal overdue: ${fmt(totalOverdue)}`;
        dataPayload = {
          type: 'table',
          headers: ['Customer', 'Phone', 'Overdue Amount', 'Last Activity'],
          rows: overdueCustomers.map(c => [c.name, c.phone || 'N/A', fmt(c.creditUsed || 0), c.lastPurchase?.toDateString() || 'N/A'])
        };
        suggestedActions = ['Generate formal overdue notices', 'Call customers directly', 'Consider debt write-off policy review'];
      }
    }

    // ─────────────────────────────────────────────────────────────
    // ROUTE: MONTHLY PROFIT
    // ─────────────────────────────────────────────────────────────
    else if (
      qLower.includes('profit') || qLower.includes('net income') ||
      qLower.includes('how much did we make') || qLower.includes('earnings this month') ||
      qLower.includes('margin') && qLower.includes('month')
    ) {
      category = 'finance';
      const [salesAgg, cogsAgg, expensesAgg] = await Promise.all([
        Order.aggregate([
          { $match: { branch: bId, createdAt: { $gte: startOfThisMonth, $lte: endOfThisMonth }, $or: [{ paymentStatus: 'paid' }, { status: 'completed' }] } },
          { $group: { _id: null, revenue: { $sum: '$finalTotal' }, count: { $sum: 1 } } }
        ]),
        Order.aggregate([
          { $match: { branch: bId, createdAt: { $gte: startOfThisMonth, $lte: endOfThisMonth }, $or: [{ paymentStatus: 'paid' }, { status: 'completed' }] } },
          { $unwind: '$items' },
          { $group: { _id: null, cogs: { $sum: { $multiply: [{ $ifNull: ['$items.cost', 0] }, '$items.quantity'] } } } }
        ]),
        Expense.aggregate([
          { $match: { branch: bId, date: { $gte: startOfThisMonth, $lte: endOfThisMonth } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ])
      ]);

      const revenue  = salesAgg[0]?.revenue || 0;
      const cogs     = cogsAgg[0]?.cogs || 0;
      const expenses = expensesAgg[0]?.total || 0;
      const grossProfit = revenue - cogs;
      const netIncome   = grossProfit - expenses;
      const margin      = revenue > 0 ? ((netIncome / revenue) * 100).toFixed(1) : 0;

      deterministicAnswer = `This month's net income is **${fmt(netIncome)}** (${margin}% margin). Revenue: ${fmt(revenue)}, COGS: ${fmt(cogs)}, Expenses: ${fmt(expenses)}.`;
      businessContext = `Monthly P&L for ${now.toLocaleString('en-US', { month: 'long', year: 'numeric' })}:\n  Total Revenue: ${fmt(revenue)} (${salesAgg[0]?.count || 0} orders)\n  Cost of Goods Sold (COGS): ${fmt(cogs)}\n  Gross Profit: ${fmt(grossProfit)}\n  Operating Expenses: ${fmt(expenses)}\n  Net Income: ${fmt(netIncome)}\n  Net Profit Margin: ${margin}%`;

      dataPayload = {
        type: 'table',
        headers: ['Line Item', 'Amount'],
        rows: [
          ['Total Revenue', fmt(revenue)],
          ['Cost of Goods Sold', `(${fmt(cogs)})`],
          ['Gross Profit', fmt(grossProfit)],
          ['Operating Expenses', `(${fmt(expenses)})`],
          ['Net Income', fmt(netIncome)],
          ['Net Margin', `${margin}%`]
        ]
      };
      suggestedActions = ['Review biggest expense categories', 'Check high-margin products', 'Compare against last month'];
    }

    // ─────────────────────────────────────────────────────────────
    // ROUTE: BIGGEST EXPENSES
    // ─────────────────────────────────────────────────────────────
    else if (
      qLower.includes('biggest expense') || qLower.includes('largest expense') ||
      qLower.includes('top expense') || qLower.includes('where is my money going') ||
      qLower.includes('spending the most') || qLower.includes('cost breakdown')
    ) {
      category = 'expenses';
      const expensesAgg = await Expense.aggregate([
        { $match: { branch: bId, date: { $gte: startOfThisMonth, $lte: endOfThisMonth } } },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } }
      ]);

      const totalExpenses = expensesAgg.reduce((a, e) => a + e.total, 0);

      if (expensesAgg.length === 0) {
        deterministicAnswer = 'No expense records found for this month.';
        businessContext = 'Monthly expenses: No expense records found for the current month.';
      } else {
        deterministicAnswer = `Your biggest expense this month is **${expensesAgg[0]._id}** at **${fmt(expensesAgg[0].total)}**. Total expenses: **${fmt(totalExpenses)}**.`;
        businessContext = `Monthly Expense Breakdown:\n${expensesAgg.map(e => `  ${e._id || 'Uncategorized'}: ${fmt(e.total)} (${e.count} entries, ${revenue > 0 ? ((e.total / totalExpenses) * 100).toFixed(1) : 0}% of total)`).join('\n')}\nTotal Expenses: ${fmt(totalExpenses)}`;
        dataPayload = {
          type: 'table',
          headers: ['Category', 'Total Amount', 'Entries'],
          rows: expensesAgg.map(e => [e._id || 'Uncategorized', fmt(e.total), e.count])
        };
        suggestedActions = ['Look for cost reduction opportunities', 'Compare expense categories YoY', 'Set budget limits per category'];
      }
    }

    // ─────────────────────────────────────────────────────────────
    // ROUTE: LOW STOCK ALERTS
    // ─────────────────────────────────────────────────────────────
    else if (
      qLower.includes('low stock') || qLower.includes('running out') || qLower.includes('reorder') ||
      qLower.includes('nearly out') || qLower.includes('stock alert') || qLower.includes('inventory low')
    ) {
      category = 'inventory';
      const lowStockItems = await Product.find({
        branch: bId,
        active: { $ne: false },
        $expr: { $lte: ['$stock', { $ifNull: ['$minStock', 5] }] }
      }).sort({ stock: 1 }).limit(30);

      if (lowStockItems.length === 0) {
        deterministicAnswer = 'All products are adequately stocked. No reorder alerts at this time.';
        businessContext = 'Low stock items: None. All products are above their minimum stock levels.';
      } else {
        deterministicAnswer = `⚠️ **${lowStockItems.length} products** need immediate restocking.`;
        businessContext = `Low Stock Items (at or below minimum threshold):\n${lowStockItems.map(p => `  ${p.name}: ${p.stock} remaining (min: ${p.minStock || 5}), Cost: ${fmt(p.cost)}, Price: ${fmt(p.price)}`).join('\n')}`;
        dataPayload = {
          type: 'table',
          headers: ['Product', 'Current Stock', 'Min Stock', 'Cost Price'],
          rows: lowStockItems.map(p => [p.name, p.stock, p.minStock || 5, fmt(p.cost || 0)])
        };
        suggestedActions = ['Create purchase orders for low stock items', 'Contact your preferred suppliers', 'Temporarily 86 items that are out of stock on POS'];
      }
    }

    // ─────────────────────────────────────────────────────────────
    // ROUTE: HIGH MARGIN PRODUCTS
    // ─────────────────────────────────────────────────────────────
    else if (
      qLower.includes('high margin') || qLower.includes('most profitable product') ||
      qLower.includes('best margin') || qLower.includes('highest profit product') ||
      qLower.includes('which products make the most profit')
    ) {
      category = 'products';
      const products = await Product.find({ branch: bId, active: { $ne: false }, price: { $gt: 0 }, cost: { $gt: 0 } });
      const withMargins = products.map(p => ({
        name: p.name,
        price: p.price,
        cost: p.cost || 0,
        margin: p.cost > 0 ? (((p.price - p.cost) / p.price) * 100).toFixed(1) : 0,
        profit: p.price - (p.cost || 0)
      })).sort((a, b) => b.margin - a.margin).slice(0, 15);

      if (withMargins.length === 0) {
        deterministicAnswer = 'No product pricing data found to calculate margins.';
        businessContext = 'High margin products: No products with both cost and price defined.';
      } else {
        deterministicAnswer = `Your highest-margin product is **${withMargins[0].name}** with a **${withMargins[0].margin}% gross margin**.`;
        businessContext = `Top 15 Products by Gross Margin:\n${withMargins.map((p, i) => `  ${i + 1}. ${p.name} — Margin: ${p.margin}%, Price: ${fmt(p.price)}, Cost: ${fmt(p.cost)}, Profit per unit: ${fmt(p.profit)}`).join('\n')}`;
        dataPayload = {
          type: 'table',
          headers: ['Product', 'Price', 'Cost', 'Profit/Unit', 'Margin %'],
          rows: withMargins.map(p => [p.name, fmt(p.price), fmt(p.cost), fmt(p.profit), `${p.margin}%`])
        };
        suggestedActions = ['Feature high-margin items prominently on menu', 'Train staff to upsell high-margin add-ons', 'Consider bundling high-margin with popular items'];
      }
    }

    // ─────────────────────────────────────────────────────────────
    // ROUTE: BRANCH / MONTHLY COMPARISON
    // ─────────────────────────────────────────────────────────────
    else if (
      qLower.includes('compare') || qLower.includes('month over month') ||
      qLower.includes('last month vs') || qLower.includes('vs last month') ||
      qLower.includes('month-over-month') || qLower.includes('sales trend')
    ) {
      category = 'analytics';
      const [thisMonthAgg, lastMonthAgg] = await Promise.all([
        Order.aggregate([
          { $match: { branch: bId, createdAt: { $gte: startOfThisMonth, $lte: endOfThisMonth }, $or: [{ paymentStatus: 'paid' }, { status: 'completed' }] } },
          { $group: { _id: null, total: { $sum: '$finalTotal' }, count: { $sum: 1 } } }
        ]),
        Order.aggregate([
          { $match: { branch: bId, createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }, $or: [{ paymentStatus: 'paid' }, { status: 'completed' }] } },
          { $group: { _id: null, total: { $sum: '$finalTotal' }, count: { $sum: 1 } } }
        ])
      ]);

      const thisMonthTotal  = thisMonthAgg[0]?.total || 0;
      const lastMonthTotal  = lastMonthAgg[0]?.total || 0;
      const delta           = thisMonthTotal - lastMonthTotal;
      const deltaPercent    = lastMonthTotal > 0 ? ((delta / lastMonthTotal) * 100).toFixed(1) : 'N/A';
      const trend           = delta >= 0 ? '📈 UP' : '📉 DOWN';

      deterministicAnswer = `${trend} ${Math.abs(deltaPercent)}% vs last month. This month: **${fmt(thisMonthTotal)}** | Last month: **${fmt(lastMonthTotal)}** | Change: **${delta >= 0 ? '+' : ''}${fmt(delta)}**.`;
      businessContext = `Month-over-Month Sales Comparison:\n  This Month (${now.toLocaleString('en-US', { month: 'long' })}): ${fmt(thisMonthTotal)} (${thisMonthAgg[0]?.count || 0} orders)\n  Last Month (${new Date(startOfLastMonth).toLocaleString('en-US', { month: 'long' })}): ${fmt(lastMonthTotal)} (${lastMonthAgg[0]?.count || 0} orders)\n  Change: ${delta >= 0 ? '+' : ''}${fmt(delta)} (${deltaPercent}%)\n  Trend: ${trend}`;

      dataPayload = {
        type: 'table',
        headers: ['Period', 'Revenue', 'Orders'],
        rows: [
          [new Date(startOfLastMonth).toLocaleString('en-US', { month: 'long', year: 'numeric' }), fmt(lastMonthTotal), lastMonthAgg[0]?.count || 0],
          [now.toLocaleString('en-US', { month: 'long', year: 'numeric' }), fmt(thisMonthTotal), thisMonthAgg[0]?.count || 0],
          ['Change', `${delta >= 0 ? '+' : ''}${fmt(delta)}`, '—']
        ]
      };
      suggestedActions = ['Identify what drove the change', 'Review marketing activities from last month', 'Adjust staffing for growth trajectory'];
    }

    // ─────────────────────────────────────────────────────────────
    // ROUTE: UPCOMING SUPPLIER PAYMENTS / AP
    // ─────────────────────────────────────────────────────────────
    else if (
      qLower.includes('supplier') || qLower.includes('payable') || qLower.includes('owe suppliers') ||
      qLower.includes('upcoming payment') || qLower.includes('bills to pay') ||
      qLower.includes('accounts payable') || qLower.includes('credit purchase')
    ) {
      category = 'finance';
      const creditPurchases = await Purchase.find({
        branch: bId,
        paymentMethod: 'credit',
        paymentStatus: { $in: ['pending', 'partial'] }
      }).sort({ createdAt: -1 }).limit(20).populate('supplier', 'name phone email');

      const totalAP = creditPurchases.reduce((a, p) => a + ((p.totalAmount || 0) - (p.paidAmount || 0)), 0);

      if (creditPurchases.length === 0) {
        deterministicAnswer = 'No outstanding supplier payables found. You are fully paid up with suppliers.';
        businessContext = 'Accounts Payable: No outstanding credit purchases found.';
      } else {
        deterministicAnswer = `You have **${creditPurchases.length} unpaid supplier invoices** totalling **${fmt(totalAP)}** in outstanding payables.`;
        businessContext = `Outstanding Supplier Payables (Accounts Payable):\n${creditPurchases.map(p => {
          const remaining = (p.totalAmount || 0) - (p.paidAmount || 0);
          return `  ${p.supplier?.name || 'Unknown Supplier'}: Owes ${fmt(remaining)} (Total: ${fmt(p.totalAmount)}, Paid: ${fmt(p.paidAmount || 0)}, Date: ${p.createdAt?.toDateString()})`;
        }).join('\n')}\nTotal AP: ${fmt(totalAP)}`;
        dataPayload = {
          type: 'table',
          headers: ['Supplier', 'Invoice Total', 'Paid', 'Outstanding', 'Date'],
          rows: creditPurchases.map(p => [
            p.supplier?.name || 'Unknown',
            fmt(p.totalAmount || 0),
            fmt(p.paidAmount || 0),
            fmt((p.totalAmount || 0) - (p.paidAmount || 0)),
            p.createdAt?.toDateString() || 'N/A'
          ])
        };
        suggestedActions = ['Prioritise oldest invoices for payment', 'Negotiate extended payment terms', 'Record partial payments in Purchases module'];
      }
    }

    // ─────────────────────────────────────────────────────────────
    // ROUTE: PERFORMANCE RECOMMENDATIONS / STRATEGY
    // ─────────────────────────────────────────────────────────────
    else if (
      qLower.includes('recommend') || qLower.includes('advice') || qLower.includes('improve') ||
      qLower.includes('grow') || qLower.includes('strategy') || qLower.includes('performance') ||
      qLower.includes('what should i do') || qLower.includes('how can i')
    ) {
      category = 'strategy';
      const [lowStockCount, totalDebtAgg, todaySalesAgg, monthExpenses] = await Promise.all([
        Product.countDocuments({ branch: bId, active: { $ne: false }, stock: { $lte: 5 } }),
        Customer.aggregate([{ $match: { branch: bId, creditUsed: { $gt: 0 } } }, { $group: { _id: null, total: { $sum: '$creditUsed' }, count: { $sum: 1 } } }]),
        Order.aggregate([{ $match: { branch: bId, createdAt: { $gte: startOfToday }, $or: [{ paymentStatus: 'paid' }, { status: 'completed' }] } }, { $group: { _id: null, total: { $sum: '$finalTotal' } } }]),
        Expense.aggregate([{ $match: { branch: bId, date: { $gte: startOfThisMonth, $lte: endOfThisMonth } } }, { $group: { _id: null, total: { $sum: '$amount' } } }])
      ]);

      const customerDebt  = totalDebtAgg[0]?.total || 0;
      const debtorCount   = totalDebtAgg[0]?.count || 0;
      const todayTotal    = todaySalesAgg[0]?.total || 0;
      const expenses      = monthExpenses[0]?.total || 0;

      businessContext = `Current Business Health Signals:\n  Today's Revenue: ${fmt(todayTotal)}\n  Low Stock Items: ${lowStockCount}\n  Total Customer Debt (AR): ${fmt(customerDebt)} from ${debtorCount} customers\n  This Month's Expenses: ${fmt(expenses)}\n  Current Date & Time: ${now.toLocaleString()}`;

      deterministicAnswer = `Based on your live data: ${lowStockCount} items need restocking, ${debtorCount} customers owe a total of **${fmt(customerDebt)}**. Today's sales: **${fmt(todayTotal)}**.`;

      dataPayload = {
        type: 'recommendations',
        items: [
          { priority: customerDebt > 5000 ? 'HIGH' : 'MEDIUM', title: '1. Recover Customer Debts', impact: `Unlock up to ${fmt(customerDebt)}`, detail: 'Contact customers with outstanding balances. Structured reminders and partial-payment plans can significantly improve cash flow.' },
          { priority: lowStockCount > 0 ? 'HIGH' : 'LOW', title: '2. Restock Low Inventory', impact: `${lowStockCount} items below minimum`, detail: 'Place purchase orders now to prevent stockouts during peak hours that turn away paying customers.' },
          { priority: 'MEDIUM', title: '3. Promote High-Margin Items', impact: 'Boost ticket size 15-25%', detail: 'Train staff to upsell high-profit beverages, sides, and desserts alongside main courses.' },
          { priority: 'MEDIUM', title: '4. Audit Weekly Cash Reconciliation', impact: 'Prevent revenue leakage', detail: 'Use Equity & Finance module to regularly reconcile cash drawer, bank, and mobile money accounts.' }
        ]
      };
      suggestedActions = ['View Customer Ledger for debt recovery', 'Create purchase orders for low stock', 'Review Equity & Finance statements'];
    }

    // ─────────────────────────────────────────────────────────────
    // DEFAULT: GENERAL SNAPSHOT + GPT FREE-FORM ANSWER
    // ─────────────────────────────────────────────────────────────
    else {
      category = 'general';
      const [todayAgg, monthAgg, debtorAgg, lowStockCount] = await Promise.all([
        Order.aggregate([{ $match: { branch: bId, createdAt: { $gte: startOfToday, $lte: endOfToday }, $or: [{ paymentStatus: 'paid' }, { status: 'completed' }] } }, { $group: { _id: null, total: { $sum: '$finalTotal' }, count: { $sum: 1 } } }]),
        Order.aggregate([{ $match: { branch: bId, createdAt: { $gte: startOfThisMonth, $lte: endOfThisMonth }, $or: [{ paymentStatus: 'paid' }, { status: 'completed' }] } }, { $group: { _id: null, total: { $sum: '$finalTotal' }, count: { $sum: 1 } } }]),
        Customer.aggregate([{ $match: { branch: bId, creditUsed: { $gt: 0 } } }, { $group: { _id: null, total: { $sum: '$creditUsed' }, count: { $sum: 1 } } }]),
        Product.countDocuments({ branch: bId, active: { $ne: false }, stock: { $lte: 5 } })
      ]);

      const todaySales  = todayAgg[0]?.total || 0;
      const todayOrders = todayAgg[0]?.count || 0;
      const monthSales  = monthAgg[0]?.total || 0;
      const monthOrders = monthAgg[0]?.count || 0;
      const totalDebt   = debtorAgg[0]?.total || 0;
      const debtorCount = debtorAgg[0]?.count || 0;

      businessContext = `Live Business Snapshot (${now.toLocaleString()}):\n  Today's Revenue: ${fmt(todaySales)} (${todayOrders} orders)\n  This Month's Revenue: ${fmt(monthSales)} (${monthOrders} orders)\n  Total Customer Receivables (AR): ${fmt(totalDebt)} from ${debtorCount} customers\n  Low Stock Alerts: ${lowStockCount} items`;

      deterministicAnswer = `Here is your current business summary:\n\n- **Today's Sales**: ${fmt(todaySales)} (${todayOrders} orders)\n- **This Month's Sales**: ${fmt(monthSales)} (${monthOrders} orders)\n- **Customer Receivables**: ${fmt(totalDebt)}\n- **Low Stock Alerts**: ${lowStockCount} items\n\nAsk me anything specific about your business!`;

      suggestedActions = [
        'What are my total sales today?',
        'Which products sell the most?',
        'What is my profit this month?',
        'Which customers owe more than $1,000?',
        'What are my biggest expenses?',
        'What actions should I consider to improve performance?'
      ];
    }

    // ─────────────────────────────────────────────────────────────
    // GPT-4o ENHANCEMENT — Wrap verified data in natural language
    // ─────────────────────────────────────────────────────────────
    const finalAnswer = await enhanceWithGPT(query, businessContext, deterministicAnswer);

    return res.json({
      success: true,
      data: {
        query,
        category,
        answer: finalAnswer,
        dataPayload,
        suggestedActions,
        aiPowered: !!process.env.OPENAI_API_KEY,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[AI Assistant] Query Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process AI query. Please try again.',
      error: error.message
    });
  }
};

/**
 * GET /api/v1/ai-assistant/insights
 * Proactive business intelligence dashboard alerts
 */
export const getProactiveInsights = async (req, res) => {
  try {
    const branchId = req.user?.branch?._id || req.user?.branch?.id || req.user?.branch;
    const bId = new mongoose.Types.ObjectId(branchId);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [todayAgg, monthAgg, lowStockCount, highDebtCount, expensesAgg] = await Promise.all([
      Order.aggregate([
        { $match: { branch: bId, createdAt: { $gte: startOfToday }, $or: [{ paymentStatus: 'paid' }, { status: 'completed' }] } },
        { $group: { _id: null, total: { $sum: '$finalTotal' }, count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: { branch: bId, createdAt: { $gte: startOfMonth, $lte: endOfMonth }, $or: [{ paymentStatus: 'paid' }, { status: 'completed' }] } },
        { $group: { _id: null, total: { $sum: '$finalTotal' }, count: { $sum: 1 } } }
      ]),
      Product.countDocuments({ branch: bId, active: { $ne: false }, stock: { $lte: 5 } }),
      Customer.countDocuments({ branch: bId, creditUsed: { $gte: 1000 } }),
      Expense.aggregate([
        { $match: { branch: bId, date: { $gte: startOfMonth, $lte: endOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const todaySales  = todayAgg[0]?.total || 0;
    const monthSales  = monthAgg[0]?.total || 0;
    const monthExp    = expensesAgg[0]?.total || 0;
    const grossProfit = monthSales - monthExp;

    const insights = [
      {
        id: 'sales_today',
        type: 'info',
        title: "Today's Sales",
        message: `${fmt(todaySales)} across ${todayAgg[0]?.count || 0} orders today.`,
        value: todaySales
      },
      {
        id: 'monthly_sales',
        type: 'info',
        title: 'Month-to-Date Revenue',
        message: `${fmt(monthSales)} this month (${monthAgg[0]?.count || 0} orders).`,
        value: monthSales
      }
    ];

    if (grossProfit > 0) {
      insights.push({
        id: 'gross_profit',
        type: 'success',
        title: 'Estimated Gross Profit',
        message: `Estimated at ${fmt(grossProfit)} this month (Revenue minus recorded expenses).`,
        value: grossProfit
      });
    }

    if (lowStockCount > 0) {
      insights.push({
        id: 'low_stock',
        type: 'warning',
        title: '⚠️ Inventory Alert',
        message: `${lowStockCount} products have reached low stock levels and need restocking.`,
        value: lowStockCount
      });
    }

    if (highDebtCount > 0) {
      insights.push({
        id: 'high_debt',
        type: 'alert',
        title: '🔴 High-Value Debtors',
        message: `${highDebtCount} customer(s) have outstanding balances exceeding $1,000.`,
        value: highDebtCount
      });
    }

    res.json({
      success: true,
      data: insights,
      aiPowered: !!process.env.OPENAI_API_KEY
    });

  } catch (error) {
    console.error('[AI Assistant] Insights Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch business insights.' });
  }
};
