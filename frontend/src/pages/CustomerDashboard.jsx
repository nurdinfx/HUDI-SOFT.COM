import React, { useState, useEffect } from 'react';
import API from '../api';
import { motion } from 'framer-motion';
import { Download, ShieldCheck, Clock, Building, ArrowRight, LogOut, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CustomerDashboard = () => {
    const [licenses, setLicenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const adminInfo = JSON.parse(localStorage.getItem('adminInfo'));
        if (!adminInfo) {
            navigate('/admin/login');
            return;
        }
        setUser(adminInfo);
        fetchLicenses();
    }, [navigate]);

    const fetchLicenses = async () => {
        try {
            const { data } = await API.get('/admin/licenses');
            // Filter licenses for current user (this is a bit hacky since the API returns all licenses for admin, 
            // but for a simple demo it works. In a real app we'd have a specific /api/my-licenses endpoint)
            const myLicenses = data.filter(l => l.userId && (l.userId._id === adminInfo._id || l.userId === adminInfo._id));
            setLicenses(myLicenses);
        } catch (error) {
            console.error('Error fetching licenses:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (productType) => {
        try {
            const response = await API.get(`/downloads/${productType}`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `hudi-${productType.toLowerCase()}-v1.zip`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            alert(error.response?.data?.message || 'Download failed. Please check your license status.');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('adminInfo');
        navigate('/admin/login');
    };

    if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans tracking-tight">Loading...</div>;

    return (
        <div className="min-h-screen bg-slate-50 font-sans tracking-tight text-slate-900">
            {/* Header */}
            <header className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-1.5 group cursor-pointer" onClick={() => navigate('/')}>
                        <div className="w-8 h-8 bg-[#f4511e] rounded-lg flex items-center justify-center text-white font-black group-hover:rotate-12 transition-transform shadow-lg shadow-orange-500/20">H</div>
                        <span className="text-xl font-black text-slate-900 tracking-tighter uppercase">hudi<span className="text-[#f4511e]">soft</span></span>
                    </div>
                    
                    <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-slate-900">{user?.email}</p>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{user?.companyName}</p>
                        </div>
                        <button 
                            onClick={handleLogout}
                            className="p-2.5 bg-slate-100 rounded-xl text-slate-500 hover:text-[#f4511e] hover:bg-orange-50 transition-all active:scale-95"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-12">
                <div className="mb-12">
                    <h1 className="text-4xl font-black text-slate-900 mb-2">My Systems</h1>
                    <p className="text-slate-500 font-medium">Access and download your licensed HUDI SOFT systems.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* POS System Card */}
                    <ProductCard 
                        title="POS System" 
                        description="Point of Sale solution for retail and service businesses."
                        productType="POS"
                        licenses={licenses.filter(l => l.productType === 'POS')}
                        onDownload={() => handleDownload('POS')}
                    />

                    {/* HMS System Card */}
                    <ProductCard 
                        title="Hospital Management" 
                        description="Complete system for clinics, pharmacy and hospital operations."
                        productType="HMS"
                        licenses={licenses.filter(l => l.productType === 'HMS')}
                        onDownload={() => handleDownload('HMS')}
                    />
                </div>
            </main>
        </div>
    );
};

const ProductCard = ({ title, description, productType, licenses, onDownload }) => {
    const activeLicense = licenses.find(l => l.status === 'Active');
    
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative"
        >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                <Package size={120} />
            </div>

            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg ${productType === 'POS' ? 'bg-indigo-600 shadow-indigo-500/20' : 'bg-emerald-600 shadow-emerald-500/20'} text-white`}>
                <Package size={28} />
            </div>

            <h3 className="text-2xl font-black mb-3">{title}</h3>
            <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">
                {description}
            </p>

            <div className="space-y-4 mb-8">
                {activeLicense ? (
                    <>
                        <div className="flex items-center gap-3 text-emerald-600 bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                            <ShieldCheck size={20} className="shrink-0" />
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest leading-none mb-1">Active License</p>
                                <p className="text-sm font-bold">Valid until {new Date(activeLicense.expiryDate).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <button 
                            onClick={onDownload}
                            className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98]"
                        >
                            <Download size={20} />
                            Download System
                        </button>
                    </>
                ) : (
                    <div className="flex items-center gap-3 text-slate-400 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <Clock size={20} className="shrink-0" />
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest leading-none mb-1">No Active License</p>
                            <p className="text-sm font-bold">Purchase to access download</p>
                        </div>
                    </div>
                )}
            </div>

            {!activeLicense && (
                <button className="w-full border-2 border-slate-900 text-slate-900 p-5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-900 hover:text-white transition-all active:scale-[0.98]">
                    Upgrade Now
                    <ArrowRight size={20} />
                </button>
            )}
        </motion.div>
    );
};

export default CustomerDashboard;
