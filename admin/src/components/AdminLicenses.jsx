import React, { useEffect, useState } from 'react';
import API from '../api';
import { Key, ShieldAlert, Pause, Play, Trash2, Edit3, CheckCircle, Clock } from 'lucide-react';

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
                                            <span className="text-slate-400">{lic.subscriptionType === 'FiveYear' ? '5-Year' : 'Monthly'}</span>
                                            <code className="text-[10px] text-blue-400 font-mono mt-1 opacity-60 truncate max-w-[120px]">{lic.licenseKey}</code>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-slate-300 whitespace-nowrap">
                                            {new Date(lic.expiryDate).toLocaleDateString()}
                                        </div>
                                        {new Date(lic.expiryDate) < new Date() && <span className="text-[10px] text-red-500 font-bold uppercase">Expired</span>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs text-slate-500 font-mono">{lic.machineID ? lic.machineID.slice(0, 8) + '...' : 'Not Linked'}</span>
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
                                            <button className="p-2 text-slate-400 hover:text-blue-500 transition" title="Extend"><Clock size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {licenses.length === 0 && <div className="p-10 text-center text-slate-500">No licenses found.</div>}
                </div>
            </div>
        </div>
    );
};

export default AdminLicenses;
