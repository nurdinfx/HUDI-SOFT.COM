import { useState } from 'react';
import { MessageSquare, Plus, Search, Clock, CheckCircle2, AlertCircle, Send, User } from 'lucide-react';

const Support = () => {
  const [tickets] = useState([
    { id: 'TK-882', subject: 'Printer not working with POS', status: 'In Progress', priority: 'High', date: '2 hours ago' },
    { id: 'TK-875', subject: 'How to add secondary admin?', status: 'Open', priority: 'Medium', date: '1 day ago' },
    { id: 'TK-860', subject: 'Subscription renewal failed', status: 'Resolved', priority: 'Urgent', date: '3 days ago' },
  ]);

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Support Center</h1>
          <p className="text-slate-500 font-medium">Get help from our technical experts.</p>
        </div>
        <button className="bg-primary text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 flex items-center gap-2 hover:scale-105 transition-transform">
          <Plus className="w-5 h-5" />
          New Ticket
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Ticket List */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search tickets..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-xs focus:ring-2 focus:ring-primary/20"
              />
            </div>
            
            <div className="space-y-3">
              {tickets.map((t) => (
                <div key={t.id} className={`p-4 rounded-2xl border transition-all cursor-pointer ${t.id === 'TK-882' ? 'bg-primary/5 border-primary/20 shadow-sm' : 'bg-white border-slate-100 hover:border-primary/20'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">{t.id}</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${t.priority === 'High' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>{t.priority}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{t.subject}</h4>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-[10px] text-slate-400 font-bold flex items-center">
                      <Clock className="w-3 h-3 mr-1" /> {t.date}
                    </span>
                    <span className={`text-[10px] font-black ${t.status === 'Resolved' ? 'text-green-600' : 'text-orange-500'}`}>{t.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Ticket Content */}
        <div className="md:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col min-h-[600px]">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-black text-slate-900">Printer not working with POS</h3>
                <span className="bg-red-50 text-red-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Urgent</span>
              </div>
              <p className="text-sm text-slate-400 font-medium mt-1">Started by nuur • Ticket ID: TK-882</p>
            </div>
            <button className="text-slate-400 hover:text-red-500 transition-colors">
              <CheckCircle2 className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 p-8 space-y-8 overflow-y-auto">
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                <User className="w-6 h-6 text-slate-400" />
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl rounded-tl-none space-y-2 max-w-[80%]">
                <p className="text-sm text-slate-700 leading-relaxed">
                  Hi Support, I'm trying to connect my thermal printer to the POS but it's not showing up in the print dialog. 
                  Can you help me configure it?
                </p>
                <span className="text-[10px] text-slate-400 font-bold">10:45 AM</span>
              </div>
            </div>

            <div className="flex gap-4 flex-row-reverse">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shrink-0">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div className="bg-primary text-white p-6 rounded-3xl rounded-tr-none space-y-2 max-w-[80%] shadow-lg shadow-primary/20">
                <p className="text-sm leading-relaxed">
                  Hello! Please make sure the printer is turned on and connected via USB. 
                  Also, check if you have installed the generic/text-only driver.
                </p>
                <span className="text-[10px] text-primary-foreground/70 font-bold">11:12 AM</span>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-slate-100">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Type your response..." 
                className="w-full pl-6 pr-16 py-4 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary/20"
              />
              <button className="absolute right-2 top-2 p-3 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
