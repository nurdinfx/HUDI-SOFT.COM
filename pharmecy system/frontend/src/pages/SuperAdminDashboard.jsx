import { useEffect } from 'react';
import useSuperAdminStore from '../store/superAdminStore';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
  Users, Building2, CreditCard, Activity, TrendingUp, AlertCircle, CheckCircle2, Clock
} from 'lucide-react';

const SuperAdminDashboard = () => {
  const { stats, fetchStats, tenants, fetchTenants, isLoading } = useSuperAdminStore();

  useEffect(() => {
    fetchStats();
    fetchTenants();
  }, [fetchStats, fetchTenants]);

  if (isLoading && !stats) return <div className="p-8 text-slate-500 font-bold">Loading God View...</div>;

  const cards = [
    { title: 'Total Tenants', value: stats?.totalTenants, icon: <Building2 className="text-blue-600" />, color: 'bg-blue-50' },
    { title: 'Active Subscriptions', value: stats?.activeTenants, icon: <CheckCircle2 className="text-green-600" />, color: 'bg-green-50' },
    { title: 'Expired Accounts', value: stats?.expiredTenants, icon: <AlertCircle className="text-red-600" />, color: 'bg-red-50' },
    { title: 'Total Revenue', value: `$${stats?.totalSystemRevenue?.toLocaleString()}`, icon: <TrendingUp className="text-purple-600" />, color: 'bg-purple-50' },
  ];

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900">SaaS Command Center</h1>
          <p className="text-slate-500 font-medium">Platform-wide overview and tenant management.</p>
        </div>
        <button className="bg-primary text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
          System Broadcast
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center space-x-4">
            <div className={`p-4 rounded-2xl ${card.color}`}>
              {card.icon}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{card.title}</p>
              <h3 className="text-2xl font-black text-slate-900">{card.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <h3 className="text-xl font-bold text-slate-900">Revenue Growth</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.monthlyGrowth}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 600}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 600}} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <h3 className="text-xl font-bold text-slate-900">Tenant Onboarding</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.monthlyGrowth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 600}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 600}} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="tenants" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900">Recent Tenants</h3>
          <button className="text-primary font-bold hover:underline">View All Tenants</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-widest">
              <tr>
                <th className="px-8 py-4">Business Name</th>
                <th className="px-8 py-4">Owner</th>
                <th className="px-8 py-4">Plan</th>
                <th className="px-8 py-4">Expiry</th>
                <th className="px-8 py-4">Status</th>
                <th className="px-8 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenants.slice(0, 5).map((tenant) => (
                <tr key={tenant._id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5 font-bold text-slate-900">{tenant.name}</td>
                  <td className="px-8 py-5 text-slate-500 font-medium">{tenant.owner?.name}</td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold">{tenant.subscriptionPlan}</span>
                  </td>
                  <td className="px-8 py-5 text-slate-500 font-medium">
                    {new Date(tenant.expiryDate).toLocaleDateString()}
                  </td>
                  <td className="px-8 py-5">
                    {tenant.isActive ? (
                      <span className="flex items-center text-green-600 text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Active
                      </span>
                    ) : (
                      <span className="flex items-center text-red-600 text-xs font-bold">
                        <Clock className="w-4 h-4 mr-1" /> Suspended
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-5">
                    <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-primary transition-colors">
                      <CreditCard className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
