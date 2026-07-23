import React, { useEffect, useState } from 'react';
import API from '../api';
import { 
    Key, ShieldAlert, Pause, Play, Trash2, Clock, 
    Plus, X, CheckCircle, RefreshCw, Layers, Monitor, HardDrive 
} from 'lucide-react';

const AdminLicenses = () => {
    const [licenses, setLicenses] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showManageModal, setShowManageModal] = useState(false);
    const [selectedLicense, setSelectedLicense] = useState(null);

    // Create License form state
    const [customerEmail, setCustomerEmail] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [productType, setProductType] = useState('HMS');
    const [subscriptionType, setSubscriptionType] = useState('Monthly');
    const [price, setPrice] = useState(0);
    const [isTrial, setIsTrial] = useState(false);
    const [expiryDays, setExpiryDays] = useState(30);
    const [maxDevices, setMaxDevices] = useState(10);

    // Manage License form state
    const [addMonths, setAddMonths] = useState('');
    const [addYears, setAddYears] = useState('');
    const [newMaxDevices, setNewMaxDevices] = useState(10);
    const [newSubscriptionType, setNewSubscriptionType] = useState('Monthly');

    const fetchData = async () => {
        try {
            setLoading(true);
            const licRes = await API.get('/admin/licenses');
            setLicenses(licRes.data);
            const custRes = await API.get('/admin/customers');
            setCustomers(custRes.data);
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateLicense = async (e) => {
        e.preventDefault();
        try {
            await API.post('/admin/licenses', {
                customerEmail,
                companyName,
                productType,
                subscriptionType,
                price: Number(price),
                isTrial,
                expiryDays: isTrial ? Number(expiryDays) : undefined,
                maxDevices: Number(maxDevices)
            });
            setShowCreateModal(false);
            resetCreateForm();
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to generate license key');
        }
    };

    const handleStatusChange = async (id, status) => {
        try {
            await API.put(`/admin/licenses/${id}`, { status });
            fetchData();
        } catch (err) {
            alert('Action failed');
        }
    };

    const handleUpdateLicense = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                maxDevices: Number(newMaxDevices),
                subscriptionType: newSubscriptionType
            };
            if (addMonths) payload.addMonths = Number(addMonths);
            if (addYears) payload.addYears = Number(addYears);
            
            await API.put(`/admin/licenses/${selectedLicense._id}`, payload);
            setShowManageModal(false);
            fetchData();
        } catch (err) {
            alert('Update failed');
        }
    };

    const handleResetDevices = async (id) => {
        if (!window.confirm('Are you sure you want to clear all device slot bindings for this license? All registered clients will be logged out and forced to re-activate.')) return;
        try {
            await API.put(`/admin/licenses/${id}`, { resetDevices: true });
            alert('Devices reset successfully');
            if (selectedLicense && selectedLicense._id === id) {
                setShowManageModal(false);
            }
            fetchData();
        } catch (err) {
            alert('Failed to reset devices');
        }
    };

    const handleConvertToPaid = async (lic) => {
        if (!window.confirm('Convert this trial license to a paid subscription? This will disable trial mode and extend validity by 30 days.')) return;
        try {
            await API.put(`/admin/licenses/${lic._id}`, {
                isTrial: false,
                addMonths: 1,
                subscriptionType: 'Monthly',
                status: 'Active'
            });
            fetchData();
        } catch (err) {
            alert('Conversion failed');
        }
    };

    const openManageModal = (lic) => {
        setSelectedLicense(lic);
        setNewMaxDevices(lic.maxDevices || 10);
        setNewSubscriptionType(lic.subscriptionType || 'Monthly');
        setAddMonths('');
        setAddYears('');
        setShowManageModal(true);
    };

    const resetCreateForm = () => {
        setCustomerEmail('');
        setCompanyName('');
        setProductType('HMS');
        setSubscriptionType('Monthly');
        setPrice(0);
        setIsTrial(false);
        setExpiryDays(30);
        setMaxDevices(10);
    };

    return (
        <div className="p-8 space-y-8 font-normal pb-32">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white">License Control Panel</h1>
                    <p className="text-slate-400 mt-1">Generate keys, audit active devices, extend subscriptions, or suspend access</p>
                </div>
                <button
                    onClick={() => { resetCreateForm(); setShowCreateModal(true); }}
                    className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition shadow-lg shadow-blue-600/20"
                >
                    <Plus size={18} />
                    <span>Create License Key</span>
                </button>
            </div>

            {/* License Table */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-widest font-bold border-b border-slate-700">
                                <th className="px-6 py-4">Client / Company</th>
                                <th className="px-6 py-4">Product Type</th>
                                <th className="px-6 py-4">Subscription & Key</th>
                                <th className="px-6 py-4">Devices Bound</th>
                                <th className="px-6 py-4">Expiration Date</th>
                                <th className="px-6 py-4">License Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-sm">
                            {licenses.map((lic) => (
                                <tr key={lic._id} className="hover:bg-slate-800/20 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="text-white font-bold">{lic.companyName}</p>
                                        <p className="text-slate-500 text-xs italic">{lic.userId?.email || 'Standalone Key'}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                                            lic.productType === 'HMS' ? 'bg-teal-500/20 text-teal-400' : 'bg-blue-500/20 text-blue-400'
                                        }`}>
                                            {lic.productType}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col space-y-1">
                                            <span className="text-slate-400 text-xs">{lic.subscriptionType === 'FiveYear' ? '5-Year Plan' : 'Monthly Plan'}</span>
                                            <code className="text-[10px] text-blue-400 font-mono bg-slate-950/40 px-2 py-0.5 rounded border border-slate-800/40 w-fit break-all">{lic.licenseKey}</code>
                                            {lic.isTrial && (
                                                <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-black uppercase tracking-widest w-fit">
                                                    Trial License
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-slate-300 font-semibold">{lic.activeDevices?.length || 0} / {lic.maxDevices || 10}</span>
                                            <span className="text-[10px] text-slate-500">Device Slot Limit</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-slate-300">
                                            {new Date(lic.expiryDate).toLocaleDateString()}
                                        </div>
                                        {new Date(lic.expiryDate) < new Date() ? (
                                            <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Expired</span>
                                        ) : (
                                            <span className="text-[10px] text-slate-500">Active Range</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                            lic.status === 'Active' ? 'bg-green-500/20 text-green-500' :
                                            lic.status === 'Expired' ? 'bg-red-500/20 text-red-500' : 
                                            lic.status === 'Suspended' ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-500/20 text-slate-500'
                                        }`}>
                                            {lic.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {lic.status === 'Active' ? (
                                                <button onClick={() => handleStatusChange(lic._id, 'Suspended')} title="Suspend license access" className="p-2 text-slate-400 hover:text-amber-500 transition hover:bg-slate-800/50 rounded-xl"><Pause size={16} /></button>
                                            ) : (
                                                <button onClick={() => handleStatusChange(lic._id, 'Active')} title="Activate license access" className="p-2 text-slate-400 hover:text-green-500 transition hover:bg-slate-800/50 rounded-xl"><Play size={16} /></button>
                                            )}
                                            {lic.isTrial && (
                                                <button 
                                                    onClick={() => handleConvertToPaid(lic)}
                                                    className="px-2 py-1 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 rounded-lg text-[10px] font-bold uppercase transition"
                                                    title="Convert to Paid Subscription"
                                                >
                                                    Paid
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => openManageModal(lic)} 
                                                className="p-2 text-slate-400 hover:text-blue-500 transition hover:bg-slate-800/50 rounded-xl" 
                                                title="Manage variables & devices"
                                            >
                                                <Clock size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {licenses.length === 0 && <div className="p-16 text-center text-slate-500 font-bold uppercase tracking-wider">No active software licenses issued.</div>}
                </div>
            </div>

            {/* Create License Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setShowCreateModal(false)} className="absolute right-6 top-6 text-slate-500 hover:text-white transition">
                            <X size={20} />
                        </button>
                        <div>
                            <h2 className="text-2xl font-black text-white">Generate License Key</h2>
                            <p className="text-slate-400 text-sm mt-1">Provision a new software activation token for the SaaS</p>
                        </div>
                        <form onSubmit={handleCreateLicense} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Customer Link (Optional)</label>
                                <select
                                    value={customerEmail}
                                    onChange={(e) => {
                                        setCustomerEmail(e.target.value);
                                        const matched = customers.find(c => c.email === e.target.value);
                                        if (matched) setCompanyName(matched.companyName);
                                    }}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-blue-500/50 text-sm"
                                >
                                    <option value="">-- No customer link (Standalone) --</option>
                                    {customers.map(c => (
                                        <option key={c._id} value={c.email}>{c.companyName} ({c.email})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Company Name</label>
                                <input
                                    type="text"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-blue-500/50 text-sm"
                                    placeholder="Company Name"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Product Type</label>
                                    <select
                                        value={productType}
                                        onChange={(e) => setProductType(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-blue-500/50 text-sm"
                                    >
                                        <option value="HMS">HMS (Hospital System)</option>
                                        <option value="POS">POS (Desktop POS)</option>
                                        <option value="POS_ONLINE">POS Online</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Plan Option</label>
                                    <select
                                        value={subscriptionType}
                                        onChange={(e) => setSubscriptionType(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-blue-500/50 text-sm"
                                    >
                                        <option value="Monthly">Monthly Plan</option>
                                        <option value="FiveYear">5-Year Plan</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-6 py-2">
                                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300 font-semibold select-none">
                                    <input
                                        type="checkbox"
                                        checked={isTrial}
                                        onChange={(e) => setIsTrial(e.target.checked)}
                                        className="rounded border-slate-800 accent-blue-600 bg-slate-950 h-4 w-4"
                                    />
                                    <span>Is Trial Key</span>
                                </label>
                            </div>
                            {isTrial && (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Trial Duration (Days)</label>
                                    <input
                                        type="number"
                                        value={expiryDays}
                                        onChange={(e) => setExpiryDays(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-blue-500/50 text-sm"
                                        min="1"
                                        required
                                    />
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Device limit</label>
                                    <input
                                        type="number"
                                        value={maxDevices}
                                        onChange={(e) => setMaxDevices(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-blue-500/50 text-sm"
                                        min="1"
                                        max="100"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Price Charged ($)</label>
                                    <input
                                        type="number"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-blue-500/50 text-sm"
                                        min="0"
                                        required
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition mt-4"
                            >
                                Generate & Issue Key
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Manage/Extend/Device Modal */}
            {showManageModal && selectedLicense && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setShowManageModal(false)} className="absolute right-6 top-6 text-slate-500 hover:text-white transition">
                            <X size={20} />
                        </button>
                        <div>
                            <h2 className="text-2xl font-black text-white">Manage Licensing Bounds</h2>
                            <p className="text-slate-400 text-sm mt-1">{selectedLicense.companyName} – key: <code className="text-xs text-blue-400 font-mono">{selectedLicense.licenseKey}</code></p>
                        </div>

                        {/* Bound Devices Audit */}
                        <div className="bg-slate-950/40 border border-slate-800/80 p-5 rounded-2xl space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Monitor size={14} />
                                    <span>Bound Devices ({selectedLicense.activeDevices?.length || 0})</span>
                                </h3>
                                {selectedLicense.activeDevices?.length > 0 && (
                                    <button 
                                        onClick={() => handleResetDevices(selectedLicense._id)}
                                        className="text-[10px] text-red-500 hover:text-red-400 font-bold uppercase"
                                    >
                                        Reset Slots
                                    </button>
                                )}
                            </div>
                            {selectedLicense.activeDevices && selectedLicense.activeDevices.length > 0 ? (
                                <ul className="space-y-2 text-xs font-mono text-slate-400">
                                    {selectedLicense.activeDevices.map((dev, i) => (
                                        <li key={i} className="flex justify-between items-center bg-slate-900/50 p-2 rounded-lg border border-slate-800/30">
                                            <span>Slot #{i + 1}: {dev}</span>
                                            <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1 py-0.5 rounded font-sans uppercase">Active</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-slate-600 text-xs italic">No devices currently bound to this key.</p>
                            )}
                        </div>

                        <form onSubmit={handleUpdateLicense} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Device limits</label>
                                    <input
                                        type="number"
                                        value={newMaxDevices}
                                        onChange={(e) => setNewMaxDevices(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 outline-none text-sm focus:border-blue-500/50"
                                        min="1"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Plan Type</label>
                                    <select
                                        value={newSubscriptionType}
                                        onChange={(e) => setNewSubscriptionType(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 outline-none text-sm focus:border-blue-500/50"
                                    >
                                        <option value="Monthly">Monthly</option>
                                        <option value="FiveYear">FiveYear</option>
                                    </select>
                                </div>
                            </div>

                            <div className="bg-slate-950/20 border border-slate-800/50 p-4 rounded-2xl space-y-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Extend Expiration</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Add Months</label>
                                        <input
                                            type="number"
                                            value={addMonths}
                                            onChange={(e) => setAddMonths(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 outline-none text-sm focus:border-blue-500/50"
                                            placeholder="e.g. 1"
                                            min="0"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Add Years</label>
                                        <input
                                            type="number"
                                            value={addYears}
                                            onChange={(e) => setAddYears(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 outline-none text-sm focus:border-blue-500/50"
                                            placeholder="e.g. 1"
                                            min="0"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition mt-4"
                            >
                                Apply Modifications
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminLicenses;
