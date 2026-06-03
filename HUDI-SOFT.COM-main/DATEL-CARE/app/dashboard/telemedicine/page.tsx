"use client"

import { Video, Mic, MicOff, PhoneOff, MonitorUp, Settings, FileText, UserCircle } from "lucide-react"

export default function TelemedicinePage() {
  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 mb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <Video className="text-blue-500" />
            Teleconsultation Room
          </h1>
          <p className="text-slate-500">Secure WebRTC video session.</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-red-50 text-red-600 rounded-full text-xs font-black uppercase tracking-widest animate-pulse">
          <span className="w-2 h-2 rounded-full bg-red-600" /> Live Session: 14:02
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        
        {/* Video Area */}
        <div className="lg:col-span-3 bg-slate-900 rounded-3xl overflow-hidden relative shadow-2xl flex flex-col border border-slate-800">
          
          {/* Main Patient Video (Mock) */}
          <div className="flex-1 relative bg-black flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 opacity-60" />
            <UserCircle size={120} className="text-slate-700 relative z-10" />
            <div className="absolute bottom-6 left-6 px-4 py-2 bg-black/60 backdrop-blur-md text-white rounded-xl text-sm font-bold border border-white/10">
              Patient: Ahmed Ali
            </div>
            
            {/* PiP Doctor Video (Mock) */}
            <div className="absolute top-6 right-6 w-48 h-32 bg-slate-800 rounded-2xl border-2 border-slate-700 shadow-2xl flex items-center justify-center overflow-hidden">
              <UserCircle size={40} className="text-slate-600" />
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md text-white rounded text-[10px] font-bold">
                You (Dr. Sarah)
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="h-24 bg-slate-950 flex items-center justify-center gap-6 px-8 border-t border-slate-800">
            <button className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-white hover:bg-slate-700 transition-colors">
              <Mic size={24} />
            </button>
            <button className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-white hover:bg-slate-700 transition-colors">
              <Video size={24} />
            </button>
            <button className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-white hover:bg-slate-700 transition-colors">
              <MonitorUp size={24} />
            </button>
            <button className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-white hover:bg-slate-700 transition-colors">
              <Settings size={24} />
            </button>
            <button className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center text-white hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 ml-8">
              <PhoneOff size={28} />
            </button>
          </div>
        </div>

        {/* Sidebar Tools */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 flex flex-col h-full overflow-hidden">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Live Consultation Notes</h3>
          
          <div className="flex-1 flex flex-col gap-4">
            <textarea 
              className="w-full flex-1 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl resize-none outline-none focus:ring-2 focus:ring-clinical-500 text-sm font-medium"
              placeholder="Type your medical observations here... These will be saved directly to the patient's EHR."
              defaultValue="Patient reports dry cough for 3 days. No fever. Slight chest tightness."
            />
            
            <div className="grid grid-cols-2 gap-3">
              <button className="p-3 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors">
                <FileText size={16} /> Load History
              </button>
              <button className="p-3 bg-clinical-50 text-clinical-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-clinical-100 transition-colors">
                Write Rx
              </button>
            </div>
            
            <button className="w-full py-4 bg-clinical-600 text-white rounded-xl font-bold text-sm hover:bg-clinical-700 transition-colors shadow-md shadow-clinical-500/20 mt-4">
              Save to EHR
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
