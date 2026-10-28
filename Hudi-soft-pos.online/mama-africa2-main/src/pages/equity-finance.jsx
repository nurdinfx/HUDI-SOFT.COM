// src/pages/equity-finance.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { realApi, equityFinanceAPI } from '../api/realApi';
import { useAuth } from '../contexts/AuthContext';
import {
  Landmark,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart,
  Scale,
  BookOpen,
  ArrowRightLeft,
  Users,
  Building2,
  PackageCheck,
  Download,
  Printer,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

// Currency formatter
const fmt = (num, curr = 'USD') => {
  const n = Number(num) || 0;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

export default function EquityFinance() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'accounts', 'equity', 'pnl', 'balancesheet', 'cashflow', 'ledger', 'receivables', 'payables', 'inventory'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState(null);

  // Date filters
  const [dateFilter, setDateFilter] = useState({
    preset: 'month',
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  // Data states
  const [dashboardData, setDashboardData] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [equityData, setEquityData] = useState(null);
  const [pnlData, setPnlData] = useState(null);
  const [balanceSheetData, setBalanceSheetData] = useState(null);
  const [cashFlowData, setCashFlowData] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [receivablesData, setReceivablesData] = useState(null);
  const [payablesData, setPayablesData] = useState(null);
  const [inventoryValData, setInventoryValData] = useState(null);

  // Modal states
  const [showCapitalModal, setShowCapitalModal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);

  // Form states
  const [capitalForm, setCapitalForm] = useState({
    ownerName: user?.name || 'Owner',
    amount: '',
    paymentMethod: 'cash',
    reference: '',
    description: 'Capital contribution into business'
  });

  const [withdrawalForm, setWithdrawalForm] = useState({
    ownerName: user?.name || 'Owner',
    amount: '',
    paymentMethod: 'cash',
    reference: '',
    description: 'Owner personal withdrawal'
  });

  const [transferForm, setTransferForm] = useState({
    fromAccount: '',
    toAccount: '',
    amount: '',
    reference: '',
    notes: 'Account transfer'
  });

  const [accountForm, setAccountForm] = useState({
    name: '',
    accountNumber: '',
    accountType: 'asset',
    subType: 'bank',
    institutionName: '',
    accountDetails: '',
    openingBalance: '0',
    description: ''
  });

  const [journalForm, setJournalForm] = useState({
    description: '',
    reference: '',
    date: new Date().toISOString().split('T')[0],
    lines: [
      { accountName: 'Cash on Hand', accountType: 'asset', debit: '', credit: '', description: '' },
      { accountName: 'Operating Expenses', accountType: 'expense', debit: '', credit: '', description: '' }
    ]
  });

  // Load Settings
  useEffect(() => {
    realApi.getSettings().then(res => {
      if (res?.success) setSettings(realApi.extractData(res));
    }).catch(() => {});
  }, []);

  // Preset Date Handlers
  const handlePresetChange = (preset) => {
    const now = new Date();
    let start, end = now.toISOString().split('T')[0];

    if (preset === 'today') {
      start = end;
    } else if (preset === 'week') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      start = d.toISOString().split('T')[0];
    } else if (preset === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    } else if (preset === 'year') {
      start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    } else {
      start = dateFilter.startDate;
    }

    setDateFilter({ preset, startDate: start, endDate: end });
  };

  // Main Loader
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { startDate: dateFilter.startDate, endDate: dateFilter.endDate };
      
      const [dashRes, accRes] = await Promise.all([
        equityFinanceAPI.getDashboard(params),
        equityFinanceAPI.getAccounts()
      ]);

      if (dashRes?.data?.success) setDashboardData(dashRes.data.data);
      if (accRes?.data?.success) setAccounts(accRes.data.data);

      // Lazy load tab specific data
      if (activeTab === 'equity') {
        const eqRes = await equityFinanceAPI.getEquity();
        if (eqRes?.data?.success) setEquityData(eqRes.data.data);
      } else if (activeTab === 'pnl') {
        const pnlRes = await equityFinanceAPI.getProfitAndLoss(params);
        if (pnlRes?.data?.success) setPnlData(pnlRes.data.data);
      } else if (activeTab === 'balancesheet') {
        const bsRes = await equityFinanceAPI.getBalanceSheet({ asOf: dateFilter.endDate });
        if (bsRes?.data?.success) setBalanceSheetData(bsRes.data.data);
      } else if (activeTab === 'cashflow') {
        const cfRes = await equityFinanceAPI.getCashFlow(params);
        if (cfRes?.data?.success) setCashFlowData(cfRes.data.data);
      } else if (activeTab === 'ledger') {
        const legRes = await equityFinanceAPI.getGeneralLedger(params);
        if (legRes?.data?.success) setLedgerData(legRes.data.data);
      } else if (activeTab === 'receivables') {
        const arRes = await equityFinanceAPI.getReceivables();
        if (arRes?.data?.success) setReceivablesData(arRes.data.data);
      } else if (activeTab === 'payables') {
        const apRes = await equityFinanceAPI.getPayables();
        if (apRes?.data?.success) setPayablesData(apRes.data.data);
      } else if (activeTab === 'inventory') {
        const invRes = await equityFinanceAPI.getInventoryValuation();
        if (invRes?.data?.success) setInventoryValData(invRes.data.data);
      }

    } catch (err) {
      console.error('Failed to load financial records:', err);
      toast.error('Failed to load financial records');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, dateFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Capital Contribution Submit
  const handleCapitalSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await equityFinanceAPI.recordContribution(capitalForm);
      if (res?.data?.success) {
        toast.success(res.data.message || 'Capital contribution recorded');
        setShowCapitalModal(false);
        setCapitalForm({ ownerName: user?.name || 'Owner', amount: '', paymentMethod: 'cash', reference: '', description: '' });
        loadData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record contribution');
    }
  };

  // Owner Withdrawal Submit
  const handleWithdrawalSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await equityFinanceAPI.recordWithdrawal(withdrawalForm);
      if (res?.data?.success) {
        toast.success(res.data.message || 'Owner withdrawal recorded');
        setShowWithdrawalModal(false);
        setWithdrawalForm({ ownerName: user?.name || 'Owner', amount: '', paymentMethod: 'cash', reference: '', description: '' });
        loadData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record withdrawal');
    }
  };

  // Transfer Submit
  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await equityFinanceAPI.transferFunds(transferForm);
      if (res?.data?.success) {
        toast.success(res.data.message || 'Funds transferred successfully');
        setShowTransferModal(false);
        setTransferForm({ fromAccount: '', toAccount: '', amount: '', reference: '', notes: '' });
        loadData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transfer failed');
    }
  };

  // Account Create Submit
  const handleAccountSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await equityFinanceAPI.createAccount(accountForm);
      if (res?.data?.success) {
        toast.success('Financial account created');
        setShowAccountModal(false);
        setAccountForm({ name: '', accountNumber: '', accountType: 'asset', subType: 'bank', institutionName: '', accountDetails: '', openingBalance: '0', description: '' });
        loadData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create account');
    }
  };

  // Journal Entry Submit
  const handleJournalSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await equityFinanceAPI.createJournalEntry(journalForm);
      if (res?.data?.success) {
        toast.success('Journal entry recorded');
        setShowJournalModal(false);
        loadData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create journal entry');
    }
  };

  // Export to CSV
  const handleExportCSV = (reportName, rows, headers) => {
    if (!rows || !rows.length) {
      toast.error('No data available to export');
      return;
    }
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(item => `"${(item || '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${reportName}_${dateFilter.startDate}_to_${dateFilter.endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`${reportName} exported to CSV`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* ── Top Header ───────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#1e4c82] to-[#153e6d] text-white p-6 shadow-md border-b border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <Landmark size={26} className="text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-white">Equity & Financial Management</h1>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                  QuickBooks Standard
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                Double-entry accounting, real-time cash flow, owner equity, assets & liabilities
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto">
            {/* Quick action buttons */}
            <button
              onClick={() => setShowCapitalModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition"
            >
              <ArrowUpRight size={15} />
              + Capital Injection
            </button>
            <button
              onClick={() => setShowWithdrawalModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow transition"
            >
              <ArrowDownLeft size={15} />
              - Owner Withdrawal
            </button>
            <button
              onClick={() => setShowTransferModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-bold rounded-xl border border-white/20 transition"
            >
              <ArrowRightLeft size={14} />
              Transfer Funds
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-blue-200 hover:text-white transition"
              title="Refresh Records"
            >
              <RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handlePrint}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-blue-200 hover:text-white transition"
              title="Print Financial Statement"
            >
              <Printer size={17} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-6 py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1 md:pb-0 scrollbar-none">
            {[
              { id: 'dashboard', label: 'Overview', icon: PieChart },
              { id: 'accounts', label: 'Cash & Banks', icon: Wallet },
              { id: 'equity', label: "Owner's Equity", icon: Landmark },
              { id: 'pnl', label: 'Profit & Loss', icon: TrendingUp },
              { id: 'balancesheet', label: 'Balance Sheet', icon: Scale },
              { id: 'cashflow', label: 'Cash Flow', icon: ArrowRightLeft },
              { id: 'ledger', label: 'General Ledger', icon: BookOpen },
              { id: 'receivables', label: 'Receivables (AR)', icon: Users },
              { id: 'payables', label: 'Payables (AP)', icon: Building2 },
              { id: 'inventory', label: 'Inventory Valuation', icon: PackageCheck }
            ].map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    active
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Date range controls */}
          <div className="flex items-center gap-2 self-stretch md:self-auto">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              {['today', 'week', 'month', 'year'].map(p => (
                <button
                  key={p}
                  onClick={() => handlePresetChange(p)}
                  className={`px-2.5 py-1 rounded-lg capitalize font-bold transition ${
                    dateFilter.preset === p ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <input
                type="date"
                value={dateFilter.startDate}
                onChange={(e) => setDateFilter(prev => ({ ...prev, preset: 'custom', startDate: e.target.value }))}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={dateFilter.endDate}
                onChange={(e) => setDateFilter(prev => ({ ...prev, preset: 'custom', endDate: e.target.value }))}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Tab Content ─────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 mt-6">
        {loading && !dashboardData ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-xs font-bold text-slate-500">Calculating real-time financial ledger...</p>
          </div>
        ) : (
          <>
            {/* 1. OVERVIEW DASHBOARD */}
            {activeTab === 'dashboard' && dashboardData && (
              <div className="space-y-6">
                {/* Executive Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Revenue Card */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider">Gross Sales Revenue</span>
                      <span className="p-2 bg-blue-50 text-blue-600 rounded-xl"><DollarSign size={16} /></span>
                    </div>
                    <div className="text-2xl font-black text-slate-900">{fmt(dashboardData.revenue?.sales)}</div>
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
                      <span className="font-semibold text-blue-700">{dashboardData.revenue?.orderCount || 0}</span> orders completed
                    </div>
                  </div>

                  {/* Gross Profit */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider">Gross Profit</span>
                      <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><TrendingUp size={16} /></span>
                    </div>
                    <div className="text-2xl font-black text-emerald-600">{fmt(dashboardData.profitability?.grossProfit)}</div>
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
                      Gross Margin: <strong className="text-emerald-700">{dashboardData.profitability?.grossProfitMargin}</strong>
                    </div>
                  </div>

                  {/* Net Operating Income */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider">Net Operating Profit</span>
                      <span className="p-2 bg-purple-50 text-purple-600 rounded-xl"><PieChart size={16} /></span>
                    </div>
                    <div className={`text-2xl font-black ${dashboardData.profitability?.netProfit >= 0 ? 'text-purple-700' : 'text-red-600'}`}>
                      {fmt(dashboardData.profitability?.netProfit)}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
                      Net Margin: <strong className="text-purple-700">{dashboardData.profitability?.netProfitMargin}</strong>
                    </div>
                  </div>

                  {/* Owner Equity */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider">Total Owner's Equity</span>
                      <span className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Landmark size={16} /></span>
                    </div>
                    <div className="text-2xl font-black text-amber-700">{fmt(dashboardData.equity?.totalEquity)}</div>
                    <div className="flex items-center gap-1 text-xs text-emerald-600 mt-2 font-bold">
                      <CheckCircle2 size={13} />
                      Self-Balancing Double Entry
                    </div>
                  </div>
                </div>

                {/* Secondary Row: Liquid Reserves & Balance Health */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Liquid Account Breakdown */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <Wallet size={16} className="text-blue-600" />
                        Liquid Accounts Breakdown
                      </h3>
                      <button
                        onClick={() => setActiveTab('accounts')}
                        className="text-xs text-blue-600 hover:underline font-bold"
                      >
                        Manage
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-lg bg-green-100 text-green-700 flex items-center justify-center font-bold text-xs">💵</span>
                          <div>
                            <div className="text-xs font-bold text-slate-800">Cash on Hand / Drawer</div>
                            <div className="text-[10px] text-slate-400">Registers & Petty Cash</div>
                          </div>
                        </div>
                        <span className="text-sm font-black text-slate-900">{fmt(dashboardData.liquidAccounts?.cashOnHand)}</span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">🏦</span>
                          <div>
                            <div className="text-xs font-bold text-slate-800">Bank Accounts</div>
                            <div className="text-[10px] text-slate-400">Premier Bank & Salaam</div>
                          </div>
                        </div>
                        <span className="text-sm font-black text-slate-900">{fmt(dashboardData.liquidAccounts?.bankAccounts)}</span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">📱</span>
                          <div>
                            <div className="text-xs font-bold text-slate-800">Mobile Money</div>
                            <div className="text-[10px] text-slate-400">EVC Plus, ZAAD, Sahal</div>
                          </div>
                        </div>
                        <span className="text-sm font-black text-slate-900">{fmt(dashboardData.liquidAccounts?.mobileMoney)}</span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-500">Total Liquid Reserves:</span>
                        <span className="font-black text-blue-700 text-base">{fmt(dashboardData.liquidAccounts?.totalLiquid)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Receivables vs Payables (Working Capital) */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <Scale size={16} className="text-amber-600" />
                        Receivables & Payables
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">Working Capital</span>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-orange-50/60 rounded-xl border border-orange-100">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[11px] font-bold text-orange-900 uppercase">Accounts Receivable (Customer Debts)</span>
                            <div className="text-xl font-black text-orange-700 mt-1">{fmt(dashboardData.receivablesAndPayables?.accountsReceivable)}</div>
                          </div>
                          <span className="text-xs font-bold bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">
                            {dashboardData.receivablesAndPayables?.creditCustomerCount} customers
                          </span>
                        </div>
                        <button
                          onClick={() => setActiveTab('receivables')}
                          className="mt-3 text-xs font-bold text-orange-800 hover:underline flex items-center gap-1"
                        >
                          View customer debts <ChevronRight size={13} />
                        </button>
                      </div>

                      <div className="p-4 bg-red-50/60 rounded-xl border border-red-100">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[11px] font-bold text-red-900 uppercase">Accounts Payable (Supplier Debts)</span>
                            <div className="text-xl font-black text-red-700 mt-1">{fmt(dashboardData.receivablesAndPayables?.accountsPayable)}</div>
                          </div>
                          <span className="text-xs font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                            {dashboardData.receivablesAndPayables?.unpaidPurchasesCount} bills
                          </span>
                        </div>
                        <button
                          onClick={() => setActiveTab('payables')}
                          className="mt-3 text-xs font-bold text-red-800 hover:underline flex items-center gap-1"
                        >
                          View supplier invoices <ChevronRight size={13} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Inventory Valuation & Assets */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                          <PackageCheck size={16} className="text-indigo-600" />
                          Inventory Valuation & Assets
                        </h3>
                        <button
                          onClick={() => setActiveTab('inventory')}
                          className="text-xs text-indigo-600 hover:underline font-bold"
                        >
                          Details
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-600">Stock Value at Cost:</span>
                          <span className="font-bold text-slate-900">{fmt(dashboardData.inventory?.inventoryValuation)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-600">Estimated Retail Value:</span>
                          <span className="font-bold text-slate-900">{fmt(dashboardData.inventory?.inventoryRetailValue)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-600">Potential Gross Profit:</span>
                          <span className="font-black text-emerald-600">{fmt(dashboardData.inventory?.unrealizedProfit)}</span>
                        </div>

                        <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-indigo-900">
                          <strong>QuickBooks Balance Sheet Equation:</strong>
                          <div className="mt-1 font-mono font-bold text-[11px]">
                            Assets ({fmt(dashboardData.balanceSheetSummary?.totalAssets)}) = Liabilities ({fmt(dashboardData.balanceSheetSummary?.totalLiabilities)}) + Equity ({fmt(dashboardData.balanceSheetSummary?.totalEquity)})
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">Accounting Equation:</span>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        ✓ Balanced
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recent Financial Audit Trail & Journal Entries */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <BookOpen size={16} className="text-blue-600" />
                      Recent General Ledger & Equity Audit Trail
                    </h3>
                    <button
                      onClick={() => setActiveTab('ledger')}
                      className="text-xs text-blue-600 hover:underline font-bold"
                    >
                      View All Journal Entries
                    </button>
                  </div>

                  {dashboardData.recentTransactions?.journals?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-y border-slate-200">
                          <tr>
                            <th className="py-2.5 px-4 font-bold">Entry #</th>
                            <th className="py-2.5 px-4 font-bold">Date</th>
                            <th className="py-2.5 px-4 font-bold">Source</th>
                            <th className="py-2.5 px-4 font-bold">Description</th>
                            <th className="py-2.5 px-4 font-bold text-right">Debit ($)</th>
                            <th className="py-2.5 px-4 font-bold text-right">Credit ($)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {dashboardData.recentTransactions.journals.map((entry) => (
                            <tr key={entry._id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-4 font-bold font-mono text-blue-700">{entry.entryNumber}</td>
                              <td className="py-2.5 px-4 text-slate-600">{formatDate(entry.date)}</td>
                              <td className="py-2.5 px-4">
                                <span className="capitalize px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                                  {entry.source?.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-slate-800">{entry.description}</td>
                              <td className="py-2.5 px-4 text-right font-bold text-slate-900">{fmt(entry.totalAmount)}</td>
                              <td className="py-2.5 px-4 text-right font-bold text-slate-900">{fmt(entry.totalAmount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-xs text-slate-400">
                      No journal entries recorded for this branch yet. Use "+ Capital Injection" or "Transfer Funds" above.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. CASH & BANKS / CHART OF ACCOUNTS */}
            {activeTab === 'accounts' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Chart of Accounts & Liquid Reserves</h2>
                    <p className="text-xs text-slate-500">Cash drawers, Premier Bank, Salaam Bank, and mobile money ledgers</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAccountModal(true)}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
                    >
                      <Plus size={15} /> Add Financial Account
                    </button>
                    <button
                      onClick={() => setShowTransferModal(true)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
                    >
                      <ArrowRightLeft size={15} /> Transfer Between Accounts
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {accounts.map(acc => (
                    <div key={acc._id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
                              #{acc.accountNumber}
                            </span>
                            <h3 className="text-sm font-black text-slate-900 mt-0.5">{acc.name}</h3>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                            acc.accountType === 'asset' ? 'bg-blue-100 text-blue-800' :
                            acc.accountType === 'liability' ? 'bg-red-100 text-red-800' :
                            acc.accountType === 'equity' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                          }`}>
                            {acc.subType?.replace('_', ' ')}
                          </span>
                        </div>

                        {acc.institutionName && (
                          <div className="text-xs text-slate-500 mt-1 font-medium">{acc.institutionName}</div>
                        )}
                        {acc.description && (
                          <p className="text-xs text-slate-400 mt-2 line-clamp-2">{acc.description}</p>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-end">
                        <span className="text-xs font-medium text-slate-500">Opening: {fmt(acc.openingBalance)}</span>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Balance</span>
                          <span className="text-lg font-black text-slate-900">{fmt(acc.balance || acc.openingBalance)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. OWNER'S EQUITY */}
            {activeTab === 'equity' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Owner's Equity & Capital Management</h2>
                    <p className="text-xs text-slate-500">Capital contributions, partner investments, and owner drawings/withdrawals</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCapitalModal(true)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
                    >
                      <Plus size={15} /> Record Capital Injection
                    </button>
                    <button
                      onClick={() => setShowWithdrawalModal(true)}
                      className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
                    >
                      <ArrowDownLeft size={15} /> Record Owner Drawing
                    </button>
                  </div>
                </div>

                {/* Equity KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-500 uppercase">Total Capital Contributions</span>
                    <div className="text-2xl font-black text-emerald-600 mt-1">{fmt(equityData?.totalContributions)}</div>
                    <p className="text-[11px] text-slate-400 mt-1">Direct cash or bank investments by owner</p>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-500 uppercase">Total Owner Withdrawals (Drawings)</span>
                    <div className="text-2xl font-black text-amber-600 mt-1">{fmt(equityData?.totalWithdrawals)}</div>
                    <p className="text-[11px] text-slate-400 mt-1">Funds extracted for personal use</p>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-500 uppercase">Net Owner Capital</span>
                    <div className="text-2xl font-black text-blue-700 mt-1">{fmt(equityData?.netCapital)}</div>
                    <p className="text-[11px] text-slate-400 mt-1">Contributed capital minus drawings</p>
                  </div>
                </div>

                {/* Equity Transactions Table */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-xs font-black uppercase text-slate-700">Equity Transactions History</h3>
                    <button
                      onClick={() => handleExportCSV('Equity_Transactions', equityData?.transactions?.map(t => [t.transactionNumber, formatDate(t.date), t.type, t.ownerName, t.amount, t.description]) || [], ['Tx Number', 'Date', 'Type', 'Owner', 'Amount', 'Description'])}
                      className="text-xs text-blue-600 hover:underline font-bold flex items-center gap-1"
                    >
                      <Download size={13} /> Export CSV
                    </button>
                  </div>

                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Tx #</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Owner Name</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Method</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4 text-right">Amount ($)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {equityData?.transactions?.length > 0 ? (
                        equityData.transactions.map(t => (
                          <tr key={t._id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-mono font-bold text-blue-700">{t.transactionNumber}</td>
                            <td className="py-3 px-4 text-slate-600">{formatDate(t.date)}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">{t.ownerName}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                t.type === 'capital_contribution' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {t.type === 'capital_contribution' ? 'Capital Injection' : 'Owner Withdrawal'}
                              </span>
                            </td>
                            <td className="py-3 px-4 capitalize text-slate-600">{t.paymentMethod}</td>
                            <td className="py-3 px-4 text-slate-700">{t.description || '-'}</td>
                            <td className={`py-3 px-4 text-right font-black ${t.type === 'capital_contribution' ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {t.type === 'capital_contribution' ? '+' : '-'}{fmt(t.amount)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="py-8 text-center text-slate-400">No equity transactions recorded yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. PROFIT & LOSS (INCOME STATEMENT) */}
            {activeTab === 'pnl' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs max-w-4xl mx-auto">
                <div className="flex justify-between items-start border-b border-slate-200 pb-5">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">Profit and Loss Statement</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Period: {formatDate(dateFilter.startDate)} — {formatDate(dateFilter.endDate)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExportCSV('Profit_and_Loss', [
                        ['Gross Revenue', pnlData?.revenue?.totalRevenue],
                        ['COGS', pnlData?.costOfGoodsSold?.totalCogs],
                        ['Gross Profit', pnlData?.grossProfit],
                        ['Operating Expenses', pnlData?.expenses?.totalExpenses],
                        ['Net Income', pnlData?.netIncome]
                      ], ['Line Item', 'Amount'])}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5"
                    >
                      <Download size={14} /> Export CSV
                    </button>
                    <button onClick={handlePrint} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5">
                      <Printer size={14} /> Print
                    </button>
                  </div>
                </div>

                <div className="mt-6 space-y-6 text-sm">
                  {/* Revenue Section */}
                  <div>
                    <div className="flex justify-between items-center py-2 font-black text-slate-900 border-b border-slate-200 text-xs uppercase tracking-wider">
                      <span>1. Operating Revenue</span>
                      <span>Amount</span>
                    </div>
                    {pnlData?.revenue?.breakdown?.map(item => (
                      <div key={item.category} className="flex justify-between items-center py-2 text-xs text-slate-600 pl-4 border-b border-slate-50">
                        <span>{item.category} ({item.quantity} units sold)</span>
                        <span className="font-semibold text-slate-800">{fmt(item.revenue)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center py-2.5 font-bold text-slate-900 pl-2 bg-slate-50 rounded-lg mt-1 text-xs">
                      <span>Total Revenue</span>
                      <span className="text-blue-700 font-black">{fmt(pnlData?.revenue?.totalRevenue)}</span>
                    </div>
                  </div>

                  {/* COGS Section */}
                  <div>
                    <div className="flex justify-between items-center py-2 font-black text-slate-900 border-b border-slate-200 text-xs uppercase tracking-wider">
                      <span>2. Cost of Goods Sold (COGS)</span>
                      <span>Amount</span>
                    </div>
                    <div className="flex justify-between items-center py-2 text-xs text-slate-600 pl-4">
                      <span>Inventory Product Cost (Direct sold items)</span>
                      <span className="font-semibold text-slate-800">{fmt(pnlData?.costOfGoodsSold?.totalCogs)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2.5 font-bold text-slate-900 pl-2 bg-slate-50 rounded-lg text-xs">
                      <span>Gross Profit ({pnlData?.grossMarginPercent} Margin)</span>
                      <span className="text-emerald-700 font-black">{fmt(pnlData?.grossProfit)}</span>
                    </div>
                  </div>

                  {/* Expenses Section */}
                  <div>
                    <div className="flex justify-between items-center py-2 font-black text-slate-900 border-b border-slate-200 text-xs uppercase tracking-wider">
                      <span>3. Operating Expenses</span>
                      <span>Amount</span>
                    </div>
                    {pnlData?.expenses?.breakdown?.map(e => (
                      <div key={e.category} className="flex justify-between items-center py-2 text-xs text-slate-600 pl-4 border-b border-slate-50">
                        <span>{e.category}</span>
                        <span className="font-semibold text-slate-800">{fmt(e.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center py-2.5 font-bold text-slate-900 pl-2 bg-slate-50 rounded-lg mt-1 text-xs">
                      <span>Total Operating Expenses</span>
                      <span className="text-red-700 font-black">{fmt(pnlData?.expenses?.totalExpenses)}</span>
                    </div>
                  </div>

                  {/* Net Profit / Loss */}
                  <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 flex justify-between items-center">
                    <div>
                      <span className="text-xs uppercase font-black text-blue-900">Net Profit / Net Income</span>
                      <div className="text-[11px] text-blue-700">Net Profit Margin: {pnlData?.netProfitMargin}</div>
                    </div>
                    <span className={`text-2xl font-black ${pnlData?.netIncome >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {fmt(pnlData?.netIncome)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 5. BALANCE SHEET */}
            {activeTab === 'balancesheet' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs max-w-4xl mx-auto">
                <div className="flex justify-between items-start border-b border-slate-200 pb-5">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">Balance Sheet</h2>
                    <p className="text-xs text-slate-500 mt-1">As of: {formatDate(balanceSheetData?.asOfDate)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-black rounded-lg border border-emerald-300">
                      ✓ Balanced (A = L + E)
                    </span>
                    <button onClick={handlePrint} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5">
                      <Printer size={14} /> Print
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                  {/* Left: Assets */}
                  <div className="space-y-4">
                    <div className="border-b-2 border-blue-600 pb-1">
                      <h3 className="text-sm font-black uppercase text-blue-800">ASSETS</h3>
                    </div>

                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Assets</div>
                    <div className="space-y-2 pl-2 text-xs">
                      <div className="flex justify-between text-slate-700">
                        <span>Cash on Hand / Registers</span>
                        <span className="font-bold">{fmt(balanceSheetData?.assets?.currentAssets?.cashOnHand)}</span>
                      </div>
                      <div className="flex justify-between text-slate-700">
                        <span>Bank Accounts (Premier & Salaam)</span>
                        <span className="font-bold">{fmt(balanceSheetData?.assets?.currentAssets?.bankAccounts)}</span>
                      </div>
                      <div className="flex justify-between text-slate-700">
                        <span>Mobile Money Accounts (EVC / Zaad)</span>
                        <span className="font-bold">{fmt(balanceSheetData?.assets?.currentAssets?.mobileMoney)}</span>
                      </div>
                      <div className="flex justify-between text-slate-700">
                        <span>Accounts Receivable (Customer Debts)</span>
                        <span className="font-bold">{fmt(balanceSheetData?.assets?.currentAssets?.accountsReceivable)}</span>
                      </div>
                      <div className="flex justify-between text-slate-700">
                        <span>Inventory Stock Valuation</span>
                        <span className="font-bold">{fmt(balanceSheetData?.assets?.currentAssets?.inventoryValuation)}</span>
                      </div>
                    </div>

                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider pt-2">Non-Current Assets</div>
                    <div className="space-y-2 pl-2 text-xs">
                      <div className="flex justify-between text-slate-700">
                        <span>POS Terminals, Hardware & Furniture</span>
                        <span className="font-bold">{fmt(balanceSheetData?.assets?.nonCurrentAssets?.equipmentAndFurniture)}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex justify-between font-black text-blue-900 text-sm">
                      <span>TOTAL ASSETS</span>
                      <span>{fmt(balanceSheetData?.assets?.totalAssets)}</span>
                    </div>
                  </div>

                  {/* Right: Liabilities & Equity */}
                  <div className="space-y-4">
                    <div className="border-b-2 border-amber-600 pb-1">
                      <h3 className="text-sm font-black uppercase text-amber-800">LIABILITIES & EQUITY</h3>
                    </div>

                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Liabilities</div>
                    <div className="space-y-2 pl-2 text-xs">
                      <div className="flex justify-between text-slate-700">
                        <span>Accounts Payable (Supplier Bills)</span>
                        <span className="font-bold">{fmt(balanceSheetData?.liabilities?.currentLiabilities?.accountsPayable)}</span>
                      </div>
                      <div className="flex justify-between text-slate-700">
                        <span>Other Accrued Liabilities</span>
                        <span className="font-bold">{fmt(balanceSheetData?.liabilities?.currentLiabilities?.otherLiabilities)}</span>
                      </div>
                    </div>

                    <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg text-xs font-bold text-slate-800">
                      <span>Total Liabilities</span>
                      <span>{fmt(balanceSheetData?.liabilities?.totalLiabilities)}</span>
                    </div>

                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider pt-2">Owner's Equity</div>
                    <div className="space-y-2 pl-2 text-xs">
                      <div className="flex justify-between text-slate-700">
                        <span>Owner Capital Contributed</span>
                        <span className="font-bold">{fmt(balanceSheetData?.equity?.ownerCapitalContributed)}</span>
                      </div>
                      <div className="flex justify-between text-slate-700">
                        <span>Less: Owner Personal Withdrawals</span>
                        <span className="font-bold text-amber-700">({fmt(balanceSheetData?.equity?.lessOwnerWithdrawals)})</span>
                      </div>
                      <div className="flex justify-between text-slate-700">
                        <span>Retained Earnings & Accumulated Profit</span>
                        <span className="font-bold">{fmt(balanceSheetData?.equity?.retainedEarningsAndProfit)}</span>
                      </div>
                    </div>

                    <div className="flex justify-between p-2.5 bg-amber-50 rounded-lg text-xs font-bold text-amber-900">
                      <span>Total Owner's Equity</span>
                      <span>{fmt(balanceSheetData?.equity?.totalEquity)}</span>
                    </div>

                    <div className="p-3 bg-slate-900 text-white rounded-xl flex justify-between font-black text-sm">
                      <span>TOTAL LIABILITIES & EQUITY</span>
                      <span>{fmt(balanceSheetData?.verification?.totalLiabilitiesAndEquity)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 6. CASH FLOW STATEMENT */}
            {activeTab === 'cashflow' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs max-w-4xl mx-auto">
                <div className="flex justify-between items-start border-b border-slate-200 pb-5">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">Statement of Cash Flows</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Period: {formatDate(dateFilter.startDate)} — {formatDate(dateFilter.endDate)}
                    </p>
                  </div>
                  <button onClick={handlePrint} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5">
                    <Printer size={14} /> Print Statement
                  </button>
                </div>

                <div className="mt-6 space-y-6 text-xs">
                  {/* Operating Cash Flow */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="font-black text-sm text-slate-900">1. Cash Flows from Operating Activities</div>
                    {cashFlowData?.operatingActivities?.inflows?.map((inf, i) => (
                      <div key={i} className="flex justify-between pl-4 text-emerald-700 font-semibold">
                        <span>{inf.description}</span>
                        <span>+{fmt(inf.amount)}</span>
                      </div>
                    ))}
                    {cashFlowData?.operatingActivities?.outflows?.map((outf, i) => (
                      <div key={i} className="flex justify-between pl-4 text-red-700 font-semibold">
                        <span>{outf.description}</span>
                        <span>{fmt(outf.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900">
                      <span>Net Cash from Operating Activities</span>
                      <span>{fmt(cashFlowData?.operatingActivities?.netCashFlow)}</span>
                    </div>
                  </div>

                  {/* Financing Cash Flow */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="font-black text-sm text-slate-900">2. Cash Flows from Financing Activities</div>
                    {cashFlowData?.financingActivities?.inflows?.map((inf, i) => (
                      <div key={i} className="flex justify-between pl-4 text-emerald-700 font-semibold">
                        <span>{inf.description}</span>
                        <span>+{fmt(inf.amount)}</span>
                      </div>
                    ))}
                    {cashFlowData?.financingActivities?.outflows?.map((outf, i) => (
                      <div key={i} className="flex justify-between pl-4 text-amber-700 font-semibold">
                        <span>{outf.description}</span>
                        <span>{fmt(outf.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900">
                      <span>Net Cash from Financing Activities</span>
                      <span>{fmt(cashFlowData?.financingActivities?.netCashFlow)}</span>
                    </div>
                  </div>

                  {/* Net Change */}
                  <div className="p-5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl flex justify-between items-center text-sm font-black shadow-md">
                    <span>NET CHANGE IN CASH & LIQUID BALANCES</span>
                    <span className="text-xl">{fmt(cashFlowData?.summary?.netChangeInCash)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 7. GENERAL LEDGER */}
            {activeTab === 'ledger' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">General Ledger & Double-Entry Accounting</h2>
                    <p className="text-xs text-slate-500">Every financial transaction with balanced debit and credit entries</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowJournalModal(true)}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
                    >
                      <Plus size={15} /> New Journal Entry
                    </button>
                    <button
                      onClick={() => handleExportCSV('General_Ledger', ledgerData?.entries?.map(e => [e.entryNumber, formatDate(e.date), e.source, e.description, e.totalAmount]) || [], ['Entry #', 'Date', 'Source', 'Description', 'Total Amount'])}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5"
                    >
                      <Download size={14} /> Export CSV
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Entry #</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Source</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4">Accounts & Lines</th>
                        <th className="py-3 px-4 text-right">Debit ($)</th>
                        <th className="py-3 px-4 text-right">Credit ($)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ledgerData?.entries?.length > 0 ? (
                        ledgerData.entries.map(entry => (
                          <tr key={entry._id} className="hover:bg-slate-50/80">
                            <td className="py-3 px-4 font-mono font-bold text-blue-700 align-top">{entry.entryNumber}</td>
                            <td className="py-3 px-4 text-slate-600 align-top">{formatDate(entry.date)}</td>
                            <td className="py-3 px-4 align-top">
                              <span className="capitalize px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                                {entry.source?.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-800 font-medium align-top">{entry.description}</td>
                            <td className="py-3 px-4">
                              <div className="space-y-1">
                                {entry.lines?.map((line, idx) => (
                                  <div key={idx} className="flex justify-between items-center text-[11px] text-slate-600">
                                    <span className={line.credit > 0 ? 'pl-3 italic text-slate-500' : 'font-semibold text-slate-800'}>
                                      {line.accountName}
                                    </span>
                                    <span className="font-mono text-slate-700">
                                      {line.debit > 0 ? `DR: ${fmt(line.debit)}` : `CR: ${fmt(line.credit)}`}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-black text-slate-900 align-top">{fmt(entry.totalAmount)}</td>
                            <td className="py-3 px-4 text-right font-black text-slate-900 align-top">{fmt(entry.totalAmount)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="py-8 text-center text-slate-400">No journal entries found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 8. ACCOUNTS RECEIVABLE (CUSTOMER DEBTS) */}
            {activeTab === 'receivables' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Accounts Receivable (Customer Debts)</h2>
                    <p className="text-xs text-slate-500">Uncollected customer credit sales and aging analysis</p>
                  </div>
                  <button
                    onClick={() => handleExportCSV('Accounts_Receivable', receivablesData?.customers?.map(c => [c.name, c.phone, c.creditLimit, c.creditUsed, formatDate(c.lastActivity)]) || [], ['Customer', 'Phone', 'Limit', 'Debt Owed', 'Last Activity'])}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    <Download size={14} /> Export CSV
                  </button>
                </div>

                {/* Aging Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Total Receivables</span>
                    <div className="text-xl font-black text-slate-900 mt-1">{fmt(receivablesData?.totalReceivables)}</div>
                    <span className="text-[10px] text-slate-500">{receivablesData?.customerCount || 0} customers with debt</span>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase">Current (0 - 30 Days)</span>
                    <div className="text-xl font-black text-emerald-700 mt-1">{fmt(receivablesData?.agingSummary?.current0To30)}</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20">
                    <span className="text-[10px] font-bold text-amber-700 uppercase">Overdue (31 - 60 Days)</span>
                    <div className="text-xl font-black text-amber-700 mt-1">{fmt(receivablesData?.agingSummary?.overdue31To60)}</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-red-200 bg-red-50/20">
                    <span className="text-[10px] font-bold text-red-700 uppercase">Critical (60+ Days Overdue)</span>
                    <div className="text-xl font-black text-red-700 mt-1">{fmt(receivablesData?.agingSummary?.overdue60Plus)}</div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Customer Name</th>
                        <th className="py-3 px-4">Phone</th>
                        <th className="py-3 px-4">Credit Limit</th>
                        <th className="py-3 px-4">Outstanding Debt</th>
                        <th className="py-3 px-4">Last Payment / Activity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {receivablesData?.customers?.length > 0 ? (
                        receivablesData.customers.map(c => (
                          <tr key={c._id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                            <td className="py-3 px-4 text-slate-600">{c.phone || 'N/A'}</td>
                            <td className="py-3 px-4 text-slate-500">{fmt(c.creditLimit)}</td>
                            <td className="py-3 px-4 font-black text-orange-600">{fmt(c.creditUsed)}</td>
                            <td className="py-3 px-4 text-slate-600">{formatDate(c.lastActivity)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="py-8 text-center text-slate-400">No customer debts recorded.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 9. ACCOUNTS PAYABLE (SUPPLIER DEBTS) */}
            {activeTab === 'payables' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Accounts Payable (Supplier Debts)</h2>
                    <p className="text-xs text-slate-500">Unpaid supplier purchases and pending invoices</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 uppercase font-bold block">Total Payable</span>
                    <span className="text-xl font-black text-red-600">{fmt(payablesData?.totalPayables)}</span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Purchase #</th>
                        <th className="py-3 px-4">Supplier</th>
                        <th className="py-3 px-4">Supplier Phone</th>
                        <th className="py-3 px-4">Invoice Date</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Amount Due ($)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payablesData?.purchases?.length > 0 ? (
                        payablesData.purchases.map(p => (
                          <tr key={p._id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-mono font-bold text-blue-700">{p.purchaseNumber}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">{p.supplierName}</td>
                            <td className="py-3 px-4 text-slate-600">{p.supplierPhone || 'N/A'}</td>
                            <td className="py-3 px-4 text-slate-600">{formatDate(p.date)}</td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-bold text-[10px] uppercase">
                                Unpaid Credit
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-black text-red-600">{fmt(p.amount)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-slate-400">No unpaid supplier bills pending.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 10. INVENTORY ASSET VALUATION */}
            {activeTab === 'inventory' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Inventory Valuation & COGS Breakdown</h2>
                    <p className="text-xs text-slate-500">Asset value at cost vs potential retail revenue</p>
                  </div>
                  <button
                    onClick={() => handleExportCSV('Inventory_Valuation', inventoryValData?.items?.map(i => [i.name, i.category, i.sku, i.stock, i.unitCost, i.unitPrice, i.assetValue, i.retailValue, i.potentialProfit]) || [], ['Product', 'Category', 'SKU', 'Stock', 'Unit Cost', 'Price', 'Asset Cost Value', 'Retail Value', 'Potential Profit'])}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    <Download size={14} /> Export CSV
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-500 uppercase">Total Inventory Asset Cost</span>
                    <div className="text-2xl font-black text-blue-700 mt-1">{fmt(inventoryValData?.totalAssetCost)}</div>
                    <span className="text-[11px] text-slate-400">Recorded on Balance Sheet</span>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-500 uppercase">Expected Retail Value</span>
                    <div className="text-2xl font-black text-slate-900 mt-1">{fmt(inventoryValData?.totalRetailValue)}</div>
                    <span className="text-[11px] text-slate-400">Total selling value of stock</span>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-500 uppercase">Potential Unrealized Profit</span>
                    <div className="text-2xl font-black text-emerald-600 mt-1">{fmt(inventoryValData?.potentialProfit)}</div>
                    <span className="text-[11px] text-slate-400">Retail Value minus Cost</span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Product Name</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Stock Units</th>
                        <th className="py-3 px-4">Unit Cost</th>
                        <th className="py-3 px-4">Selling Price</th>
                        <th className="py-3 px-4">Asset Value (Cost)</th>
                        <th className="py-3 px-4 text-right">Potential Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {inventoryValData?.items?.map(item => (
                        <tr key={item._id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {item.name}
                            {item.isLowStock && (
                              <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                                LOW STOCK
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600">{item.category}</td>
                          <td className="py-3 px-4 font-bold">{item.stock}</td>
                          <td className="py-3 px-4 text-slate-600">{fmt(item.unitCost)}</td>
                          <td className="py-3 px-4 text-slate-600">{fmt(item.unitPrice)}</td>
                          <td className="py-3 px-4 font-bold text-blue-700">{fmt(item.assetValue)}</td>
                          <td className="py-3 px-4 text-right font-black text-emerald-600">+{fmt(item.potentialProfit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── MODALS ───────────────────────────────────────────────────────────── */}

      {/* 1. Capital Injection Modal */}
      {showCapitalModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 mb-1 flex items-center gap-2">
              <ArrowUpRight className="text-emerald-600" /> Record Owner Capital Injection
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Credits Owner's Capital in Equity and Debits Cash/Bank in Assets.
            </p>
            <form onSubmit={handleCapitalSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Owner Name *</label>
                <input
                  type="text"
                  required
                  value={capitalForm.ownerName}
                  onChange={e => setCapitalForm({ ...capitalForm, ownerName: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Contribution Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={capitalForm.amount}
                  onChange={e => setCapitalForm({ ...capitalForm, amount: e.target.value })}
                  placeholder="5000.00"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base font-bold text-emerald-700"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={capitalForm.paymentMethod}
                  onChange={e => setCapitalForm({ ...capitalForm, paymentMethod: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-medium"
                >
                  <option value="cash">Cash on Hand</option>
                  <option value="bank">Premier / Salaam Bank Transfer</option>
                  <option value="mobile_money">EVC Plus / Telesom ZAAD</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Reference / Slip #</label>
                <input
                  type="text"
                  value={capitalForm.reference}
                  onChange={e => setCapitalForm({ ...capitalForm, reference: e.target.value })}
                  placeholder="e.g. Wire-9821 or Cash Deposit"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes / Description</label>
                <textarea
                  value={capitalForm.description}
                  onChange={e => setCapitalForm({ ...capitalForm, description: e.target.value })}
                  rows="2"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCapitalModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow"
                >
                  Save Contribution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Owner Withdrawal Modal */}
      {showWithdrawalModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 mb-1 flex items-center gap-2">
              <ArrowDownLeft className="text-amber-600" /> Record Owner Personal Withdrawal
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Debits Owner Drawings (reduces Equity) and Credits Cash/Bank in Assets.
            </p>
            <form onSubmit={handleWithdrawalSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Owner Name *</label>
                <input
                  type="text"
                  required
                  value={withdrawalForm.ownerName}
                  onChange={e => setWithdrawalForm({ ...withdrawalForm, ownerName: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Withdrawal Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={withdrawalForm.amount}
                  onChange={e => setWithdrawalForm({ ...withdrawalForm, amount: e.target.value })}
                  placeholder="500.00"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base font-bold text-amber-700"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Disbursed From</label>
                <select
                  value={withdrawalForm.paymentMethod}
                  onChange={e => setWithdrawalForm({ ...withdrawalForm, paymentMethod: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-medium"
                >
                  <option value="cash">Cash Register Drawer</option>
                  <option value="bank">Premier Bank Checking</option>
                  <option value="mobile_money">EVC Plus Account</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Reference</label>
                <input
                  type="text"
                  value={withdrawalForm.reference}
                  onChange={e => setWithdrawalForm({ ...withdrawalForm, reference: e.target.value })}
                  placeholder="e.g. Personal draw #4"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowWithdrawalModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow"
                >
                  Record Withdrawal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Account Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 mb-1 flex items-center gap-2">
              <ArrowRightLeft className="text-blue-600" /> Transfer Funds Between Accounts
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Transfer funds between Cash Drawer, Bank Accounts, and Mobile Money.
            </p>
            <form onSubmit={handleTransferSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">From Account *</label>
                <select
                  required
                  value={transferForm.fromAccount}
                  onChange={e => setTransferForm({ ...transferForm, fromAccount: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-medium"
                >
                  <option value="">Select source account...</option>
                  {accounts.map(a => (
                    <option key={a._id} value={a._id}>
                      {a.name} ({fmt(a.balance)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">To Account *</label>
                <select
                  required
                  value={transferForm.toAccount}
                  onChange={e => setTransferForm({ ...transferForm, toAccount: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-medium"
                >
                  <option value="">Select destination account...</option>
                  {accounts.map(a => (
                    <option key={a._id} value={a._id}>
                      {a.name} ({fmt(a.balance)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Transfer Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={transferForm.amount}
                  onChange={e => setTransferForm({ ...transferForm, amount: e.target.value })}
                  placeholder="1000.00"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base font-bold text-blue-700"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes / Slip #</label>
                <input
                  type="text"
                  value={transferForm.notes}
                  onChange={e => setTransferForm({ ...transferForm, notes: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow"
                >
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Add Financial Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 mb-1 flex items-center gap-2">
              <Plus className="text-blue-600" /> Add Financial Account
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Add a bank account, mobile money merchant account, or asset.
            </p>
            <form onSubmit={handleAccountSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Account Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dahabshiil Bank Commercial"
                  value={accountForm.name}
                  onChange={e => setAccountForm({ ...accountForm, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Account # *</label>
                  <input
                    type="text"
                    required
                    placeholder="1040"
                    value={accountForm.accountNumber}
                    onChange={e => setAccountForm({ ...accountForm, accountNumber: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sub-type</label>
                  <select
                    value={accountForm.subType}
                    onChange={e => setAccountForm({ ...accountForm, subType: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-medium"
                  >
                    <option value="bank">Bank Account</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="cash">Cash Account</option>
                    <option value="fixed_asset">Fixed Asset</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Institution Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dahabshiil Bank, Hormuud"
                  value={accountForm.institutionName}
                  onChange={e => setAccountForm({ ...accountForm, institutionName: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Opening Balance ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={accountForm.openingBalance}
                  onChange={e => setAccountForm({ ...accountForm, openingBalance: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Manual Journal Entry Modal */}
      {showJournalModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 mb-1 flex items-center gap-2">
              <BookOpen className="text-blue-600" /> New Double-Entry Journal Entry
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Total debits must strictly equal total credits.
            </p>
            <form onSubmit={handleJournalSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Month-end equipment depreciation adjustment"
                  value={journalForm.description}
                  onChange={e => setJournalForm({ ...journalForm, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50">
                <div className="flex justify-between font-bold text-slate-600 text-[11px]">
                  <span>Account Line</span>
                  <span>Debit ($)</span>
                  <span>Credit ($)</span>
                </div>
                {journalForm.lines.map((line, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      required
                      placeholder="Account Name"
                      value={line.accountName}
                      onChange={e => {
                        const newLines = [...journalForm.lines];
                        newLines[idx].accountName = e.target.value;
                        setJournalForm({ ...journalForm, lines: newLines });
                      }}
                      className="flex-1 border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs"
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Debit"
                      value={line.debit}
                      onChange={e => {
                        const newLines = [...journalForm.lines];
                        newLines[idx].debit = e.target.value;
                        if (e.target.value) newLines[idx].credit = '';
                        setJournalForm({ ...journalForm, lines: newLines });
                      }}
                      className="w-24 border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-xs text-right font-bold"
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Credit"
                      value={line.credit}
                      onChange={e => {
                        const newLines = [...journalForm.lines];
                        newLines[idx].credit = e.target.value;
                        if (e.target.value) newLines[idx].debit = '';
                        setJournalForm({ ...journalForm, lines: newLines });
                      }}
                      className="w-24 border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-xs text-right font-bold"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowJournalModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow"
                >
                  Save Journal Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
