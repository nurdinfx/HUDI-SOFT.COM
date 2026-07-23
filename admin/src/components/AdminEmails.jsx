import React, { useEffect, useState, useCallback } from 'react';
import API from '../api';
import {
    Mail, Send, Users, Filter, RefreshCw, Search, ChevronDown,
    CheckSquare, Square, BarChart2, AlertCircle, Bell, X, Eye,
    Loader2, CheckCircle, XCircle, Tag, Globe
} from 'lucide-react';

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, color = 'text-blue-400', bg = 'bg-blue-500/10 border-blue-500/20' }) => (
    <div className={`${bg} border rounded-2xl p-5`}>
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{label}</p>
        <p className={`text-3xl font-black mt-1 ${color}`}>{value}</p>
    </div>
);

// ── Badge ─────────────────────────────────────────────────────────────────────
const Badge = ({ text, color }) => {
    const map = {
        Active: 'bg-green-500/15 text-green-400 border-green-500/30',
        Trial: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        Expired: 'bg-red-500/15 text-red-400 border-red-500/30',
        None: 'bg-slate-700 text-slate-400 border-slate-600',
    };
    return (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${map[text] || 'bg-slate-700 text-slate-400 border-slate-600'}`}>
            {text}
        </span>
    );
};

// ── Compose Modal ─────────────────────────────────────────────────────────────
const ComposeModal = ({ selectedIds, filterSummary, onClose }) => {
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState(null);
    const [smtpStatus, setSmtpStatus] = useState(null); // null | 'ok' | 'error' | 'checking'

    const checkSmtp = async () => {
        setSmtpStatus('checking');
        setResult(null);
        try {
            const { data } = await API.get('/admin/emails/test-smtp');
            setSmtpStatus(data.ok ? 'ok' : 'error');
            setResult({ type: data.ok ? 'success' : 'error', message: data.message });
        } catch (err) {
            setSmtpStatus('error');
            setResult({ type: 'error', message: err.response?.data?.message || 'SMTP test failed.', isSmtpIssue: true });
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        setSending(true);
        setResult(null);
        try {
            const payload = {
                subject,
                htmlBody: body.replace(/\n/g, '<br/>'),
                textBody: body,
            };
            if (selectedIds && selectedIds.length > 0) {
                payload.targetIds = selectedIds;
            } else {
                payload.filter = filterSummary;
            }
            const { data } = await API.post('/admin/emails/campaign', payload);
            setResult({
                type: data.failed === 0 ? 'success' : 'warning',
                message: data.message,
                errors: data.errors
            });
        } catch (err) {
            const errMsg = err.response?.data?.message || 'Campaign failed.';
            const isSmtpIssue = ['SMTP_NOT_CONFIGURED', 'SMTP_AUTH_FAILED'].includes(err.response?.data?.error);
            setResult({ type: 'error', message: errMsg, isSmtpIssue });
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                        <Send size={18} className="text-blue-400" />
                        Compose Campaign
                    </h3>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={checkSmtp}
                            disabled={smtpStatus === 'checking'}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                                smtpStatus === 'ok' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                smtpStatus === 'error' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                'bg-slate-700 text-slate-400 hover:text-white border-slate-600'
                            }`}
                            title="Test SMTP connection before sending"
                        >
                            {smtpStatus === 'checking' ? <Loader2 size={12} className="animate-spin" /> :
                             smtpStatus === 'ok' ? <CheckCircle size={12} /> :
                             smtpStatus === 'error' ? <XCircle size={12} /> :
                             <AlertCircle size={12} />}
                            {smtpStatus === 'checking' ? 'Testing…' :
                             smtpStatus === 'ok' ? 'SMTP OK ✓' :
                             smtpStatus === 'error' ? 'SMTP Error' :
                             'Test SMTP'}
                        </button>
                        <button onClick={onClose} className="text-slate-500 hover:text-white transition">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <form onSubmit={handleSend} className="flex flex-col flex-1 overflow-auto p-6 space-y-4">
                    <div className="p-3 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-slate-400">
                        {selectedIds?.length > 0
                            ? <span>📌 Sending to <b className="text-white">{selectedIds.length}</b> selected recipient(s)</span>
                            : <span>🎯 Sending to <b className="text-white">filtered segment</b> — {JSON.stringify(filterSummary)}</span>
                        }
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Subject *</label>
                        <input
                            required
                            type="text"
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            placeholder="Your email subject line…"
                            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                        />
                    </div>

                    <div className="space-y-1.5 flex-1">
                        <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Message Body *</label>
                        <textarea
                            required
                            value={body}
                            onChange={e => setBody(e.target.value)}
                            placeholder="Write your message here. Use plain text — new lines become HTML line breaks."
                            rows={12}
                            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-y font-mono"
                        />
                    </div>

                    {result && (
                        <div className={`p-3 rounded-xl text-sm flex flex-col gap-2 ${
                            result.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' :
                            result.type === 'warning' ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400' :
                            'bg-red-500/10 border border-red-500/30 text-red-400'
                        }`}>
                            <div className="flex items-start gap-2">
                                {result.type === 'success' ? <CheckCircle size={16} className="shrink-0 mt-0.5" /> : <XCircle size={16} className="shrink-0 mt-0.5" />}
                                <span>{result.message}</span>
                            </div>
                            {result.isSmtpIssue && (
                                <div className="ml-6 text-xs opacity-80 bg-black/20 rounded-lg p-3 space-y-1 font-mono">
                                    <p className="font-bold not-italic mb-2">Add these to Render → Environment Variables:</p>
                                    <p>SMTP_HOST = smtp.gmail.com</p>
                                    <p>SMTP_PORT = 587</p>
                                    <p>SMTP_USER = your-gmail@gmail.com</p>
                                    <p>SMTP_PASS = your-16-char-app-password</p>
                                </div>
                            )}
                            {result.errors?.length > 0 && (
                                <div className="ml-6 text-xs opacity-70">
                                    <p className="font-bold mb-1">Failed recipients:</p>
                                    {result.errors.map((e, i) => <p key={i}>{e.email}: {e.error}</p>)}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm transition">
                            Cancel
                        </button>
                        <button type="submit" disabled={sending} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition disabled:opacity-60 flex items-center justify-center gap-2">
                            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                            {sending ? 'Sending…' : 'Send Campaign'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const AdminEmails = () => {
    const [emails, setEmails] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterProduct, setFilterProduct] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterLicense, setFilterLicense] = useState('');
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState([]);
    const [showCompose, setShowCompose] = useState(false);
    const [view, setView] = useState('list'); // 'list' | 'stats'
    const LIMIT = 50;

    const PRODUCTS = ['', 'POS', 'HMS', 'POS_ONLINE', 'POS_OFFLINE', 'DETAIL_CARE', 'DATEL_CLINIC'];
    const STATUSES = ['', 'Active', 'Expired', 'Trial', 'None'];

    const fetchEmails = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: LIMIT });
            if (search) params.set('search', search);
            if (filterProduct) params.set('product', filterProduct);
            if (filterStatus) params.set('subscriptionStatus', filterStatus);
            if (filterLicense !== '') params.set('hasActiveLicense', filterLicense);
            const { data } = await API.get(`/admin/emails?${params.toString()}`);
            setEmails(data.emails);
            setTotal(data.total);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [search, filterProduct, filterStatus, filterLicense, page]);

    const fetchStats = async () => {
        setStatsLoading(true);
        try {
            const { data } = await API.get('/admin/emails/stats');
            setStats(data);
        } catch (err) {
            console.error(err);
        } finally {
            setStatsLoading(false);
        }
    };

    useEffect(() => { fetchEmails(); }, [fetchEmails]);
    useEffect(() => { fetchStats(); }, []);

    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === emails.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(emails.map(e => e._id));
        }
    };

    const handleUnsubscribe = async (id) => {
        try {
            await API.put(`/admin/emails/${id}/unsubscribe`);
            fetchEmails();
        } catch (err) {
            alert(err.response?.data?.message || 'Action failed');
        }
    };

    const activeFilter = { product: filterProduct || undefined, subscriptionStatus: filterStatus || undefined, hasActiveLicense: filterLicense !== '' ? filterLicense === 'true' : undefined };
    const pages = Math.ceil(total / LIMIT);

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white">Customer Email Management</h1>
                    <p className="text-slate-400 mt-1">View, segment, and send campaigns to your customer base</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setView(v => v === 'list' ? 'stats' : 'list')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition ${view === 'stats' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                        <BarChart2 size={16} /> {view === 'stats' ? 'View List' : 'View Stats'}
                    </button>
                    <button
                        onClick={() => { if (selectedIds.length > 0 || Object.values(activeFilter).some(Boolean)) setShowCompose(true); else alert('Select recipients or apply a filter first.'); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-colors shadow-lg shadow-blue-600/20">
                        <Send size={16} /> Compose Campaign
                    </button>
                </div>
            </div>

            {/* Stats overview */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <StatCard label="Total Emails" value={stats.total} color="text-blue-400" bg="bg-blue-500/10 border-blue-500/20" />
                    <StatCard label="Active" value={stats.active} color="text-green-400" bg="bg-green-500/10 border-green-500/20" />
                    <StatCard label="Trial" value={stats.trial} color="text-cyan-400" bg="bg-cyan-500/10 border-cyan-500/20" />
                    <StatCard label="Expired" value={stats.expired} color="text-red-400" bg="bg-red-500/10 border-red-500/20" />
                    <StatCard label="Licensed" value={stats.withLicense} color="text-purple-400" bg="bg-purple-500/10 border-purple-500/20" />
                    <StatCard label="Unsubscribed" value={stats.unsubscribed} color="text-slate-400" bg="bg-slate-800 border-slate-700" />
                </div>
            )}

            {/* Product breakdown cards */}
            {view === 'stats' && stats?.byProduct?.length > 0 && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
                    <h2 className="text-white font-black mb-4 flex items-center gap-2"><Tag size={16} className="text-blue-400" /> Emails by Product</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {stats.byProduct.map(p => (
                            <div key={p._id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
                                <p className="text-xs text-slate-500 font-semibold mb-1">{p._id}</p>
                                <p className="text-2xl font-black text-white">{p.count}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search email, name, company…"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                </div>
                <select value={filterProduct} onChange={e => { setFilterProduct(e.target.value); setPage(1); }}
                    className="px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40">
                    {PRODUCTS.map(p => <option key={p} value={p}>{p || 'All Products'}</option>)}
                </select>
                <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                    className="px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40">
                    {STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
                </select>
                <select value={filterLicense} onChange={e => { setFilterLicense(e.target.value); setPage(1); }}
                    className="px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40">
                    <option value="">All Licenses</option>
                    <option value="true">Active License</option>
                    <option value="false">No Active License</option>
                </select>
                <button onClick={() => fetchEmails()} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition" title="Refresh">
                    <RefreshCw size={16} />
                </button>
            </div>

            {/* Selection bar */}
            {selectedIds.length > 0 && (
                <div className="flex items-center gap-4 px-4 py-3 bg-blue-600/15 border border-blue-500/30 rounded-xl">
                    <span className="text-blue-400 text-sm font-bold">{selectedIds.length} selected</span>
                    <button onClick={() => setShowCompose(true)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition">
                        <Send size={14} /> Send to Selected
                    </button>
                    <button onClick={() => setSelectedIds([])} className="text-slate-400 hover:text-white transition ml-auto">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-widest font-bold border-b border-slate-700">
                                <th className="px-4 py-4">
                                    <button onClick={toggleSelectAll}>
                                        {selectedIds.length === emails.length && emails.length > 0
                                            ? <CheckSquare size={16} className="text-blue-400" />
                                            : <Square size={16} />}
                                    </button>
                                </th>
                                <th className="px-4 py-4">Email</th>
                                <th className="px-4 py-4">Company</th>
                                <th className="px-4 py-4">Products</th>
                                <th className="px-4 py-4">Status</th>
                                <th className="px-4 py-4">License</th>
                                <th className="px-4 py-4">Sources</th>
                                <th className="px-4 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-sm">
                            {loading ? (
                                <tr><td colSpan={8} className="p-12 text-center text-slate-500">
                                    <RefreshCw size={20} className="animate-spin mx-auto mb-2" />Loading…
                                </td></tr>
                            ) : emails.length === 0 ? (
                                <tr><td colSpan={8} className="p-12 text-center text-slate-500">
                                    <Mail size={32} className="mx-auto mb-3 opacity-30" />No emails found
                                </td></tr>
                            ) : emails.map(em => (
                                <tr key={em._id} className={`hover:bg-slate-800/20 transition-colors ${em.unsubscribed ? 'opacity-50' : ''}`}>
                                    <td className="px-4 py-4">
                                        <button onClick={() => toggleSelect(em._id)}>
                                            {selectedIds.includes(em._id)
                                                ? <CheckSquare size={16} className="text-blue-400" />
                                                : <Square size={16} className="text-slate-600" />}
                                        </button>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-black text-blue-400 shrink-0">
                                                {em.email?.[0]?.toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-white text-sm font-semibold">{em.email}</p>
                                                <p className="text-slate-500 text-xs">{em.name || '—'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-slate-300 text-sm">{em.companyName || <span className="text-slate-600 italic">—</span>}</td>
                                    <td className="px-4 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {em.products?.length > 0 ? em.products.map(p => (
                                                <span key={p} className="px-1.5 py-0.5 bg-slate-700 text-slate-300 rounded text-[10px] font-bold">{p}</span>
                                            )) : <span className="text-slate-600 text-xs italic">—</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4"><Badge text={em.subscriptionStatus || 'None'} /></td>
                                    <td className="px-4 py-4">
                                        {em.hasActiveLicense
                                            ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/15 text-green-400 border border-green-500/30">Active</span>
                                            : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700 text-slate-400 border border-slate-600">None</span>}
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {em.sources?.map(s => (
                                                <span key={s} className="px-1.5 py-0.5 bg-purple-500/15 text-purple-400 rounded text-[10px] font-bold border border-purple-500/20">{s}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex justify-end gap-1">
                                            {em.unsubscribed ? (
                                                <button onClick={async () => { await API.put(`/admin/emails/${em._id}/resubscribe`); fetchEmails(); }}
                                                    title="Resubscribe" className="p-2 rounded-lg text-slate-400 hover:text-green-400 hover:bg-green-500/10 transition-all text-xs font-bold">
                                                    Re-sub
                                                </button>
                                            ) : (
                                                <button onClick={() => handleUnsubscribe(em._id)}
                                                    title="Unsubscribe" className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all">
                                                    <XCircle size={15} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800">
                        <span className="text-xs text-slate-500">{total} total · Page {page} of {pages}</span>
                        <div className="flex gap-2">
                            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-sm font-bold transition disabled:opacity-40">
                                Previous
                            </button>
                            <button disabled={page === pages} onClick={() => setPage(p => p + 1)}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-sm font-bold transition disabled:opacity-40">
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Compose Modal */}
            {showCompose && (
                <ComposeModal
                    selectedIds={selectedIds.length > 0 ? selectedIds : null}
                    filterSummary={activeFilter}
                    onClose={() => setShowCompose(false)}
                />
            )}
        </div>
    );
};

export default AdminEmails;
