import React, { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import AdminOverview from '../components/AdminOverview';
import AdminOrders from '../components/AdminOrders';
import AdminLicenses from '../components/AdminLicenses';
import AdminLeads from '../components/AdminLeads';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const adminInfo = JSON.parse(localStorage.getItem('adminInfo'));

    useEffect(() => {
        if (!adminInfo || adminInfo.role !== 'admin') {
            navigate('/admin/login');
        }
    }, [adminInfo, navigate]);

    if (!adminInfo) return null;

    return (
        <div className="flex bg-slate-950 min-h-screen">
            <Sidebar />
            <div className="flex-1 relative overflow-auto h-screen">
                <div className="absolute top-0 right-0 p-8 flex items-center gap-4 text-slate-500 z-10">
                    <span className="text-sm font-bold uppercase tracking-widest text-slate-600">Secure Environment</span>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                </div>

                <Routes>
                    <Route path="/" element={<AdminOverview />} />
                    <Route path="/orders" element={<AdminOrders />} />
                    <Route path="/licenses" element={<AdminLicenses />} />
                    <Route path="/leads" element={<AdminLeads />} />
                </Routes>
            </div>
        </div>
    );
};

export default AdminDashboard;
