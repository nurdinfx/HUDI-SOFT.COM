import { useState } from 'react';
import { DollarSign, Plus, Search, Filter, Calendar, FileText, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Expenses = () => {
  const expenseData = [
    { name: 'Mon', amount: 400 },
    { name: 'Tue', amount: 300 },
    { name: 'Wed', amount: 900 },
    { name: 'Thu', amount: 200 },
    { name: 'Fri', amount: 800 },
    { name: 'Sat', amount: 500 },
    { name: 'Sun', amount: 300 },
  ];

  const expenses = [
    { id: 1, category: 'Rent', amount: 1200, date: '2026-04-10', branch: 'Main Pharmacy', status: 'Paid' },
    { id: 2, category: 'Electricity', amount: 350, date: '2026-04-12', branch: 'Downtown', status: 'Pending' },
    { id: 3, category: 'Internet', amount: 80, date: '2026-04-14', branch: 'All', status: 'Paid' },
    { id: 4, category: 'Cleaning', amount: 150, date: '2026-04-15', branch: 'Main Pharmacy', status: 'Paid' },
  ];

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Expense Tracking</h1>
          <p className="text-slate-500 font-medium">Monitor your business operational costs.</p>
        </div>
        <button className="bg-primary text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 flex items-center gap-2 hover:scale-105 transition-transform">
          <Plus className="w-5 h-5" />
          Add Expense
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left: Stats & Chart */}
        <div className="md:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Expenses (MTD)</p>
                <h3 className="text-3xl font-black text-slate-900">$2,450</h3>
              </div>
              <div className="p-4 bg-red-50 text-red-600 rounded-2xl">
                <ArrowUpRight className="w-8 h-8" />
              </div>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Upcoming Bills</p>
                <h3 className="text-3xl font-black text-slate-900">$820</h3>
              </div>
              <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl">
                <Calendar className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-xl font-bold text-slate-900">Expense Trends</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={expenseData}>
                  <defs>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 600}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 600}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#f43f5e" strokeWidth={4} fillOpacity={1} fill="url(#colorExp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right: Recent Expenses */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6 flex flex-col">
          <h3 className="text-xl font-bold text-slate-900">Recent Transactions</h3>
          <div className="space-y-4 flex-1">
            {expenses.map((e) => (
              <div key={e.id} className="p-4 rounded-2xl hover:bg-slate-50 transition-colors flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{e.category}</p>
                    <p className="text-xs text-slate-400 font-medium">{e.date} • {e.branch}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">-${e.amount}</p>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${e.status === 'Paid' ? 'text-green-600' : 'text-orange-600'}`}>
                    {e.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full py-3 bg-slate-50 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-colors">
            View Statement
          </button>
        </div>
      </div>
    </div>
  );
};

export default Expenses;
