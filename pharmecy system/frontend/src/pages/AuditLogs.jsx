import { useState } from 'react';
import { History, Search, Filter, Shield, User, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

const AuditLogs = () => {
  const [logs] = useState([
    { id: 1, user: 'Ahmed Ali', action: 'CREATE_BRANCH', resource: 'Branch', details: 'Added Downtown Branch', time: '2 mins ago', type: 'info' },
    { id: 2, user: 'nuur', action: 'LOGIN', resource: 'Auth', details: 'Successful login from 192.168.1.1', time: '15 mins ago', type: 'success' },
    { id: 3, user: 'Sadiya Jeylani', action: 'DELETE_SALE', resource: 'Sale', details: 'Deleted Sale #8841 (Amount: $45)', time: '1 hour ago', type: 'warning' },
    { id: 4, user: 'System', action: 'BACKUP', resource: 'Database', details: 'Automatic daily backup completed', time: '5 hours ago', type: 'success' },
  ]);

  const getTypeStyle = (type) => {
    switch(type) {
      case 'success': return 'bg-green-50 text-green-600 border-green-100';
      case 'warning': return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-blue-50 text-blue-600 border-blue-100';
    }
  };

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900">System Audit Logs</h1>
          <p className="text-slate-500 font-medium">Trace every action and change made in your business.</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-bold hover:bg-slate-50 transition-colors flex items-center gap-2">
            <History className="w-5 h-5" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by action, user, or details..." 
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button className="p-3 bg-slate-50 rounded-xl text-slate-500 hover:text-primary transition-colors">
            <Filter className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="p-6 rounded-3xl border border-slate-100 hover:border-primary/20 transition-all flex items-center justify-between group">
              <div className="flex items-center gap-5">
                <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${getTypeStyle(log.type)}`}>
                  {log.action === 'LOGIN' ? <User className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900">{log.action}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">{log.resource}</span>
                  </div>
                  <p className="text-sm text-slate-500 font-medium">{log.details}</p>
                </div>
              </div>
              <div className="text-right flex items-center gap-8">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-900">{log.user}</p>
                  <p className="text-xs text-slate-400 flex items-center justify-end">
                    <Clock className="w-3 h-3 mr-1" /> {log.time}
                  </p>
                </div>
                <button className="p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-50 rounded-xl text-slate-400 hover:text-primary">
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
