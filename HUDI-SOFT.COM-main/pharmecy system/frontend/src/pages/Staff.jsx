import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, UserPlus, Shield, Mail, Phone, MapPin, Search, Edit3, Trash2 } from 'lucide-react';

const Staff = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  // In a real app, this would fetch from /api/v1/auth/users
  useEffect(() => {
    // Mocking staff data
    setTimeout(() => {
      setStaff([
        { id: 1, name: 'Ahmed Ali', email: 'ahmed@example.com', role: 'Branch Manager', phone: '+252 615 123456', branch: 'Main Pharmacy', status: 'Active' },
        { id: 2, name: 'Sadiya Jeylani', email: 'sadiya@example.com', role: 'Pharmacist', phone: '+252 615 654321', branch: 'Downtown Branch', status: 'Active' },
        { id: 3, name: 'Abdi Nuur', email: 'abdi@example.com', role: 'Cashier', phone: '+252 615 987654', branch: 'Main Pharmacy', status: 'Away' },
      ]);
      setLoading(false);
    }, 800);
  }, []);

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Staff Management</h1>
          <p className="text-slate-500 font-medium">Manage your team across all pharmacy branches.</p>
        </div>
        <button className="bg-primary text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 flex items-center gap-2 hover:scale-105 transition-transform">
          <UserPlus className="w-5 h-5" />
          Add Employee
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Staff</p>
            <h3 className="text-2xl font-black text-slate-900">12</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-green-50 text-green-600 rounded-2xl">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Admins & Managers</p>
            <h3 className="text-2xl font-black text-slate-900">4</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Branches</p>
            <h3 className="text-2xl font-black text-slate-900">3</h3>
          </div>
        </div>
      </div>

      {/* Staff List */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search staff by name or email..." 
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex gap-2">
            <select className="bg-slate-50 border-none text-sm font-bold text-slate-500 rounded-xl px-4 py-3">
              <option>All Branches</option>
              <option>Main Pharmacy</option>
              <option>Downtown</option>
            </select>
            <select className="bg-slate-50 border-none text-sm font-bold text-slate-500 rounded-xl px-4 py-3">
              <option>All Roles</option>
              <option>Pharmacist</option>
              <option>Cashier</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-widest">
              <tr>
                <th className="px-8 py-4">Employee</th>
                <th className="px-8 py-4">Contact</th>
                <th className="px-8 py-4">Role</th>
                <th className="px-8 py-4">Branch</th>
                <th className="px-8 py-4">Status</th>
                <th className="px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="6" className="p-8 text-center text-slate-400">Loading staff directory...</td></tr>
              ) : staff.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{member.name}</p>
                        <p className="text-xs text-slate-400">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Phone className="w-4 h-4" />
                      <span className="text-sm font-medium">{member.phone}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">{member.role}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-slate-500">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm font-medium">{member.branch}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`flex items-center gap-1.5 text-xs font-bold ${member.status === 'Active' ? 'text-green-600' : 'text-orange-500'}`}>
                      <div className={`w-2 h-2 rounded-full ${member.status === 'Active' ? 'bg-green-600' : 'bg-orange-500'}`}></div>
                      {member.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 hover:bg-primary/10 text-slate-400 hover:text-primary rounded-lg transition-colors">
                        <Edit3 className="w-5 h-5" />
                      </button>
                      <button className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
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

export default Staff;
