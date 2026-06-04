import React, { useEffect, useState } from 'react';
import API from '../api';
import {
    DollarSign,
    Users,
    CheckCircle,
    AlertCircle,
    TrendingUp,
    CreditCard
} from 'lucide-react';

const AdminOverview = () => {
    const [stats, setStats] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { data } = await API.get('/admin/stats');
                setStats(data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchStats();
    }, []);

    if (!stats) return <div className="p-8 animate-pulse text-slate-500">Loading metrics...</div>;

    const cards = [
        { title: 'Total Revenue', value: `$${stats.totalRevenue}`, icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10' },
        { title: 'Monthly Revenue', value: `$${stats.monthlyRevenue}`, icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { title: '5-Year Revenue', value: `$${stats.fiveYearRevenue}`, icon: CreditCard, color: 'text-purple-500', bg: 'bg-purple-500/10' },
        { title: 'Active Licenses', value: stats.activeLicenses, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        { title: 'Expired Licenses', value: stats.expiredLicenses, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
        { title: 'Pending Orders', value: stats.pendingOrders, icon: Users, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    ];

    return (
        <div className="p-8 space-y-8 font-normal">
            <div>
                <h1 className="text-3xl font-black text-white">Dashboard Overview</h1>
                <p className="text-slate-400 mt-1">Real-time performance metrics</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((card, i) => (
                    <div key={i} className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl group hover:border-blue-500/50 transition-colors">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-2xl ${card.bg} ${card.color}`}>
                                <card.icon size={24} />
                            </div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Live Update</span>
                        </div>
                        <p className="text-slate-400 text-sm font-medium">{card.title}</p>
                        <p className="text-3xl font-black text-white mt-1">{card.value}</p>
                    </div>
                ))}
            </div>

            {/* Breakdown section could go here (charts etc) */}
        </div>
    );
};

export default AdminOverview;
