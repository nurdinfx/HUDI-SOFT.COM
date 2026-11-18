import { useEffect } from 'react';
import useAuthStore from '../store/authStore';
import { 
  ShoppingBag, Users, Package, TrendingUp, ArrowUpRight, ArrowDownRight, 
  MapPin, Clock, AlertTriangle
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line 
} from 'recharts';

const Dashboard = () => {
  const { user } = useAuthStore();

  const stats = [
    { title: "Today's Sales", value: "$1,280", change: "+12.5%", isUp: true, icon: <ShoppingBag className="text-blue-600" />, color: 'bg-blue-50' },
    { title: "Active Staff", value: "8", change: "Full Team", isUp: true, icon: <Users className="text-purple-600" />, color: 'bg-purple-50' },
    { title: "Low Stock Items", value: "12", change: "-2 from yesterday", isUp: false, icon: <Package className="text-orange-600" />, color: 'bg-orange-50' },
    { title: "Monthly Profit", value: "$42,500", change: "+8.2%", isUp: true, icon: <TrendingUp className="text-green-600" />, color: 'bg-green-50' },
  ];

  const salesData = [
    { name: 'Mon', sales: 4000 },
    { name: 'Tue', sales: 3000 },
    { name: 'Wed', sales: 2000 },
    { name: 'Thu', sales: 2780 },
    { name: 'Fri', sales: 1890 },
    { name: 'Sat', sales: 2390 },
    { name: 'Sun', sales: 3490 },
  ];

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 leading-tight">
            Welcome back, <span className="text-primary">{user?.name}</span>
          </h1>
          <p className="text-slate-500 font-medium">Here's what's happening at <span className="text-slate-900 font-bold">{user?.businessName || 'Your Pharmacy'}</span> today.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            <span className="text-sm font-bold text-slate-700">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className={`p-3 rounded-2xl ${stat.color}`}>
                {stat.icon}
              </div>
              <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${stat.isUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                {stat.isUp ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                {stat.change}
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{stat.title}</p>
              <h3 className="text-2xl font-black text-slate-900">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Sales Chart */}
        <div className="md:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-slate-900">Weekly Performance</h3>
            <select className="bg-slate-50 border-none text-sm font-bold text-slate-500 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/20">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 600}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 600}} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={4} dot={{ r: 6, fill: '#3b82f6', strokeWidth: 3, stroke: '#fff' }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alerts & Notifications */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <h3 className="text-xl font-bold text-slate-900">System Alerts</h3>
          <div className="space-y-4">
            {[
              { type: 'warning', msg: '5 items expiring this week', branch: 'Main Branch' },
              { type: 'danger', msg: 'Stock critically low for Panadol', branch: 'Downtown' },
              { type: 'info', msg: 'New shipment arrives tomorrow', branch: 'All' },
            ].map((alert, i) => (
              <div key={i} className={`p-4 rounded-2xl flex gap-3 ${alert.type === 'danger' ? 'bg-red-50' : alert.type === 'warning' ? 'bg-orange-50' : 'bg-blue-50'}`}>
                <AlertTriangle className={`w-5 h-5 shrink-0 ${alert.type === 'danger' ? 'text-red-600' : alert.type === 'warning' ? 'text-orange-600' : 'text-blue-600'}`} />
                <div>
                  <p className="text-sm font-bold text-slate-900">{alert.msg}</p>
                  <p className="text-xs text-slate-500 flex items-center mt-1">
                    <MapPin className="w-3 h-3 mr-1" /> {alert.branch}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full py-3 bg-slate-50 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-colors">
            View All Notifications
          </button>
        </div>
      </div>

      {/* Branch Performance Summary */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900">Branch Performance</h3>
          <button className="bg-primary/10 text-primary px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary/20 transition-colors">
            Full Report
          </button>
        </div>
        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          {['Main Pharmacy', 'Downtown Branch', 'Uptown Clinic'].map((branch, i) => (
            <div key={i} className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Branch</p>
                  <h4 className="text-lg font-black text-slate-900">{branch}</h4>
                </div>
                <span className="text-green-600 text-sm font-bold">+5.2%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-1000" 
                  style={{ width: `${Math.floor(Math.random() * 60) + 40}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span>$12,400 Sales</span>
                <span>84% Capacity</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

