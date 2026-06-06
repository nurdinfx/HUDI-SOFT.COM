import React, { useEffect, useState } from 'react';
import API from '../api';
import { ShieldAlert, Pause, Play, RefreshCw, Monitor, Copy, Calendar } from 'lucide-react';

const DEFAULT_MAX_DEVICES = 10;
const DEVICE_LIMIT_OPTIONS = [2, 5, 10, 15, 20, 50];

const AdminLicenses = () => {
    const [licenses, setLicenses] = useState([]);
    const [savingId, setSavingId] = useState(null);

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
        if (!window.confirm('Reset all linked devices for this license? Users can activate on new devices again.')) return;
        try {
            await API.put(`/admin/licenses/${id}`, { resetDevices: true });
            fetchLicenses();
        } catch (err) {
            alert('Reset failed');
        }
    };

    const handleMaxDevicesChange = async (id, maxDevices) => {
        const limit = Number(maxDevices);
        if (Number.isNaN(limit) || limit < 1) return;
        setSavingId(id);
        try {
            await API.put(`/admin/licenses/${id}`, { maxDevices: limit });
            await fetchLicenses();
        } catch (err) {
            alert('Failed to update device limit');
        } finally {
            setSavingId(null);
        }
    };

    const handleUpgradeAllToTen = async () => {
        if (!window.confirm(`Set device limit to ${DEFAULT_MAX_DEVICES} for all licenses that are below ${DEFAULT_MAX_DEVICES}?`)) return;
        try {
            const below = licenses.filter((lic) => (lic.maxDevices || DEFAULT_MAX_DEVICES) < DEFAULT_MAX_DEVICES);
            await Promise.all(
                below.map((lic) => API.put(`/admin/licenses/${lic._id}`, { maxDevices: DEFAULT_MAX_DEVICES }))
            );
            await fetchLicenses();
            alert(`Updated ${below.length} license(s) to ${DEFAULT_MAX_DEVICES} devices.`);
        } catch (err) {
            alert('Bulk update failed');
        }
    };

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        alert('License key copied to clipboard!');
    };

    return (
        <div className="p-8 space-y-8 font-normal">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white">License Control</h1>
                    <p className="text-slate-400 mt-1">
                        Manage licenses — default device limit is <span className="text-teal-400 font-bold">{DEFAULT_MAX_DEVICES}</span> per key
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleUpgradeAllToTen}
                    className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold transition"
                >
                    Upgrade all to {DEFAULT_MAX_DEVICES} devices
                </button>
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
                                <th className="px-6 py-4">Devices</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-sm">
                            {licenses.map((lic) => {
                                const maxDevices = lic.maxDevices ?? DEFAULT_MAX_DEVICES;
                                const usedDevices = lic.machineIDs?.length || 0;
                                return (
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
                                                    Expires: {new Date(lic.expiryDate).toLocaleDateString()} {new Date(lic.expiryDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                {new Date(lic.expiryDate) < new Date() && (
                                                    <span className="text-[10px] text-red-500 font-bold uppercase flex items-center gap-1">
                                                        <ShieldAlert size={10} /> Expired
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Monitor size={14} className="text-slate-500" />
                                                <span className="text-xs text-slate-300 font-bold whitespace-nowrap">
                                                    {usedDevices} / {maxDevices}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <select
                                                    value={maxDevices}
                                                    disabled={savingId === lic._id}
                                                    onChange={(e) => handleMaxDevicesChange(lic._id, e.target.value)}
                                                    className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 focus:ring-2 focus:ring-teal-500 outline-none"
                                                    title="Device limit"
                                                >
                                                    {DEVICE_LIMIT_OPTIONS.map((n) => (
                                                        <option key={n} value={n}>{n} devices</option>
                                                    ))}
                                                </select>
                                                {savingId === lic._id && (
                                                    <span className="text-[10px] text-teal-400">Saving…</span>
                                                )}
                                            </div>
                                            {lic.machineIDs?.length > 0 && (
                                                <p className="text-[10px] text-slate-500 font-mono mt-1 truncate max-w-[120px]">
                                                    {lic.machineIDs[0].slice(0, 8)}…
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
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {licenses.length === 0 && <div className="p-10 text-center text-slate-500">No licenses found.</div>}
                </div>
            </div>
        </div>
    );
};

export default AdminLicenses;
