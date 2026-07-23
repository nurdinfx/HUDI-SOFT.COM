import React, { useEffect, useState } from 'react';
import API from '../api';
import { Key, ShieldAlert, Pause, Play, Trash2, Edit3, CheckCircle, Clock, RefreshCw, Monitor, Copy, Calendar } from 'lucide-react';

const AdminLicenses = () => {
    const [licenses, setLicenses] = useState([]);
    const adminInfo = JSON.parse(localStorage.getItem('adminInfo'));

    const fetchLicenses = async () => {
        try {
            const { data } = await API.get('/admin/licenses');
            setLicenses(data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchLicenses();
    }, []);

    const handleStatusChange = async (id, status) => {
        try {
            await API.put(`/admin/licenses/${id}`, { status });
            fetchLicenses();
        } catch (err) {
            alert('Action failed');
        }
    };

    const handleResetDevices = async (id) => {
        if (!window.confirm('Are you sure you want to reset all linked devices for this license? This will allow the user to link new devices.')) return;
        try {
            await API.put(`/admin/licenses/${id}`, { resetDevices: true });
            fetchLicenses();
        } catch (err) {
            alert('Reset failed');
        }
    };

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        alert('License key copied to clipboard!');
    };

    return (
        <div className="p-8 space-y-8 font-normal">
            <div>
                <h1 className="text-3xl font-black text-white">License Control</h1>
                <p className="text-slate-400 mt-1">Manage, extend, or revoke desktop software licenses</p>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-widest font-bold border-b border-slate-700">
                                <th className="px-6 py-4">Company</th>
                                <th className="px-6 py-4">Product</th>
                                <th className="px-6 py-4">Plan / Key</th>
                                <th className="px-6 py-4">Expiry</th>
                                <th className="px-6 py-4">Device</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-sm">
                            {licenses.map((lic) => (
                                <tr key={lic._id} className="hover:bg-slate-800/20 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="text-white font-bold">{lic.companyName}</p>
                                        <p className="text-slate-500 text-xs">{lic.userId?.email}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${lic.productType === 'POS' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                            {lic.productType}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-400 font-medium">{lic.subscriptionType === 'FiveYear' ? '5-Year' : 'Monthly'}</span>
                                                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">${lic.price}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <code className="text-[10px] text-blue-400 font-mono opacity-60 truncate max-w-[120px]">{lic.licenseKey}</code>
                                                <button 
                                                    onClick={() => handleCopy(lic.licenseKey)}
                                                    className="text-slate-500 hover:text-blue-400 transition"
                                                    title="Copy License Key"
                                                >
                                                    <Copy size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                                <Calendar size={10} />
                                                <span>Activated: {new Date(lic.activationDate).toLocaleString()}</span>
                                            </div>
                                            <div className="text-slate-300 whitespace-nowrap font-medium">
                                                Expires: {new Date(lic.expiryDate).toLocaleDateString()} {new Date(lic.expiryDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </div>
                                            {new Date(lic.expiryDate) < new Date() && <span className="text-[10px] text-red-500 font-bold uppercase flex items-center gap-1"><ShieldAlert size={10} /> Expired</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Monitor size={14} className="text-slate-500" />
                                            <span className="text-xs text-slate-300 font-bold">
                                                {lic.machineIDs?.length || 0} / {lic.maxDevices || 2}
                                            </span>
                                        </div>
                                        {lic.machineIDs?.length > 0 && (
                                            <p className="text-[10px] text-slate-500 font-mono mt-1 truncate max-w-[80px]">
                                                {lic.machineIDs[0].slice(0, 8)}...
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${lic.status === 'Active' ? 'bg-green-500/20 text-green-500' :
                                                lic.status === 'Expired' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'
                                            }`}>
                                            {lic.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {lic.status === 'Active' ? (
                                                <button onClick={() => handleStatusChange(lic._id, 'Suspended')} title="Suspend" className="p-2 text-slate-400 hover:text-amber-500 transition"><Pause size={16} /></button>
                                            ) : (
                                                <button onClick={() => handleStatusChange(lic._id, 'Active')} title="Activate" className="p-2 text-slate-400 hover:text-green-500 transition"><Play size={16} /></button>
                                            )}
                                            <button onClick={() => handleResetDevices(lic._id)} className="p-2 text-slate-400 hover:text-blue-500 transition" title="Reset Devices"><RefreshCw size={16} /></button>
                                            <button className="p-2 text-slate-400 hover:text-slate-200 transition" title="Extend"><Clock size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {licenses.length === 0 && <div className="p-10 text-center text-slate-500">No licenses found.</div>}
                </div>
            </div>

            {/* Quick Create License */}
            <CreateLicensePanel onCreated={fetchLicenses} />
        </div>
    );
};

const CreateLicensePanel = ({ onCreated }) => {
    const [open, setOpen] = React.useState(false);
    const [form, setForm] = React.useState({
        customerEmail: '', companyName: '', productType: 'DATEL_CLINIC',
        subscriptionType: 'Monthly', price: 0, isTrial: false, expiryDays: 30, maxDevices: 5,
    });
    const [saving, setSaving] = React.useState(false);

    const handleCreate = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await import('../api').then(m => m.default.post('/admin/licenses', form));
            setOpen(false);
            onCreated();
        } catch (err) {
            alert(err.response?.data?.message || 'Error creating license');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-xl font-black text-white">Create License Key</h2>
                    <p className="text-slate-400 text-sm">Generate a new license for any HUDI SOFT product</p>
                </div>
                <button onClick={() => setOpen(!open)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-colors flex items-center gap-2">
                    <Key size={14} />
                    {open ? 'Cancel' : 'New License'}
                </button>
            </div>
            {open && (
                <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Customer Email</label>
                        <input value={form.customerEmail} onChange={e => setForm({...form, customerEmail: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                            placeholder="clinic@example.com" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Company / Clinic Name *</label>
                        <input required value={form.companyName} onChange={e => setForm({...form, companyName: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                            placeholder="Datel Medical Clinic" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Product *</label>
                        <select required value={form.productType} onChange={e => setForm({...form, productType: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40">
                            <option value="DATEL_CLINIC">🏥 Datel Clinic System</option>
                            <option value="HMS">🏨 Hospital Management System</option>
                            <option value="POS">🛒 POS System</option>
                            <option value="POS_ONLINE">🌐 POS Online</option>
                            <option value="DETAIL_CARE">💊 Detail Care</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Subscription Plan *</label>
                        <select required value={form.subscriptionType} onChange={e => setForm({...form, subscriptionType: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40">
                            <option value="Monthly">Monthly (30 days)</option>
                            <option value="FiveYear">5-Year / Lifetime</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Validity (days)</label>
                        <input type="number" min="1" value={form.expiryDays} onChange={e => setForm({...form, expiryDays: Number(e.target.value)})}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Price (USD)</label>
                        <input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm({...form, price: Number(e.target.value)})}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Max Devices</label>
                        <input type="number" min="1" max="100" value={form.maxDevices} onChange={e => setForm({...form, maxDevices: Number(e.target.value)})}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                    </div>
                    <div className="flex items-center gap-3 pt-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={form.isTrial} onChange={e => setForm({...form, isTrial: e.target.checked})}
                                className="w-4 h-4 rounded accent-blue-500" />
                            <span className="text-sm text-slate-300">Trial License</span>
                        </label>
                    </div>
                    <div className="col-span-2 flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setOpen(false)}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold rounded-xl text-sm transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-60 flex items-center gap-2">
                            <Key size={14} />
                            {saving ? 'Generating…' : 'Generate License Key'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default AdminLicenses;
