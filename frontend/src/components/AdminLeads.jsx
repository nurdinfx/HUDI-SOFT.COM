import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Phone, Mail, Building, Clock, CheckCircle, XCircle, MoreVertical } from 'lucide-react';

const AdminLeads = () => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const adminInfo = JSON.parse(localStorage.getItem('adminInfo'));

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        try {
            const response = await fetch('/api/leads/admin', {
                headers: { 'Authorization': `Bearer ${adminInfo.token}` }
            });
            const data = await response.json();
            setLeads(data);
        } catch (error) {
            console.error('Error fetching leads:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id, newStatus) => {
        try {
            const response = await fetch(`/api/leads/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminInfo.token}`
                },
                body: JSON.stringify({ status: newStatus })
            });
            if (response.ok) {
                fetchLeads();
            }
        } catch (error) {
            console.error('Error updating lead status:', error);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'New': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'Contacted': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'Converted': return 'bg-green-500/10 text-green-500 border-green-500/20';
            default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
        }
    };

    return (
        <div className="p-8 pb-32">
            <header className="mb-12">
                <h1 className="text-4xl font-black text-white mb-2 tracking-tight uppercase">Support Leads</h1>
                <p className="text-slate-500 font-bold uppercase text-xs tracking-[0.2em]">Prospect Management & Demo Scheduling</p>
            </header>

            {loading ? (
                <div className="h-64 flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="grid gap-6">
                    {leads.map((lead) => (
                        <motion.div
                            key={lead._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-slate-900 border border-slate-800 rounded-3xl p-8 hover:border-blue-600/50 transition-all group"
                        >
                            <div className="grid md:grid-cols-4 gap-8 items-center">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-blue-500">
                                            <Users size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-white tracking-tight leading-none">{lead.name}</h4>
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{lead.companyName}</span>
                                        </div>
                                    </div>
                                    <div className={`inline-flex items-center px-3 py-1 bg-slate-900 border text-[10px] font-black rounded-lg uppercase tracking-widest ${getStatusColor(lead.status)}`}>
                                        {lead.status}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-sm text-slate-400">
                                        <Mail size={16} className="text-slate-600" />
                                        <span className="font-bold">{lead.email}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-400">
                                        <Phone size={16} className="text-slate-600" />
                                        <span className="font-black text-blue-400">{lead.phone}</span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-sm text-slate-400">
                                        <Building size={16} className="text-slate-600" />
                                        <span className="font-bold uppercase tracking-widest text-[10px]">{lead.systemType}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-400">
                                        <Clock size={16} className="text-slate-600" />
                                        <span className="font-bold uppercase tracking-widest text-[10px]">Requested {new Date(lead.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2">
                                    {lead.status === 'New' && (
                                        <button
                                            onClick={() => updateStatus(lead._id, 'Contacted')}
                                            className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase rounded-xl hover:bg-blue-700 transition-colors"
                                        >
                                            Mark as Contacted
                                        </button>
                                    )}
                                    {lead.status === 'Contacted' && (
                                        <button
                                            onClick={() => updateStatus(lead._id, 'Converted')}
                                            className="px-4 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-xl hover:bg-emerald-700 transition-colors"
                                        >
                                            Mark as Converted
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                    {leads.length === 0 && (
                        <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-[3.5rem]">
                            <p className="text-slate-600 font-black uppercase tracking-[0.2em]">No demo requests yet.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminLeads;
