import React, { useEffect, useState } from 'react';
import API from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, UserCheck, UserX, Trash2, Edit3, Plus, Search, 
    X, ShieldAlert, Key, Calendar, Mail, Building 
} from 'lucide-react';

const AdminCustomers = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    
    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    // Form inputs
    const [email, setEmail] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState('Active');

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const { data } = await API.get('/admin/customers');
            setCustomers(data);
        } catch (err) {
            console.error('Failed to fetch customers:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const handleCreateCustomer = async (e) => {
        e.preventDefault();
        try {
            await API.post('/admin/customers', { email, password, companyName, status });
            setShowAddModal(false);
            resetForm();
            fetchCustomers();
        } catch (err) {
            alert(err.response?.data?.message || 'Creation failed');
        }
    };

    const handleEditCustomer = async (e) => {
        e.preventDefault();
        try {
            const payload = { email, companyName, status };
            if (password) payload.password = password;
            await API.put(`/admin/customers/${selectedCustomer._id}`, payload);
            setShowEditModal(false);
            resetForm();
            fetchCustomers();
        } catch (err) {
            alert(err.response?.data?.message || 'Update failed');
        }
    };

    const handleToggleStatus = async (cust) => {
        const newStatus = cust.status === 'Active' ? 'Suspended' : 'Active';
        try {
            await API.put(`/admin/customers/${cust._id}`, { status: newStatus });
            fetchCustomers();
        } catch (err) {
            alert('Failed to toggle status');
        }
    };

    const handleDeleteCustomer = async (id) => {
        if (!window.confirm('WARNING: Deleting this customer will permanently delete their account, order history, and all active software licenses. Are you sure you want to proceed?')) return;
        try {
            await API.delete(`/admin/customers/${id}`);
            fetchCustomers();
        } catch (err) {
            alert('Delete failed');
        }
    };

    const openEditModal = (cust) => {
        setSelectedCustomer(cust);
        setEmail(cust.email);
        setCompanyName(cust.companyName);
        setPassword('');
        setStatus(cust.status);
        setShowEditModal(true);
    };

    const resetForm = () => {
        setEmail('');
        setCompanyName('');
        setPassword('');
        setStatus('Active');
        setSelectedCustomer(null);
    };

    const filteredCustomers = customers.filter(cust => 
        cust.email?.toLowerCase().includes(search.toLowerCase()) ||
        cust.companyName?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-8 space-y-8 font-normal pb-32">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white">Customer Accounts</h1>
                    <p className="text-slate-400 mt-1">Manage client records, subscription states, and software bounds</p>
                </div>
                <button
                    onClick={() => { resetForm(); setShowAddModal(true); }}
                    className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition shadow-lg shadow-blue-600/20"
                >
                    <Plus size={18} />
                    <span>Create Customer</span>
                </button>
            </div>

            {/* Search and Stats */}
            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search customers or companies..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-4 py-3 text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500/50 transition-colors"
                    />
                </div>
                <div className="flex gap-4 self-stretch md:self-auto text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <div className="px-4 py-3 bg-slate-900/40 border border-slate-800 rounded-2xl flex items-center gap-2">
                        <span>Total:</span>
                        <span className="text-white font-black">{customers.length}</span>
                    </div>
                    <div className="px-4 py-3 bg-slate-900/40 border border-slate-800 rounded-2xl flex items-center gap-2">
                        <span>Suspended:</span>
                        <span className="text-red-400 font-black">{customers.filter(c => c.status === 'Suspended').length}</span>
                    </div>
                </div>
            </div>

            {/* Customers List */}
            {loading ? (
                <div className="p-10 text-center text-slate-500 animate-pulse">Loading customer directory...</div>
            ) : (
                <div className="grid gap-6">
                    {filteredCustomers.map((cust) => (
                        <div
                            key={cust._id}
                            className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6 md:p-8 hover:border-slate-700/60 transition-all flex flex-col gap-6"
                        >
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="flex items-center gap-4">
                                    <div className={`p-4 rounded-2xl ${cust.status === 'Active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                        {cust.status === 'Active' ? <UserCheck size={28} /> : <UserX size={28} />}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white flex items-center gap-2">
                                            {cust.companyName}
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                cust.status === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                            }`}>
                                                {cust.status}
                                            </span>
                                        </h3>
                                        <p className="text-slate-400 text-sm">{cust.email}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 self-stretch md:self-auto justify-end">
                                    <button
                                        onClick={() => handleToggleStatus(cust)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition ${
                                            cust.status === 'Active' 
                                                ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20' 
                                                : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                                        }`}
                                    >
                                        {cust.status === 'Active' ? 'Suspend' : 'Activate'}
                                    </button>
                                    <button
                                        onClick={() => openEditModal(cust)}
                                        className="p-2.5 bg-slate-800 text-slate-300 hover:text-white rounded-xl transition"
                                        title="Edit profile"
                                    >
                                        <Edit3 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteCustomer(cust._id)}
                                        className="p-2.5 bg-red-600/10 text-red-500 hover:bg-red-600/20 rounded-xl transition"
                                        title="Delete account"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Associated Licenses */}
                            <div className="border-t border-slate-800/80 pt-6">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Key size={14} />
                                    <span>Active License Keys ({cust.licenses?.length || 0})</span>
                                </h4>
                                {cust.licenses && cust.licenses.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {cust.licenses.map((lic) => (
                                            <div key={lic._id} className="bg-slate-950/40 border border-slate-800/50 p-4 rounded-2xl space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                                        lic.productType === 'HMS' ? 'bg-teal-500/20 text-teal-400' : 'bg-blue-500/20 text-blue-400'
                                                    }`}>
                                                        {lic.productType}
                                                    </span>
                                                    <span className={`text-[10px] font-bold ${
                                                        lic.status === 'Active' ? 'text-green-500' : 'text-slate-500'
                                                    }`}>
                                                        {lic.status}
                                                    </span>
                                                </div>
                                                <code className="text-xs font-mono text-blue-400 block break-all bg-slate-900/50 p-2 rounded-lg border border-slate-800/40">{lic.licenseKey}</code>
                                                <div className="flex justify-between items-center text-[10px] text-slate-500">
                                                    <span>Devices: {lic.activeDevices?.length || lic.machineIDs?.length || 0} / {lic.maxDevices || 10}</span>
                                                    <span>Expiry: {new Date(lic.expiryDate).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-slate-600 text-xs italic">No licenses issued for this customer.</p>
                                )}
                            </div>
                        </div>
                    ))}
                    {filteredCustomers.length === 0 && (
                        <div className="p-20 text-center text-slate-600 border border-dashed border-slate-800 rounded-3xl">
                            No customers match your search criteria.
                        </div>
                    )}
                </div>
            )}

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-8 space-y-6 shadow-2xl relative"
                    >
                        <button onClick={() => setShowAddModal(false)} className="absolute right-6 top-6 text-slate-500 hover:text-white transition">
                            <X size={20} />
                        </button>
                        <div>
                            <h2 className="text-2xl font-black text-white">New Customer Account</h2>
                            <p className="text-slate-400 text-sm mt-1">Register a client with immediate PWA authorization bounds</p>
                        </div>
                        <form onSubmit={handleCreateCustomer} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Company Name</label>
                                <div className="relative">
                                    <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                    <input
                                        type="text"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500/50 text-sm"
                                        placeholder="e.g. Daryeel Hospital"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500/50 text-sm"
                                        placeholder="client@hospital.com"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Login Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500/50 text-sm"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Status</label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-blue-500/50 text-sm"
                                >
                                    <option value="Active">Active</option>
                                    <option value="Suspended">Suspended</option>
                                </select>
                            </div>
                            <button
                                type="submit"
                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition mt-4"
                            >
                                Register Account
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-8 space-y-6 shadow-2xl relative"
                    >
                        <button onClick={() => setShowEditModal(false)} className="absolute right-6 top-6 text-slate-500 hover:text-white transition">
                            <X size={20} />
                        </button>
                        <div>
                            <h2 className="text-2xl font-black text-white">Edit Customer Profile</h2>
                            <p className="text-slate-400 text-sm mt-1">Modify account email, name, or password credentials</p>
                        </div>
                        <form onSubmit={handleEditCustomer} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Company Name</label>
                                <div className="relative">
                                    <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                    <input
                                        type="text"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500/50 text-sm"
                                        placeholder="e.g. Daryeel Hospital"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500/50 text-sm"
                                        placeholder="client@hospital.com"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Update Password (Leave blank to keep current)</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500/50 text-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Status</label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-blue-500/50 text-sm"
                                >
                                    <option value="Active">Active</option>
                                    <option value="Suspended">Suspended</option>
                                </select>
                            </div>
                            <button
                                type="submit"
                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition mt-4"
                            >
                                Save Changes
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default AdminCustomers;
