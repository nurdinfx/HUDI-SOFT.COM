// src/pages/Finance.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { realApi } from '../api/realApi';
import { Link } from 'react-router-dom';
import { formatCurrency, formatDate } from '../utils/date';
import ReceiptSettingsModal from '../components/Settings/ReceiptSettingsModal';

import { useOptimisticData } from '../hooks/useOptimisticData';

const Finance = () => {
  // We will cache the main view data. Complex filters might bypass cache or use specific keys.
  // For simplicity, we'll cache the default view and let the hook handle updates.
  // We need to move filters definition up to use them in the hook key/dependency if we want caching per filter.
  // Or simpler: Cache default view, and if filters are active, just fetch normally (or using the hook with different key).

  const [filters, setFilters] = useState({
    category: '',
    startDate: '',
    endDate: ''
  });
  const [txFilters, setTxFilters] = useState({
    search: '',
    from: '',
    to: '',
    type: ''
  });
  const [showReceiptSettings, setShowReceiptSettings] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'expense',
    category: 'General',
    amount: '',
    paymentMethod: 'cash',
    description: '',
    reference: ''
  });

  // Create a stable key based on filters to allow caching different views
  // Limiting to a few common combinations to avoid cache explosion could be wise, but localStorage is 5MB.
  // Let's just use a single key for "finance_dashboard" which represents the default view.
  // If filters are active, we might not want to write to that same key.
  // Actually, the user wants "instant load". That implies the INITIAL load (default view) is most important.

  const isDefaultView = !filters.category && !filters.startDate && !filters.endDate && !txFilters.search && !txFilters.from && !txFilters.to && !txFilters.type;
  const cacheKey = isDefaultView ? 'finance_overview' : null; // Only cache default view

  const initialFinanceData = {
    expenses: [],
    transactions: [],
    financialStats: {
      totalRevenue: 0,
      totalExpenses: 0,
      netProfit: 0,
      monthlyRevenue: 0,
      monthlyExpenses: 0
    },
    settings: null
  };

  const {
    data: financeData,
    loading: hookLoading,
    error: hookError,
    refresh
  } = useOptimisticData(cacheKey || 'finance_temp', async () => {
    const expenseParams = {
      category: filters.category || undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined
    };
    const txParams = {
      type: txFilters.type || undefined,
      startDate: txFilters.from || undefined,
      endDate: txFilters.to || undefined
    };

    const [settingsResponse, transactionsResponse, expensesResponse] = await Promise.all([
      realApi.getSettings(),
      realApi.getTransactions(txParams),
      realApi.getExpenses(expenseParams)
    ]);

    const result = { ...initialFinanceData };

    if (settingsResponse.success) {
      result.settings = realApi.extractData(settingsResponse);
    }

    const txRaw = transactionsResponse.success ? (realApi.extractData(transactionsResponse) || []) : [];
    const txList = Array.isArray(txRaw)
      ? txRaw
      : (Array.isArray(txRaw?.transactions) ? txRaw.transactions : []);
    result.transactions = Array.isArray(txList) ? txList : [];

    if (expensesResponse.success) {
      const expensesData = realApi.extractData(expensesResponse) || [];
      result.expenses = Array.isArray(expensesData) ? expensesData : [];
    }

    const safeTx = result.transactions;
    const incomeTotal = safeTx.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const expenseTotal = safeTx.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);

    result.financialStats = {
      totalRevenue: incomeTotal,
      totalExpenses: expenseTotal,
      netProfit: incomeTotal - expenseTotal,
      monthlyRevenue: incomeTotal,
      monthlyExpenses: expenseTotal
    };

    return result;
  }, initialFinanceData, [filters, txFilters]); // Re-fetch when filters change

  // Destructure data
  const { expenses, transactions, financialStats, settings } = financeData;
  const [orders, setOrders] = useState([]); // Kept as in original but seems unused/cleared
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);

  const loading = hookLoading;
  const [internalLoading, setInternalLoading] = useState(false);
  const [error, setError] = useState('');

  // Sync hook error
  useEffect(() => {
    if (hookError) setError(hookError.message);
  }, [hookError]);

  // Initial load handled by hook
  // useEffect(() => {
  //   loadFinancialData();
  // }, []);

  // Filter effects
  useEffect(() => {
    // We already have fresh data from hook based on API filters for transactions/expenses list if the API supports it.
    filterExpenses();
    filterTransactions();
  }, [financeData, filters, txFilters.search]); // Updated dependencies

  // Replaced loadFinancialData function with hook logic.
  // But we need to keep a 'reload' function for actions like 'saveTransaction'.
  const loadFinancialData = refresh;


  const filterTransactions = () => {
    let list = Array.isArray(transactions) ? transactions : [];
    const search = (txFilters.search || '').toLowerCase();
    if (search) {
      list = list.filter(t => (
        (t.description || '').toLowerCase().includes(search) ||
        (t.reference || '').toLowerCase().includes(search)
      ));
    }
    setFilteredTransactions(list);
  };

  const filterExpenses = () => {
    let filtered = Array.isArray(expenses) ? expenses : [];

    if (filters.category) {
      filtered = filtered.filter(expense => expense.category === filters.category);
    }

    if (filters.startDate) {
      filtered = filtered.filter(expense =>
        new Date(expense.date) >= new Date(filters.startDate)
      );
    }

    if (filters.endDate) {
      filtered = filtered.filter(expense =>
        new Date(expense.date) <= new Date(filters.endDate)
      );
    }

    setFilteredExpenses(filtered);
  };

  // calculateStats function removed as it's now handled by the hook's stats calculation

  const exportTransactionsCSV = () => {
    const rows = (filteredTransactions || []).map(t => [
      formatDate(t.date),
      t.type,
      (t.amount || 0).toFixed(2),
      t.paymentMethod || 'N/A',
      t.description || '',
      t.reference || ''
    ]);
    const headers = ['Date', 'Type', 'Amount', 'Payment', 'Note', 'Reference'];
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `finance-transactions-${txFilters.from || 'all'}-${txFilters.to || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printFinanceReceipt = () => {
    const printWindow = window.open('', '_blank', 'width=500,height=700');
    if (!printWindow) return;

    const now = new Date();
    const printedAt = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const restaurantName = settings?.restaurantName || 'Restaurant';
    const logoUrl = settings?.logoUrl || settings?.logo || '';
    const currency = settings?.currency || 'USD';
    const dateRange = (txFilters.from || txFilters.to)
      ? `${txFilters.from || 'Start'} to ${txFilters.to || 'Today'}`
      : 'All Time';

    const zaad = settings?.zaad || '';
    const sahal = settings?.sahal || '';
    const edahab = settings?.edahab || '';
    const myCash = settings?.myCash || '';

    const paymentLines = [
      zaad ? `ZAAD: ${zaad}` : '',
      sahal ? `SAHAL: ${sahal}` : '',
      edahab ? `E-DAHAB: ${edahab}` : '',
      myCash ? `MyCash: ${myCash}` : ''
    ].filter(Boolean);

    const txList = Array.isArray(filteredTransactions) ? filteredTransactions : [];
    const totalIncome = txList.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const totalExpense = txList.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
    const netBalance = totalIncome - totalExpense;

    const rows = txList.map(t => `
      <tr>
        <td>${t.date ? formatDate(t.date) : 'N/A'}</td>
        <td><span class="badge ${t.type === 'income' ? 'badge-income' : 'badge-expense'}">${t.type}</span></td>
        <td style="text-align:right; font-weight:600; color:${t.type === 'income' ? '#16a34a' : '#dc2626'}">
          ${t.type === 'income' ? '+' : '-'}${(t.amount || 0).toFixed(2)}
        </td>
        <td>${t.paymentMethod || 'N/A'}</td>
        <td>${t.description || ''}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Finance Receipt</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Inter', sans-serif; padding: 16px; color: #111; font-size: 13px; }
            .header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #111; padding-bottom: 12px; }
            .logo { max-width: 80px; max-height: 80px; object-fit: contain; margin-bottom: 8px; }
            .restaurant-name { font-size: 18px; font-weight: 700; text-transform: uppercase; }
            .report-title { font-size: 13px; color: #555; margin-top: 4px; }
            .date-range { font-size: 12px; color: #777; margin-top: 2px; }
            .printed-at { font-size: 11px; color: #999; margin-top: 2px; }
            .summary { display: flex; justify-content: space-around; margin: 14px 0; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; }
            .summary-item { text-align: center; }
            .summary-label { font-size: 11px; color: #666; text-transform: uppercase; font-weight: 600; }
            .summary-value { font-size: 16px; font-weight: 700; margin-top: 2px; }
            .income-color { color: #16a34a; }
            .expense-color { color: #dc2626; }
            .balance-color { color: #2563eb; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th { text-align: left; border-bottom: 1.5px solid #111; padding: 6px 4px; font-weight: 700; background: #f4f6f8; text-transform: uppercase; font-size: 11px; }
            td { padding: 6px 4px; border-bottom: 1px solid #eee; vertical-align: top; }
            tr:hover td { background: #fafafa; }
            .badge { display: inline-block; padding: 1px 6px; border-radius: 10px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
            .badge-income { background: #dcfce7; color: #16a34a; }
            .badge-expense { background: #fee2e2; color: #dc2626; }
            .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px dashed #ccc; font-size: 11px; color: #888; }
            @media print { body { padding: 8px; } @page { margin: 8mm; } }
          </style>
        </head>
        <body>
          <div class="header">
            ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="logo" />` : ''}
            <div class="restaurant-name">${restaurantName}</div>
            <div class="report-title">Finance / Accounts Statement</div>
            <div class="date-range">Period: ${dateRange}</div>
            <div class="printed-at">Printed: ${printedAt}</div>
            ${paymentLines.length > 0 ? `
              <div style="font-size: 11px; margin-top: 8px; font-weight: 600; color: #4a5568;">
                ${paymentLines.join(' | ')}
              </div>
            ` : ''}
          </div>

          <div class="summary">
            <div class="summary-item">
              <div class="summary-label">Total Income</div>
              <div class="summary-value income-color">+${totalIncome.toFixed(2)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Expense</div>
              <div class="summary-value expense-color">-${totalExpense.toFixed(2)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Net Balance</div>
              <div class="summary-value balance-color">${netBalance >= 0 ? '+' : ''}${netBalance.toFixed(2)}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th style="text-align:right">Amount</th>
                <th>Payment</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="5" style="text-align:center;color:#999;">No transactions found</td></tr>'}
            </tbody>
          </table>

          <div class="footer">
            Showing ${txList.length} transaction(s) &bull; POWERED BY HUDI POS
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.onafterprint = function() { window.close(); };
                setTimeout(function() { window.close(); }, 1500);
              }, 400);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const saveTransaction = async () => {
    try {
      setInternalLoading(true);
      const payload = {
        date: new Date(newTransaction.date),
        type: newTransaction.type,
        category: newTransaction.category || 'General',
        amount: parseFloat(newTransaction.amount || 0),
        paymentMethod: newTransaction.paymentMethod,
        description: newTransaction.description,
        reference: newTransaction.reference
      };
      const res = await realApi.createTransaction(payload);
      if (!res.success) throw new Error(res.message || 'Failed to save transaction');
      setIsModalOpen(false);
      setNewTransaction({
        date: new Date().toISOString().split('T')[0],
        type: 'expense',
        category: 'General',
        amount: '',
        paymentMethod: 'cash',
        description: '',
        reference: ''
      });
      await loadFinancialData();
    } catch (e) {
      setError(e.message);
    } finally {
      setInternalLoading(false);
    }
  };


  const getCategoryColor = (category) => {
    const colors = {
      food: 'bg-green-100 text-green-800',
      supplies: 'bg-blue-100 text-blue-800',
      utilities: 'bg-yellow-100 text-yellow-800',
      salaries: 'bg-purple-100 text-purple-800',
      rent: 'bg-red-100 text-red-800',
      maintenance: 'bg-orange-100 text-orange-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors.other;
  };

  const getCategoryName = (category) => {
    const names = {
      food: 'Food & Ingredients',
      supplies: 'Supplies',
      utilities: 'Utilities',
      salaries: 'Salaries',
      rent: 'Rent',
      maintenance: 'Maintenance',
      other: 'Other'
    };
    return names[category] || category;
  };

  const categories = ['food', 'supplies', 'utilities', 'salaries', 'rent', 'maintenance', 'other'];



  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Finance</h1>
          <p className="text-gray-600">Financial overview: revenue, expenses, and profit tracking</p>
          {error && (
            <div className="mt-2 p-2 bg-red-100 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            to="/reports"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
          >
            View Detailed Reports
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <h3 className="text-lg font-semibold text-gray-900">Total Income</h3>
          <p className="text-3xl font-bold text-green-600">
            {formatCurrency(financialStats.totalRevenue, settings?.currency || 'USD')}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
          <h3 className="text-lg font-semibold text-gray-900">Total Expense</h3>
          <p className="text-3xl font-bold text-red-600">
            {formatCurrency(financialStats.totalExpenses, settings?.currency || 'USD')}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <h3 className="text-lg font-semibold text-gray-900">Balance</h3>
          <p className={`text-3xl font-bold ${financialStats.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'
            }`}>
            {formatCurrency(financialStats.netProfit, settings?.currency || 'USD')}
          </p>
        </div>
      </div>

      {/* Actions & Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-2">
            <input
              type="text"
              value={txFilters.search}
              onChange={(e) => setTxFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Search by note or reference"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
            <input
              type="date"
              value={txFilters.from}
              onChange={(e) => setTxFilters(prev => ({ ...prev, from: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <input
              type="date"
              value={txFilters.to}
              onChange={(e) => setTxFilters(prev => ({ ...prev, to: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={txFilters.type}
              onChange={(e) => setTxFilters(prev => ({ ...prev, type: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">All</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={loadFinancialData}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
            >
              Apply filters
            </button>
            <button
              onClick={exportTransactionsCSV}
              className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg"
            >
              Export CSV
            </button>
            <button
              onClick={printFinanceReceipt}
              className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg flex items-center gap-1"
            >
              🖨️ Print Receipt
            </button>
            <button
              onClick={() => setShowReceiptSettings(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg flex items-center gap-1"
            >
              ⚙️ Receipt Settings
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg"
            >
              Add Transaction
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Transactions</h2>
          <p className="text-sm text-gray-500 mt-1">
            Showing {filteredTransactions.length} of {transactions.length} transactions
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Note</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.isArray(filteredTransactions) && filteredTransactions.map((t) => (
                <tr key={t._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {t.date ? formatDate(t.date) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${t.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {t.type}
                    </span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount || 0, settings?.currency || 'USD')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {t.paymentMethod || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {t.description || ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(!Array.isArray(filteredTransactions) || filteredTransactions.length === 0) && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No transactions found</p>
            <p className="text-gray-400">Try adjusting your filters or add a transaction</p>
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Transaction</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newTransaction.date}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={newTransaction.type}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={newTransaction.category}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="General">General</option>
                  <option value="Sales">Sales</option>
                  <option value="Supplies">Supplies</option>
                  <option value="Rent">Rent</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={newTransaction.amount}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment</label>
                <select
                  value={newTransaction.paymentMethod}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank transfer">Bank Transfer</option>
                  <option value="digital wallet">Digital Wallet</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <input
                  type="text"
                  value={newTransaction.description}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Description or notes"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                <input
                  type="text"
                  value={newTransaction.reference}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, reference: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Invoice ID, Receipt, etc."
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg"
              >
                Cancel
              </button>
              <button
                disabled={internalLoading}
                onClick={saveTransaction}
                className={`bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center gap-2 ${internalLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {internalLoading && <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
                {internalLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ReceiptSettingsModal
        isOpen={showReceiptSettings}
        onClose={() => setShowReceiptSettings(false)}
        onSaveSuccess={() => {
          loadFinancialData();
        }}
      />
    </div>
  );
};


export default Finance;
