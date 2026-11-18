import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUp, ArrowDown, Equal, Banknote, UserPlus, RefreshCw, Printer } from 'lucide-react';
import { realApi } from '../api/realApi';
import { useAuth } from '../contexts/AuthContext';

const SummaryCard = ({ title, value, color, icon: Icon }) => (
  <div className={`flex items-center gap-3 rounded-lg p-4 text-white`} style={{ backgroundColor: color }}>
    <div className="p-2 bg-white/20 rounded">
      <Icon size={22} />
    </div>
    <div>
      <div className="text-sm opacity-90">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  </div>
);

import { useOptimisticData } from '../hooks/useOptimisticData';

const CustomerLedger = () => {
  const { user } = useAuth();

  // Optimistic customers load
  const {
    data: customers,
    loading: hookLoading,
    error: hookError,
    refresh: loadCustomers
  } = useOptimisticData('customers_ledger_list', async () => {
    const response = await realApi.getCustomers();
    const list = realApi.extractData(response)?.customers || realApi.extractData(response) || response.data || [];
    const customersArray = Array.isArray(list) ? list : [];
    return [...customersArray].sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  // const [customers, setCustomers] = useState([]); // Replaced
  const [selectedCustomerId, setSelectedCustomerId] = useState(() => {
    return localStorage.getItem('selected_ledger_customer_id') || '';
  });
  const [summary, setSummary] = useState({ debit: 0, credit: 0, balance: 0 });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false); // Ledger loading state
  const [error, setError] = useState('');
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', address: '' });
  const [addTransaction, setAddTransaction] = useState({
    type: 'debit',
    amount: '',
    description: '',
    date: new Date().toISOString().substring(0, 16)
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState('50');

  // Auto-select first customer if no valid selection is saved in cache
  useEffect(() => {
    if (customers.length > 0) {
      const savedCustomerId = localStorage.getItem('selected_ledger_customer_id');
      const customerExists = customers.some(c => c._id === savedCustomerId);
      if (savedCustomerId && customerExists) {
        setSelectedCustomerId(savedCustomerId);
      } else if (!selectedCustomerId) {
        setSelectedCustomerId(customers[0]._id);
      }
    }
  }, [customers]);

  // Load customer ledger automatically when selection or customer list updates
  useEffect(() => {
    if (selectedCustomerId && customers.length > 0) {
      localStorage.setItem('selected_ledger_customer_id', selectedCustomerId);
      loadLedger();
    }
  }, [selectedCustomerId, customers]);

  // Initial load handled by hook
  // useEffect(() => {
  //   loadCustomers();
  // }, []);

  /* loadCustomers replaced by hook */
  /*
  const loadCustomers = async () => {
    // ...
  };
  */

  const loadLedger = async () => {
    if (!selectedCustomerId) return;
    try {
      setLoading(true);
      setError('');
      const selectedCustomer = customers.find(c => c._id === selectedCustomerId);
      if (!selectedCustomer) return;
      const ledgerResponse = await realApi.getCustomerLedger(selectedCustomerId);
      const ledgerData = realApi.extractData(ledgerResponse) || ledgerResponse.data || [];
      // Map transactionType from backend to display type
      // Backend saves: 'sale' (from POS credit order), 'debit' (manual debit), 'payment', 'credit' (manual credit)
      const mapType = (t) => {
        const tt = t.transactionType || t.type || '';
        if (tt === 'sale' || tt === 'debit') return 'credit';
        if (tt === 'payment' || tt === 'credit') return 'debit';
        // Fallback: negative balance movement = credit, positive = debit
        return t.amount < 0 ? 'credit' : 'debit';
      };

      const formattedTransactions = Array.isArray(ledgerData) ? ledgerData.map((t, index) => ({
        _id: t._id || `tx_${Date.now()}_${index}`,
        date: t.date || t.createdAt || new Date().toISOString(),
        reference: t.reference || t.description || t.orderNumber || `TX-${index + 1}`,
        type: mapType(t),
        amount: Math.abs(t.amount || 0),
        balance: t.balance || 0,
        advance: t.advance || 0,
        remarks: t.description || t.remarks || '',
      })) : [];

      // Sort chronological (oldest to newest) to calculate running balance correctly
      const chronologicalTx = [...formattedTransactions].sort((a, b) => new Date(a.date) - new Date(b.date));
      let runningBalance = 0;
      let totalCredit = 0;
      let totalDebit = 0;

      const calculatedTx = chronologicalTx.map(t => {
        if (t.type === 'credit') {
          runningBalance += t.amount;
          totalCredit += t.amount;
        } else {
          runningBalance -= t.amount;
          totalDebit += t.amount;
        }
        return {
          ...t,
          balance: runningBalance
        };
      });

      // Sort reverse chronological (newest first) for display
      const sortedTransactions = calculatedTx.sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(sortedTransactions);

      setSummary({
        debit: totalDebit,
        credit: totalCredit,
        balance: runningBalance,
      });
    } catch (e) {
      console.error('Load ledger error:', e);
      setError('Failed to load ledger data');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name.trim()) {
      alert('Please enter customer name');
      return;
    }

    try {
      setLoading(true);
      const response = await realApi.createCustomer(newCustomer);
      if (response.success) {
        await loadCustomers();
        setNewCustomer({ name: '', phone: '', email: '', address: '' });
        setShowAddCustomer(false);
        alert('Customer added successfully');
      } else {
        throw new Error(response.message || 'Failed to add customer');
      }
    } catch (e) {
      console.error('Add customer error:', e);
      alert('Failed to add customer: ' + (e.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = async () => {
    if (!addTransaction.amount || parseFloat(addTransaction.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (!addTransaction.description.trim()) {
      alert('Please enter a description');
      return;
    }

    if (!selectedCustomerId) {
      alert('Please select a customer first');
      return;
    }

    try {
      setLoading(true);
      const transactionData = {
        customerId: selectedCustomerId,
        type: addTransaction.type,
        amount: parseFloat(addTransaction.amount),
        description: addTransaction.description,
        date: addTransaction.date ? new Date(addTransaction.date).toISOString() : new Date().toISOString(),
      };
      const response = await realApi.addLedgerTransaction(transactionData);
      if (response.success) {
        await loadLedger();
        setAddTransaction({
          type: 'debit',
          amount: '',
          description: '',
          date: new Date().toISOString().substring(0, 16)
        });
        alert('Transaction added successfully');
      } else {
        throw new Error(response.message || 'Failed to add transaction');
      }
    } catch (e) {
      console.error('Add transaction error:', e);
      alert('Failed to add transaction: ' + (e.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handlePrintLedger = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=600');
    const selectedCustomer = customers.find(c => c._id === selectedCustomerId);

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Customer Invoice - ${selectedCustomer?.name || 'Customer'}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .summary { display: flex; justify-content: space-around; margin: 20px 0; }
          .summary-card { padding: 15px; border-radius: 5px; color: white; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f4f4f4; }
          .debit { color: red; }
          .credit { color: green; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Customer Invoice</h1>
          <h2>${selectedCustomer?.name || 'Customer'}</h2>
          <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="summary">
          <div class="summary-card" style="background-color: #2563eb;">
            <h3>Debit</h3>
            <p>$${formatAmount(summary.debit)}</p>
          </div>
          <div class="summary-card" style="background-color: #16a34a;">
            <h3>Debit (Payments)</h3>
            <p>$${formatAmount(summary.debit)}</p>
          </div>
          <div class="summary-card" style="background-color: #2563eb;">
            <h3>Credit (Owed)</h3>
            <p>$${formatAmount(summary.credit)}</p>
          </div>
          <div class="summary-card" style="background-color: #ec4899;">
            <h3>Balance</h3>
            <p>${summary.balance < 0 ? `-$${formatAmount(Math.abs(summary.balance))}` : `$${formatAmount(summary.balance)}`}</p>
            <small>${summary.balance > 0 ? 'Receivable' : summary.balance < 0 ? 'Payable' : 'Settled'}</small>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Reference</th>
              <th>Debit Amount</th>
              <th>Credit Amount</th>
              <th>Balance</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${transactions.map(t => `
              <tr>
                <td>${formatDateTime(t.date)}</td>
                <td>${t.reference}</td>
                <td class="credit" style="color: green;">${t.type === 'debit' ? `$${formatAmount(t.amount)}` : ''}</td>
                <td class="debit" style="color: red;">${t.type === 'credit' ? `$${formatAmount(t.amount)}` : ''}</td>
                <td>${t.balance < 0 ? `-$${formatAmount(Math.abs(t.balance))}` : `$${formatAmount(t.balance)}`} ${t.balance > 0 ? 'Receivable' : t.balance < 0 ? 'Payable' : 'Settled'}</td>
                <td>${t.remarks}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>Total Records: ${transactions.length}</p>
          <p>Report generated by Hudi POS System</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const pagedTransactions = useMemo(() => {
    if (pageSize === 'all') return transactions;
    const size = parseInt(pageSize) || 50;
    const start = (page - 1) * size;
    return transactions.slice(start, start + size);
  }, [transactions, page, pageSize]);

  const totalPages = useMemo(() => {
    if (pageSize === 'all') return 1;
    const size = parseInt(pageSize) || 50;
    return Math.max(1, Math.ceil(transactions.length / size));
  }, [transactions, pageSize]);

  const formatDateTime = (value) => {
    let v = value;
    if (typeof v === 'string' && v.includes(' ') && !v.includes('T')) {
      v = v.replace(' ', 'T');
    }
    const d = typeof v === 'number' ? new Date(v) : new Date(v);
    if (isNaN(d.getTime())) return 'Invalid Date';
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatAmount = (n) => {
    const num = typeof n === 'number' ? n : parseFloat(n) || 0;
    return num.toFixed(2);
  };

  const getBalanceStatus = () => {
    if (summary.balance > 0) return { text: 'Receivable', color: 'text-red-600' };
    if (summary.balance < 0) return { text: 'Payable', color: 'text-green-600' };
    return { text: 'Settled', color: 'text-gray-600' };
  };

  const balanceStatus = getBalanceStatus();

  return (
    <div className="page-content flex flex-col gap-6 h-full overflow-auto">
      {/* Header */}
      <div className="card bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="heading-1 text-white mb-2">Customer Ledger</h1>
            <p className="text-blue-100">Manage customer accounts and transactions</p>
          </div>
          <div className="text-sm text-blue-100">
            {new Date().toLocaleString()}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="card">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full md:w-auto">
            <label className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">Select Customer</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => { setSelectedCustomerId(e.target.value); setPage(1); }}
              className="border border-gray-300 rounded px-2 sm:px-3 py-1.5 sm:py-2 w-full sm:min-w-[200px] md:min-w-[250px] text-sm"
              disabled={loading}
            >
              {customers.length === 0 ? (
                <option value="">No customers available</option>
              ) : (
                customers.map(c => (
                  <option key={c._id} value={c._id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))
              )}
            </select>

            <button
              onClick={() => setShowAddCustomer(true)}
              className="flex items-center gap-1 sm:gap-2 bg-blue-600 hover:bg-blue-700 text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded transition-colors text-xs sm:text-sm whitespace-nowrap"
              disabled={loading}
            >
              <UserPlus size={16} />
              <span className="hidden sm:inline">Add Customer</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
            <button
              onClick={loadLedger}
              disabled={loading}
              className="flex items-center gap-1 sm:gap-2 bg-gray-600 hover:bg-gray-700 text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded transition-colors text-xs sm:text-sm"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Loading...' : 'Refresh'}
            </button>

            <button
              onClick={handlePrintLedger}
              className="flex items-center gap-1 sm:gap-2 bg-green-600 hover:bg-green-700 text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded transition-colors text-xs sm:text-sm whitespace-nowrap"
            >
              <Printer size={16} />
              <span className="hidden sm:inline">Print Invoice</span>
              <span className="sm:hidden">Print</span>
            </button>

            <div className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
              {new Date().toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Customer</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="Enter customer name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="Enter address"
                    rows="3"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowAddCustomer(false);
                      setNewCustomer({ name: '', phone: '', email: '', address: '' });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddCustomer}
                    disabled={!newCustomer.name.trim() || loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Adding...' : 'Add Customer'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard title="Total Debit (Payments)" value={`$${formatAmount(summary.debit)}`} color="#16a34a" icon={ArrowDown} />
        <SummaryCard title="Total Credit (Owed)" value={`$${formatAmount(summary.credit)}`} color="#2563eb" icon={ArrowUp} />
        <SummaryCard
          title="Current Balance"
          value={summary.balance < 0 ? `-$${formatAmount(Math.abs(summary.balance))}` : `$${formatAmount(summary.balance)}`}
          color="#ec4899"
          icon={Equal}
        />
        <SummaryCard
          title="Account Status"
          value={balanceStatus.text}
          color={summary.balance > 0 ? "#ef4444" : summary.balance < 0 ? "#10b981" : "#6b7280"}
          icon={Banknote}
        />
      </div>

      {/* Add Transaction Section */}
      <div className="card">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Add Transaction</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={addTransaction.type}
              onChange={(e) => setAddTransaction({ ...addTransaction, type: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="debit">Credit (Customer Owes)</option>
              <option value="credit">Debit (Customer Payment)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
            <input
              type="number"
              value={addTransaction.amount}
              onChange={(e) => setAddTransaction({ ...addTransaction, amount: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="Enter amount"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
            <input
              type="datetime-local"
              value={addTransaction.date}
              onChange={(e) => setAddTransaction({ ...addTransaction, date: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <input
              type="text"
              value={addTransaction.description}
              onChange={(e) => setAddTransaction({ ...addTransaction, description: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="Enter description"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleAddTransaction}
              disabled={!addTransaction.amount || !addTransaction.description.trim() || loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Transaction'}
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card p-0 overflow-hidden mt-4">
        <div className="overflow-x-auto overflow-y-auto max-h-[500px]" style={{ maxWidth: '100%' }}>
          <table className="min-w-full" style={{ tableLayout: 'auto', width: '100%' }}>
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Date & Time</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Reference</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Debit</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Credit</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Balance</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap hidden md:table-cell">Advance</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap hidden lg:table-cell">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pagedTransactions.map(t => (
                <tr key={t._id} className="hover:bg-gray-50">
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-800 whitespace-nowrap">{formatDateTime(t.date)}</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-800">{t.reference}</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-green-600">
                    {t.type === 'debit' ? `$${formatAmount(t.amount)}` : ''}
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-red-600">
                    {t.type === 'credit' ? `$${formatAmount(t.amount)}` : ''}
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-800 font-medium whitespace-nowrap">
                    {t.balance < 0 ? `-$${formatAmount(Math.abs(t.balance))}` : `$${formatAmount(t.balance)}`} <span className={t.balance > 0 ? 'text-red-600 font-bold' : t.balance < 0 ? 'text-green-600 font-bold' : 'text-gray-500'}>
                      ({t.balance > 0 ? 'Rec' : t.balance < 0 ? 'Pay' : 'Set'})
                    </span>
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-800 hidden md:table-cell">
                    {t.advance > 0 ? `$${formatAmount(t.advance)}` : '-'}
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 hidden lg:table-cell max-w-xs truncate">{t.remarks}</td>
                </tr>
              ))}

              {pagedTransactions.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500 text-sm" colSpan={7}>
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw size={16} className="animate-spin" />
                        Loading transactions...
                      </div>
                    ) : (
                      'No transactions found for this customer'
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {transactions.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-2 sm:p-4 border-t gap-2">
            <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-600">
              <span>
                Showing {pageSize === 'all' ? 1 : (page - 1) * (parseInt(pageSize) || 50) + 1} to {pageSize === 'all' ? transactions.length : Math.min(page * (parseInt(pageSize) || 50), transactions.length)} of {transactions.length} records
              </span>
              <div className="flex items-center gap-1">
                <label className="text-gray-500">Rows:</label>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(e.target.value); setPage(1); }}
                  className="border border-gray-300 rounded px-2 py-1 text-xs bg-white text-gray-700"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="all">All (Scrollable)</option>
                </select>
              </div>
            </div>

            {pageSize !== 'all' && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                <div className="text-sm text-gray-700">
                  Page {page} of {totalPages}
                </div>

                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>

                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Last
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-yellow-100 border border-yellow-200 text-yellow-800 rounded">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-yellow-800 hover:text-yellow-900">
              ×
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-xs text-gray-500 text-center">
        Report generated: {new Date().toLocaleString()} | Hudi POS System v1.0
      </div>
    </div>
  );
};

export default CustomerLedger;
