// src/pages/Finance.jsx — Fully responsive finance dashboard
import React, { useState, useEffect, useCallback } from 'react';
import { realApi } from '../api/realApi';
import { Link } from 'react-router-dom';
import ReceiptSettingsModal from '../components/Settings/ReceiptSettingsModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtCurrency = (amount, currency = 'USD') => {
  const n = Number(amount) || 0;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
};

const fmtDate = (d) => {
  if (!d) return 'N/A';
  try {
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
  } catch { return 'N/A'; }
};

const fmtDateTime = (d) => {
  if (!d) return 'N/A';
  try {
    return new Date(d).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return 'N/A'; }
};

const SOURCE_LABELS = {
  order:    { label: 'Sale',     bg: '#dcfce7', color: '#15803d', icon: '🛒' },
  purchase: { label: 'Purchase', bg: '#fee2e2', color: '#dc2626', icon: '📦' },
  expense:  { label: 'Expense',  bg: '#fef9c3', color: '#a16207', icon: '💸' },
  manual:   { label: 'Manual',   bg: '#e0e7ff', color: '#3730a3', icon: '✏️'  }
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, sub, color, icon, loading }) => (
  <div style={{
    background: '#fff', borderRadius: 14, padding: '18px 16px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.07)', borderTop: `4px solid ${color}`,
    minWidth: 0, flex: '1 1 160px'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ margin: 0, fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{title}</p>
        {loading
          ? <div style={{ marginTop: 8, height: 28, width: '80%', background: '#f1f5f9', borderRadius: 8 }} />
          : <p style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 900, color, letterSpacing: '-0.02em', wordBreak: 'break-word' }}>{value}</p>
        }
        {sub && !loading && <p style={{ margin: '3px 0 0', fontSize: 11, color: '#94a3b8' }}>{sub}</p>}
      </div>
      <span style={{ fontSize: 22, marginLeft: 8, flexShrink: 0 }}>{icon}</span>
    </div>
  </div>
);

// ─── Main Finance Page ────────────────────────────────────────────────────────
const Finance = () => {
  const [filters, setFilters] = useState({ from: '', to: '', type: '', search: '' });
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, netBalance: 0 });
  const [dashStats, setDashStats] = useState({ todaySales: 0, todayOrders: 0, monthSales: 0, totalPurchase: 0, totalExpenses: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showReceiptSettings, setShowReceiptSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [newTx, setNewTx] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'expense', category: 'General', amount: '',
    paymentMethod: 'cash', description: '', reference: ''
  });

  const currency = settings?.currency || 'USD';

  useEffect(() => {
    realApi.getSettings().then(r => {
      if (r?.success) setSettings(realApi.extractData(r));
    }).catch(() => {});
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      const r = await realApi.getFinanceDashboard();
      if (r?.success) {
        const d = r.data || {};
        setDashStats({
          todaySales:    d.todaySales    || 0,
          todayOrders:   d.todayOrders   || 0,
          monthSales:    d.monthSales    || 0,
          totalPurchase: d.totalPurchase || 0,
          totalExpenses: d.totalExpenses || 0
        });
      }
    } catch (_) {}
  }, []);

  const loadTransactions = useCallback(async (currentPage = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page: currentPage, limit: 50,
        ...(filters.type && { type: filters.type }),
        ...(filters.from && { startDate: filters.from }),
        ...(filters.to   && { endDate: filters.to })
      };
      const r = await realApi.getTransactions(params);
      if (r?.success) {
        const d = r.data || {};
        let txList = Array.isArray(d.transactions) ? d.transactions : [];
        if (filters.search) {
          const q = filters.search.toLowerCase();
          txList = txList.filter(t =>
            (t.description || '').toLowerCase().includes(q) ||
            (t.reference   || '').toLowerCase().includes(q) ||
            (t.source      || '').toLowerCase().includes(q)
          );
        }
        setTransactions(txList);
        setTotal(d.total || txList.length);
        setTotalPages(d.totalPages || 1);
        setSummary({
          totalIncome:  d.totalIncome  ?? txList.filter(t => t.type === 'income') .reduce((s, t) => s + (t.amount || 0), 0),
          totalExpense: d.totalExpense ?? txList.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0),
          netBalance:   d.netBalance   ?? ((d.totalIncome || 0) - (d.totalExpense || 0))
        });
      } else {
        setError(r?.message || 'Failed to load transactions');
      }
    } catch (e) {
      setError(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  useEffect(() => { setPage(1); loadTransactions(1); }, [loadTransactions]);

  const handlePageChange = (p) => { setPage(p); loadTransactions(p); };

  const saveTransaction = async () => {
    if (!newTx.amount || !newTx.description) { setError('Amount and description are required'); return; }
    setSaving(true); setError('');
    try {
      const r = await realApi.createTransaction({ ...newTx, amount: parseFloat(newTx.amount), date: new Date(newTx.date) });
      if (!r?.success) throw new Error(r?.message || 'Failed to save');
      setShowModal(false);
      setNewTx({ date: new Date().toISOString().split('T')[0], type: 'expense', category: 'General', amount: '', paymentMethod: 'cash', description: '', reference: '' });
      await Promise.all([loadDashboard(), loadTransactions(1)]);
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  const exportCSV = () => {
    const headers = ['Date', 'Type', 'Source', 'Amount', 'Payment', 'Description', 'Reference'];
    const rows = transactions.map(t => [
      fmtDate(t.date), t.type, t.source || 'manual',
      (t.amount || 0).toFixed(2), t.paymentMethod || '', t.description || '', t.reference || ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `finance-${filters.from || 'all'}-${filters.to || 'now'}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const printReceipt = () => {
    const win = window.open('', '_blank', 'width=560,height=800');
    if (!win) return;
    const now = new Date().toLocaleString();
    const restName = settings?.restaurantName || 'HUDI POS';
    const dateRange = (filters.from || filters.to) ? `${filters.from || '—'} → ${filters.to || 'Today'}` : 'All Time';
    const rows = transactions.map(t => `
      <tr>
        <td>${fmtDate(t.date)}</td>
        <td><span class="${t.type}">${t.type}</span></td>
        <td style="color:${t.type==='income'?'#15803d':'#dc2626'};font-weight:700;">
          ${t.type==='income'?'+':'-'}${(t.amount||0).toFixed(2)}
        </td>
        <td>${t.paymentMethod||'cash'}</td>
        <td>${t.description||''}</td>
      </tr>`).join('');
    win.document.write(`<!DOCTYPE html><html><head><title>Finance Report</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;padding:16px;color:#111;font-size:12px}
        .hdr{text-align:center;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:14px}
        .name{font-size:18px;font-weight:800;text-transform:uppercase}
        .stats{display:flex;justify-content:space-around;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:14px}
        .stat-label{font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b}
        .stat-val{font-size:16px;font-weight:800;margin-top:2px}
        .income-val{color:#15803d}.expense-val{color:#dc2626}.net-val{color:#1d4ed8}
        table{width:100%;border-collapse:collapse;font-size:11px}
        th{text-align:left;padding:6px 4px;border-bottom:1.5px solid #111;font-weight:700;text-transform:uppercase;background:#f4f6f8;font-size:10px}
        td{padding:5px 4px;border-bottom:1px solid #eee}
        .income{background:#dcfce7;color:#15803d;padding:1px 6px;border-radius:9px;font-weight:600;font-size:10px}
        .expense{background:#fee2e2;color:#dc2626;padding:1px 6px;border-radius:9px;font-weight:600;font-size:10px}
        .footer{text-align:center;margin-top:16px;padding-top:10px;border-top:1px dashed #ccc;color:#888;font-size:10px}
        @media print{@page{margin:8mm}}
      </style></head><body>
      <div class="hdr"><div class="name">${restName}</div>
        <div style="color:#555;margin-top:4px">Finance Statement • ${dateRange}</div>
        <div style="font-size:10px;color:#999">Printed: ${now}</div>
      </div>
      <div class="stats">
        <div><div class="stat-label">Income</div><div class="stat-val income-val">+${summary.totalIncome.toFixed(2)}</div></div>
        <div><div class="stat-label">Expense</div><div class="stat-val expense-val">-${summary.totalExpense.toFixed(2)}</div></div>
        <div><div class="stat-label">Net</div><div class="stat-val net-val">${summary.netBalance>=0?'+':''}${summary.netBalance.toFixed(2)}</div></div>
      </div>
      <table><thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Payment</th><th>Description</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#999">No transactions</td></tr>'}</tbody></table>
      <div class="footer">${transactions.length} transaction(s) • HUDI POS</div>
      <script>window.onload=function(){setTimeout(function(){window.print();window.onafterprint=function(){window.close()};},400)}</script>
      </body></html>`);
    win.document.close();
  };

  const netColor = summary.netBalance >= 0 ? '#1d4ed8' : '#dc2626';

  return (
    <>
      {/* Global styles for this page */}
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{ opacity:1 } 50%{ opacity:0.5 } }
        .fin-input { width:100%; border:1.5px solid #e2e8f0; border-radius:8px; padding:8px 10px; font-size:13px; outline:none; box-sizing:border-box; color:#0f172a; background:#f8fafc; }
        .fin-input:focus { border-color:#6366f1; background:#fff; }
        .fin-btn { border:none; border-radius:8px; padding:8px 14px; font-weight:700; font-size:13px; cursor:pointer; color:#fff; white-space:nowrap; display:inline-flex; align-items:center; gap:5px; }
        .fin-btn:hover { filter: brightness(1.1); }
        .fin-btn:active { filter: brightness(0.95); }
        .fin-label { display:block; font-size:11px; font-weight:700; color:#374151; margin-bottom:3px; text-transform:uppercase; letter-spacing:0.04em; }
        .tx-row:hover { background: #f8fafc; }
        @media (max-width: 768px) {
          .stat-grid { grid-template-columns: 1fr 1fr !important; }
          .filter-grid { grid-template-columns: 1fr 1fr !important; }
          .btn-row { flex-wrap: wrap !important; }
          .header-row { flex-direction: column !important; align-items: flex-start !important; }
          .modal-grid { grid-template-columns: 1fr !important; }
          .tbl-source { display:none; }
          .tbl-payment { display:none; }
          .summary-footer { flex-direction:column !important; gap:12px !important; align-items:flex-start !important; }
        }
      `}</style>

      {/* ── Outer scroll container ───────────────────────────────────────────── */}
      <div style={{ width: '100%', overflowY: 'auto', overflowX: 'hidden', paddingBottom: 40 }}>

        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div className="header-row" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12, marginBottom:20 }}>
          <div>
            <h1 style={{ margin:0, fontSize:24, fontWeight:900, color:'#0f172a' }}>📊 Financial Reports</h1>
            <p style={{ margin:'3px 0 0', color:'#64748b', fontSize:13 }}>Income, expenses &amp; net profit — all sources combined</p>
            {error && (
              <div style={{ marginTop:8, padding:'6px 12px', background:'#fee2e2', color:'#dc2626', borderRadius:8, fontSize:13 }}>
                ⚠️ {error}
              </div>
            )}
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button className="fin-btn" onClick={() => setShowModal(true)} style={{ background:'#6366f1' }}>
              ➕ Add Transaction
            </button>
            <Link to="/reports" style={{ background:'#0ea5e9', border:'none', borderRadius:8, padding:'8px 14px', fontWeight:700, fontSize:13, cursor:'pointer', color:'#fff', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:5 }}>
              📈 Reports
            </Link>
          </div>
        </div>

        {/* ── Stat Cards ──────────────────────────────────────────────────── */}
        <div className="stat-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:12, marginBottom:18 }}>
          <StatCard title="Total Income"   value={fmtCurrency(summary.totalIncome, currency)}  color="#16a34a" icon="💰" loading={loading} sub={`Today: ${fmtCurrency(dashStats.todaySales, currency)}`} />
          <StatCard title="Today's Sales"  value={fmtCurrency(dashStats.todaySales, currency)} color="#0ea5e9" icon="🛒" loading={loading} sub={`${dashStats.todayOrders} orders`} />
          <StatCard title="This Month"     value={fmtCurrency(dashStats.monthSales, currency)} color="#7c3aed" icon="📅" loading={loading} sub="Month-to-date" />
          <StatCard title="Total Expenses" value={fmtCurrency(summary.totalExpense, currency)} color="#dc2626" icon="💸" loading={loading} sub="Purchases + Expenses" />
          <StatCard title="Net Balance"    value={fmtCurrency(summary.netBalance, currency)}   color={netColor} icon="⚖️" loading={loading} sub={summary.netBalance >= 0 ? '✅ Profit' : '⚠️ Loss'} />
        </div>

        {/* ── Income/Expense Bar ──────────────────────────────────────────── */}
        {!loading && (summary.totalIncome + summary.totalExpense) > 0 && (
          <div style={{ background:'#fff', borderRadius:14, padding:'14px 16px', marginBottom:16, boxShadow:'0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, fontWeight:600, marginBottom:6, flexWrap:'wrap', gap:4 }}>
              <span style={{ color:'#16a34a' }}>💰 Income: {fmtCurrency(summary.totalIncome, currency)}</span>
              <span style={{ color:netColor, fontWeight:800 }}>⚖️ Net: {fmtCurrency(summary.netBalance, currency)}</span>
              <span style={{ color:'#dc2626' }}>💸 Expenses: {fmtCurrency(summary.totalExpense, currency)}</span>
            </div>
            <div style={{ height:10, background:'#f1f5f9', borderRadius:999, overflow:'hidden', display:'flex' }}>
              {(() => {
                const tot = summary.totalIncome + summary.totalExpense;
                const iW = tot > 0 ? (summary.totalIncome  / tot) * 100 : 0;
                const eW = tot > 0 ? (summary.totalExpense / tot) * 100 : 0;
                return <>
                  <div style={{ width:`${iW}%`, background:'linear-gradient(90deg,#16a34a,#4ade80)', transition:'width 0.6s' }} />
                  <div style={{ width:`${eW}%`, background:'linear-gradient(90deg,#f87171,#dc2626)', transition:'width 0.6s' }} />
                </>;
              })()}
            </div>
            <div style={{ display:'flex', gap:16, marginTop:6, fontSize:11, color:'#64748b', flexWrap:'wrap' }}>
              <span>🟢 Income</span>
              <span>🔴 Expenses</span>
              <span>📦 Purchases: {fmtCurrency(dashStats.totalPurchase, currency)}</span>
            </div>
          </div>
        )}

        {/* ── Filters ─────────────────────────────────────────────────────── */}
        <div style={{ background:'#fff', borderRadius:14, padding:'14px 16px', marginBottom:16, boxShadow:'0 2px 8px rgba(0,0,0,0.05)' }}>
          {/* Row 1: inputs */}
          <div className="filter-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:10, marginBottom:10 }}>
            <div>
              <label className="fin-label">🔍 Search</label>
              <input className="fin-input" value={filters.search}
                onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
                placeholder="Description or ref…" />
            </div>
            <div>
              <label className="fin-label">📅 From</label>
              <input className="fin-input" type="date" value={filters.from}
                onChange={e => setFilters(p => ({ ...p, from: e.target.value }))} />
            </div>
            <div>
              <label className="fin-label">📅 To</label>
              <input className="fin-input" type="date" value={filters.to}
                onChange={e => setFilters(p => ({ ...p, to: e.target.value }))} />
            </div>
            <div>
              <label className="fin-label">🏷️ Type</label>
              <select className="fin-input" value={filters.type}
                onChange={e => setFilters(p => ({ ...p, type: e.target.value }))}>
                <option value="">All Types</option>
                <option value="income">Income Only</option>
                <option value="expense">Expense Only</option>
              </select>
            </div>
          </div>
          {/* Row 2: buttons */}
          <div className="btn-row" style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button className="fin-btn" onClick={() => loadTransactions(1)} style={{ background:'#3b82f6' }}>🔍 Apply</button>
            <button className="fin-btn" onClick={() => setFilters({ from:'', to:'', type:'', search:'' })} style={{ background:'#64748b' }}>✖ Clear</button>
            <button className="fin-btn" onClick={exportCSV} style={{ background:'#16a34a' }}>⬇ Export CSV</button>
            <button className="fin-btn" onClick={printReceipt} style={{ background:'#7c3aed' }}>🖨️ Print</button>
            <button className="fin-btn" onClick={() => setShowReceiptSettings(true)} style={{ background:'#ea580c' }}>⚙️ Settings</button>
            <button className="fin-btn" onClick={() => setShowModal(true)} style={{ background:'#6366f1' }}>➕ Add Transaction</button>
            {loading && <div style={{ width:18, height:18, border:'3px solid #e2e8f0', borderTopColor:'#6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite', alignSelf:'center' }} />}
          </div>
        </div>

        {/* ── Transactions Table ───────────────────────────────────────────── */}
        <div style={{ background:'#fff', borderRadius:14, boxShadow:'0 2px 8px rgba(0,0,0,0.05)', overflow:'hidden' }}>
          {/* Table header */}
          <div style={{ padding:'14px 16px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
            <div>
              <h2 style={{ margin:0, fontSize:16, fontWeight:800, color:'#0f172a' }}>All Transactions</h2>
              <p style={{ margin:'2px 0 0', fontSize:12, color:'#64748b' }}>
                {loading ? 'Loading…' : `Showing ${transactions.length} of ${total} transactions`}
              </p>
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', fontSize:12, color:'#64748b' }}>
              <span style={{ padding:'3px 8px', background:'#dcfce7', color:'#15803d', borderRadius:20, fontWeight:700 }}>🛒 Orders=Income</span>
              <span style={{ padding:'3px 8px', background:'#fee2e2', color:'#dc2626', borderRadius:20, fontWeight:700 }}>📦 Purchases=Expense</span>
            </div>
          </div>

          {/* Scrollable table */}
          <div style={{ overflowX:'auto', overflowY:'auto', maxHeight:'60vh' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, minWidth:580 }}>
              <thead style={{ position:'sticky', top:0, zIndex:2 }}>
                <tr style={{ background:'#f8fafc' }}>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Type</th>
                  <th className="tbl-source" style={thStyle}>Source</th>
                  <th style={thStyle}>Amount</th>
                  <th className="tbl-payment" style={thStyle}>Payment</th>
                  <th style={{ ...thStyle, width:'35%' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {/* Loading skeleton */}
                {loading && [1,2,3,4,5,6].map(i => (
                  <tr key={i}>
                    {[1,2,3,4,5,6].map(j => (
                      <td key={j} style={{ padding:'12px 14px' }}>
                        <div style={{ height:13, background:'#f1f5f9', borderRadius:4, animation:'pulse 1.5s infinite' }} />
                      </td>
                    ))}
                  </tr>
                ))}

                {/* Empty state */}
                {!loading && transactions.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding:'48px 24px', textAlign:'center', color:'#94a3b8' }}>
                      <div style={{ fontSize:36 }}>📭</div>
                      <p style={{ margin:'8px 0 4px', fontWeight:700, fontSize:15, color:'#475569' }}>No transactions found</p>
                      <p style={{ margin:0, fontSize:13 }}>Try adjusting your filters or add a manual transaction</p>
                    </td>
                  </tr>
                )}

                {/* Data rows */}
                {!loading && transactions.map((t, idx) => {
                  const src = SOURCE_LABELS[t.source] || SOURCE_LABELS.manual;
                  const isIncome = t.type === 'income';
                  return (
                    <tr key={t._id || idx} className="tx-row" style={{ borderBottom:'1px solid #f1f5f9' }}>
                      <td style={{ padding:'10px 14px', whiteSpace:'nowrap', color:'#64748b', fontSize:12 }}>{fmtDateTime(t.date)}</td>
                      <td style={{ padding:'10px 14px' }}>
                        <span style={{
                          display:'inline-flex', alignItems:'center', gap:3, padding:'2px 9px',
                          borderRadius:20, fontSize:11, fontWeight:700, textTransform:'uppercase',
                          background: isIncome ? '#dcfce7' : '#fee2e2',
                          color:       isIncome ? '#15803d' : '#dc2626'
                        }}>
                          {isIncome ? '▲' : '▼'} {t.type}
                        </span>
                      </td>
                      <td className="tbl-source" style={{ padding:'10px 14px' }}>
                        <span style={{
                          display:'inline-flex', alignItems:'center', gap:3, padding:'2px 9px',
                          borderRadius:20, fontSize:11, fontWeight:600,
                          background: src.bg, color: src.color
                        }}>
                          {src.icon} {src.label}
                        </span>
                      </td>
                      <td style={{ padding:'10px 14px', fontWeight:800, fontSize:14, color: isIncome ? '#15803d' : '#dc2626', whiteSpace:'nowrap' }}>
                        {isIncome ? '+' : '−'}{fmtCurrency(t.amount || 0, currency)}
                      </td>
                      <td className="tbl-payment" style={{ padding:'10px 14px', color:'#64748b', textTransform:'capitalize', whiteSpace:'nowrap', fontSize:12 }}>
                        {t.paymentMethod || '—'}
                      </td>
                      <td style={{ padding:'10px 14px', color:'#475569', maxWidth:260 }}>
                        <div style={{ fontWeight:500, fontSize:13 }}>{t.description || '—'}</div>
                        {t.reference && <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>Ref: {t.reference}</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:8, padding:'12px 16px', borderTop:'1px solid #f1f5f9', flexWrap:'wrap' }}>
              <button className="fin-btn" onClick={() => handlePageChange(page - 1)} disabled={page <= 1}
                style={{ background: page <= 1 ? '#e2e8f0' : '#6366f1', color: page <= 1 ? '#94a3b8' : '#fff' }}>← Prev</button>
              <span style={{ fontSize:13, color:'#64748b' }}>Page {page} of {totalPages}</span>
              <button className="fin-btn" onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages}
                style={{ background: page >= totalPages ? '#e2e8f0' : '#6366f1', color: page >= totalPages ? '#94a3b8' : '#fff' }}>Next →</button>
            </div>
          )}

          {/* Summary Footer */}
          {!loading && transactions.length > 0 && (
            <div className="summary-footer" style={{ display:'flex', justifyContent:'flex-end', gap:24, padding:'14px 20px', borderTop:'2px solid #f1f5f9', background:'#f8fafc', flexWrap:'wrap' }}>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase' }}>Total Income</div>
                <div style={{ fontSize:18, fontWeight:900, color:'#16a34a' }}>+{fmtCurrency(summary.totalIncome, currency)}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase' }}>Total Expense</div>
                <div style={{ fontSize:18, fontWeight:900, color:'#dc2626' }}>−{fmtCurrency(summary.totalExpense, currency)}</div>
              </div>
              <div style={{ textAlign:'right', borderLeft:'2px solid #e2e8f0', paddingLeft:20 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase' }}>Net Balance</div>
                <div style={{ fontSize:20, fontWeight:900, color: netColor }}>
                  {summary.netBalance >= 0 ? '+' : ''}{fmtCurrency(summary.netBalance, currency)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Add Transaction Modal ────────────────────────────────────────────── */}
      {showModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:16, overflowY:'auto' }}>
          <div style={{ background:'#fff', borderRadius:18, padding:'24px 22px', width:'100%', maxWidth:500, boxShadow:'0 20px 60px rgba(0,0,0,0.25)', margin:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <h3 style={{ margin:0, fontSize:18, fontWeight:900 }}>Add Manual Transaction</h3>
              <button onClick={() => setShowModal(false)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#64748b', lineHeight:1 }}>✕</button>
            </div>
            {error && <div style={{ padding:'8px 12px', background:'#fee2e2', color:'#dc2626', borderRadius:8, marginBottom:14, fontSize:13 }}>⚠️ {error}</div>}
            <div className="modal-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label className="fin-label">Date *</label>
                <input className="fin-input" type="date" value={newTx.date} onChange={e => setNewTx(p => ({...p, date: e.target.value}))} />
              </div>
              <div>
                <label className="fin-label">Type *</label>
                <select className="fin-input" value={newTx.type} onChange={e => setNewTx(p => ({...p, type: e.target.value}))}>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
              <div>
                <label className="fin-label">Amount *</label>
                <input className="fin-input" type="number" step="0.01" min="0" value={newTx.amount}
                  onChange={e => setNewTx(p => ({...p, amount: e.target.value}))} placeholder="0.00" />
              </div>
              <div>
                <label className="fin-label">Payment Method</label>
                <select className="fin-input" value={newTx.paymentMethod} onChange={e => setNewTx(p => ({...p, paymentMethod: e.target.value}))}>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank transfer">Bank Transfer</option>
                  <option value="zaad">Zaad</option>
                  <option value="sahal">Sahal</option>
                  <option value="edahab">E-Dahab</option>
                </select>
              </div>
              <div>
                <label className="fin-label">Category</label>
                <select className="fin-input" value={newTx.category} onChange={e => setNewTx(p => ({...p, category: e.target.value}))}>
                  {['General','Sales','Purchases','Rent','Utilities','Salaries','Maintenance','Other'].map(c =>
                    <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="fin-label">Reference</label>
                <input className="fin-input" value={newTx.reference} onChange={e => setNewTx(p => ({...p, reference: e.target.value}))} placeholder="Invoice #…" />
              </div>
              <div style={{ gridColumn:'1 / -1' }}>
                <label className="fin-label">Description *</label>
                <input className="fin-input" value={newTx.description} onChange={e => setNewTx(p => ({...p, description: e.target.value}))} placeholder="Describe this transaction…" />
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:18, flexWrap:'wrap' }}>
              <button className="fin-btn" onClick={() => setShowModal(false)} style={{ background:'#64748b' }}>Cancel</button>
              <button className="fin-btn" onClick={saveTransaction} disabled={saving} style={{ background:'#6366f1', opacity: saving ? 0.7 : 1 }}>
                {saving ? '⏳ Saving…' : '💾 Save Transaction'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ReceiptSettingsModal isOpen={showReceiptSettings} onClose={() => setShowReceiptSettings(false)}
        onSaveSuccess={() => { setShowReceiptSettings(false); }} />
    </>
  );
};

// Table header style
const thStyle = {
  padding: '10px 14px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 700,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  whiteSpace: 'nowrap',
  background: '#f8fafc',
  borderBottom: '1px solid #e2e8f0'
};

export default Finance;
