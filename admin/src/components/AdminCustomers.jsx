import React, { useEffect, useState } from 'react';
import API from '../api';
import {
    Users, UserCheck, UserX, Trash2, Edit3, Plus, X, Save,
    Mail, Building2, ShieldCheck, ShieldOff, Key, RefreshCw, Eye, EyeOff
} from 'lucide-react';

const StatusBadge = ({ status }) => {
    const isActive = status === 'Active';
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${isActive
            ? 'bg-green-500/15 text-green-400 border border-green-500/30'
            : 'bg-red-500/15 text-red-400 border border-red-500/30'
            }`}>
            {isActive ? <ShieldCheck size={10} /> : <ShieldOff size={10} />}
            {status}
        </span>
    );
};

const EditModal = ({ customer, onClose, onSaved }) => {
    const [form, setForm] = useState({
        email: customer.email || '',
        companyName: customer.companyName || '',
        status: customer.status || 'Active',
        password: '',
    });
    const [saving, setSaving] = useState(false);
    const [showPass, setShowPass] = useState(false);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                email: form.email,
                companyName: form.companyName,
                status: form.status,
            };
            if (form.password) payload.password = form.password;
            await API.put(`/admin/customers/${customer._id}`, payload);
            onSaved();
            onClose();
        } catch (err) {
            alert(err.response?.data?.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-7 w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                        <Edit3 size={18} className="text-blue-400" />
                        Edit Customer
                    </h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide flex items-center gap-1">
                            <Mail size={11} /> Email
                        </label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide flex items-center gap-1">
                            <Building2 size={11} /> Company Name
                        </label>
                        <input
                            type="text"
                            value={form.companyName}
                            onChange={e => setForm({ ...form, companyName: e.target.value })}
                            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide flex items-center gap-1">
                            <ShieldCheck size={11} /> Account Status
                        </label>
                        <select
                            value={form.status}
                            onChange={e => setForm({ ...form, status: e.target.value })}
                            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                        >
                            <option value="Active">✅ Active</option>
                            <option value="Suspended">🚫 Suspended</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide flex items-center gap-1">
                            <Key size={11} /> New Password (leave blank to keep)
                        </label>
                        <div className="relative">
                            <input
                                type={showPass ? 'text' : 'password'}
                                value={form.password}
                                onChange={e => setForm({ ...form, password: e.target.value })}
                                placeholder="••••••••"
                                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 pr-10"
                            />
                            <button type="button" onClick={() => setShowPass(!showPass)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition">
                                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm transition">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition disabled:opacity-60 flex items-center justify-center gap-2">
                            <Save size={14} />
                            {saving ? 'Saving…' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const CreateCustomerModal = ({ onClose, onCreated }) => {
    const [form, setForm] = useState({ email: '', password: '', companyName: '', status: 'Active' });
    const [saving, setSaving] = useState(false);
    const [showPass, setShowPass] = useState(false);

    const handleCreate = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await API.post('/admin/customers', form);
            onCreated();
            onClose();
        } catch (err) {
            alert(err.response?.data?.message || 'Create failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-7 w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                        <Plus size={18} className="text-green-400" />
                        Create Customer
                    </h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleCreate} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide flex items-center gap-1">
                            <Mail size={11} /> Email *
                        </label>
                        <input required type="email" value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                            placeholder="customer@example.com"
                            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500/40"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide flex items-center gap-1">
                            <Building2 size={11} /> Company Name
                        </label>
                        <input type="text" value={form.companyName}
                            onChange={e => setForm({ ...form, companyName: e.target.value })}
                            placeholder="Company / Clinic Name"
                            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500/40"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide flex items-center gap-1">
                            <Key size={11} /> Password *
                        </label>
                        <div className="relative">
                            <input required type={showPass ? 'text' : 'password'} value={form.password}
                                onChange={e => setForm({ ...form, password: e.target.value })}
                                placeholder="••••••••"
                                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500/40 pr-10"
                            />
                            <button type="button" onClick={() => setShowPass(!showPass)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition">
                                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Initial Status</label>
                        <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500/40">
                            <option value="Active">✅ Active</option>
                            <option value="Suspended">🚫 Suspended</option>
                        </select>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm transition">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-sm transition disabled:opacity-60 flex items-center justify-center gap-2">
                            <Plus size={14} />
                            {saving ? 'Creating…' : 'Create Customer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AdminCustomers = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editTarget, setEditTarget] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const { data } = await API.get('/admin/customers');
            setCustomers(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const handleToggleStatus = async (customer) => {
        const newStatus = customer.status === 'Active' ? 'Suspended' : 'Active';
        const action = newStatus === 'Suspended' ? 'suspend' : 'activate';
        if (!window.confirm(`Are you sure you want to ${action} ${customer.email}?`)) return;
        try {
            await API.put(`/admin/customers/${customer._id}`, { status: newStatus });
            fetchCustomers();
        } catch (err) {
            alert('Action failed: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleDelete = async (customer) => {
        if (!window.confirm(`Permanently delete ${customer.email} and all their data? This cannot be undone.`)) return;
        try {
            await API.delete(`/admin/customers/${customer._id}`);
            fetchCustomers();
        } catch (err) {
            alert('Delete failed: ' + (err.response?.data?.message || err.message));
        }
    };

    const filtered = customers.filter(c => {
        const matchSearch = !search ||
            c.email?.toLowerCase().includes(search.toLowerCase()) ||
            c.companyName?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === 'All' || c.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const activeCount = customers.filter(c => c.status === 'Active').length;
    const suspendedCount = customers.filter(c => c.status === 'Suspended').length;

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white">Customer Accounts</h1>
                    <p className="text-slate-400 mt-1">Manage user accounts, activation status, and access control</p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-sm transition-colors shadow-lg shadow-green-600/20"
                >
                    <Plus size={16} />
                    New Customer
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Customers', value: customers.length, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
                    { label: 'Active Accounts', value: activeCount, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
                    { label: 'Suspended Accounts', value: suspendedCount, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
                ].map(stat => (
                    <div key={stat.label} className={`${stat.bg} border rounded-2xl p-5`}>
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{stat.label}</p>
                        <p className={`text-3xl font-black mt-1 ${stat.color}`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-xs">
                    <input
                        type="text"
                        placeholder="Search by email or company…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-4 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                </div>
                <div className="flex gap-2">
                    {['All', 'Active', 'Suspended'].map(s => (
                        <button key={s} onClick={() => setFilterStatus(s)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${filterStatus === s
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                                }`}>
                            {s}
                        </button>
                    ))}
                </div>
                <button onClick={fetchCustomers}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition"
                    title="Refresh">
                    <RefreshCw size={16} />
                </button>
            </div>

            {/* Table */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-widest font-bold border-b border-slate-700">
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Company</th>
                                <th className="px-6 py-4">Licenses</th>
                                <th className="px-6 py-4">Account Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-slate-500">
                                        <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
                                        Loading customers…
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-slate-500">
                                        <Users size={32} className="mx-auto mb-3 opacity-30" />
                                        No customers found
                                    </td>
                                </tr>
                            ) : filtered.map(customer => (
                                <tr key={customer._id} className="hover:bg-slate-800/20 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black ${customer.status === 'Active'
                                                ? 'bg-green-500/20 text-green-400'
                                                : 'bg-red-500/20 text-red-400'
                                                }`}>
                                                {customer.email?.[0]?.toUpperCase() || '?'}
                                            </div>
                                            <div>
                                                <p className="text-white font-semibold text-sm">{customer.email}</p>
                                                <p className="text-slate-500 text-xs">ID: {customer._id?.slice(-8)}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-slate-300 font-medium">
                                            {customer.companyName || <span className="text-slate-600 italic">—</span>}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {customer.licenses?.length > 0 ? customer.licenses.map(lic => (
                                                <span key={lic._id}
                                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${lic.status === 'Active'
                                                        ? 'bg-blue-500/20 text-blue-400'
                                                        : lic.status === 'Suspended'
                                                            ? 'bg-amber-500/20 text-amber-400'
                                                            : 'bg-slate-700 text-slate-400'
                                                        }`}>
                                                    {lic.productType} · {lic.status}
                                                </span>
                                            )) : (
                                                <span className="text-slate-600 text-xs italic">No licenses</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={customer.status} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-end gap-1">
                                            {/* Activate / Suspend Toggle */}
                                            <button
                                                onClick={() => handleToggleStatus(customer)}
                                                title={customer.status === 'Active' ? 'Suspend Account' : 'Activate Account'}
                                                className={`p-2 rounded-lg transition-all ${customer.status === 'Active'
                                                    ? 'text-slate-400 hover:text-amber-500 hover:bg-amber-500/10'
                                                    : 'text-slate-400 hover:text-green-500 hover:bg-green-500/10'
                                                    }`}>
                                                {customer.status === 'Active'
                                                    ? <UserX size={16} />
                                                    : <UserCheck size={16} />
                                                }
                                            </button>
                                            {/* Edit */}
                                            <button
                                                onClick={() => setEditTarget(customer)}
                                                title="Edit Customer"
                                                className="p-2 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
                                                <Edit3 size={16} />
                                            </button>
                                            {/* Delete */}
                                            <button
                                                onClick={() => handleDelete(customer)}
                                                title="Delete Customer"
                                                className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            {editTarget && (
                <EditModal
                    customer={editTarget}
                    onClose={() => setEditTarget(null)}
                    onSaved={fetchCustomers}
                />
            )}
            {showCreate && (
                <CreateCustomerModal
                    onClose={() => setShowCreate(false)}
                    onCreated={fetchCustomers}
                />
            )}
        </div>
    );
};

export default AdminCustomers;
