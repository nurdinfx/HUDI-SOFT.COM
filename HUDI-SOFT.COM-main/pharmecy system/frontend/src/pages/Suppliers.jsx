import { useState, useEffect } from 'react';
import { Truck, Phone, Mail, MapPin, Search, Plus, ExternalLink, Package } from 'lucide-react';

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([
    { id: 1, name: 'PharmaCore Wholesalers', contact: 'Zekeriya Abdi', email: 'sales@pharmacore.com', phone: '+252 615 111111', category: 'General Medicines', rating: 4.8 },
    { id: 2, name: 'Mogadishu Meds Supply', contact: 'Muna Isse', email: 'muna@mogmeds.so', phone: '+252 615 222222', category: 'Antibiotics', rating: 4.5 },
    { id: 3, name: 'Somali Health Distributors', contact: 'Liban Omar', email: 'info@somhealth.so', phone: '+252 615 333333', category: 'Medical Equipment', rating: 4.2 },
  ]);

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Supplier Management</h1>
          <p className="text-slate-500 font-medium">Manage your medicine vendors and procurement.</p>
        </div>
        <button className="bg-primary text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 flex items-center gap-2 hover:scale-105 transition-transform">
          <Plus className="w-5 h-5" />
          Add Supplier
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { title: 'Total Suppliers', value: '24', icon: <Truck />, color: 'bg-blue-50 text-blue-600' },
          { title: 'Active Orders', value: '8', icon: <Package />, color: 'bg-green-50 text-green-600' },
          { title: 'Pending Payments', value: '$4,200', icon: <Search />, color: 'bg-orange-50 text-orange-600' },
          { title: 'Reliability', value: '98%', icon: <Truck />, color: 'bg-purple-50 text-purple-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={`p-4 rounded-2xl ${stat.color}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.title}</p>
              <h3 className="text-2xl font-black text-slate-900">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Supplier Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {suppliers.map((s) => (
          <div key={s.id} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6 hover:shadow-xl transition-all group">
            <div className="flex justify-between items-start">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <Truck className="w-7 h-7" />
              </div>
              <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest italic">Verified</span>
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900">{s.name}</h3>
              <p className="text-sm font-bold text-primary">{s.category}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
                <Users className="w-4 h-4" />
                <span>{s.contact}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
                <Phone className="w-4 h-4" />
                <span>{s.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
                <Mail className="w-4 h-4" />
                <span className="truncate">{s.email}</span>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-orange-500 text-sm font-black">★</span>
                <span className="text-slate-900 font-bold">{s.rating}</span>
              </div>
              <button className="flex items-center gap-1 text-primary text-sm font-bold hover:underline">
                View History <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Suppliers;
