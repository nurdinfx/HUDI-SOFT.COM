"use client"

import { useState, useEffect } from "react"
import { db, Appointment } from "@/lib/db-store"
import { Search, Plus, Calendar, Clock, Edit2, Trash2, CheckCircle, AlertTriangle } from "lucide-react"

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editingApt, setEditingApt] = useState<Appointment | null>(null)

  // Form Fields
  const [patientName, setPatientName] = useState("")
  const [doctorName, setDoctorName] = useState("Dr. Sarah Jenkins")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [reason, setReason] = useState("")
  const [status, setStatus] = useState<Appointment["status"]>("Scheduled")
  const [urgent, setUrgent] = useState(false)

  useEffect(() => {
    setAppointments(db.getAppointments())
  }, [])

  const filteredApts = appointments.filter(a =>
    a.patientName.toLowerCase().includes(search.toLowerCase()) ||
    a.doctorName.toLowerCase().includes(search.toLowerCase()) ||
    a.reason.toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    let updated: Appointment[] = []

    if (editingApt) {
      updated = appointments.map(a => 
        a.id === editingApt.id 
          ? { ...a, patientName, doctorName, date, time, reason, status, urgent } 
          : a
      )
    } else {
      const newApt: Appointment = {
        id: `APT-${String(appointments.length + 101).padStart(3, '0')}`,
        patientId: `PT-${Math.floor(Math.random() * 1000)}`,
        patientName,
        doctorName,
        date,
        time,
        reason,
        status,
        urgent
      }
      updated = [...appointments, newApt]
    }

    db.saveAppointments(updated)
    setAppointments(updated)
    resetForm()
  }

  const handleEdit = (apt: Appointment) => {
    setEditingApt(apt)
    setPatientName(apt.patientName)
    setDoctorName(apt.doctorName)
    setDate(apt.date)
    setTime(apt.time)
    setReason(apt.reason)
    setStatus(apt.status)
    setUrgent(apt.urgent || false)
    setShowModal(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to cancel and delete this appointment?")) {
      const updated = appointments.filter(a => a.id !== id)
      db.saveAppointments(updated)
      setAppointments(updated)
    }
  }

  const resetForm = () => {
    setPatientName("")
    setDoctorName("Dr. Sarah Jenkins")
    setDate("")
    setTime("")
    setReason("")
    setStatus("Scheduled")
    setUrgent(false)
    setEditingApt(null)
    setShowModal(false)
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Appointments & Queue</h1>
          <p className="text-slate-500">Schedule examinations, track consultant queues, and manage urgent care intake.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true) }}
          className="px-5 py-2.5 bg-clinical-600 text-white rounded-xl font-bold text-sm hover:bg-clinical-700 transition-colors shadow-md shadow-clinical-500/20 flex items-center gap-2"
        >
          <Plus size={18} /> Schedule Appointment
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex-1 flex flex-col overflow-hidden">
        
        {/* Toolbar */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by patient, doctor, or reason..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 font-medium text-sm transition-all"
            />
          </div>
        </div>

        {/* Appointment Table */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-widest text-slate-500">
                <th className="p-4 pl-6">Appointment ID</th>
                <th className="p-4">Patient</th>
                <th className="p-4">Assigned Consultant</th>
                <th className="p-4">Schedule Details</th>
                <th className="p-4">Reason / Notes</th>
                <th className="p-4">Intake Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filteredApts.map((apt) => (
                <tr key={apt.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors group">
                  <td className="p-4 pl-6">
                    <span className="font-bold font-mono text-xs text-slate-500 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">
                      {apt.id}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      {apt.patientName}
                      {apt.urgent && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[9px] font-black uppercase tracking-wider rounded flex items-center gap-1">
                          <AlertTriangle size={8} /> Urgent
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-sm font-semibold text-slate-700 dark:text-slate-300">{apt.doctorName}</td>
                  <td className="p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                        <Calendar size={12} /> {apt.date}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                        <Clock size={11} /> {apt.time}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-500 max-w-xs truncate">{apt.reason}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      apt.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                      apt.status === 'In Consultation' ? 'bg-blue-100 text-blue-700' :
                      apt.status === 'Waiting' ? 'bg-orange-100 text-orange-700' :
                      apt.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {apt.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleEdit(apt)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(apt.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Dialog */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-2xl relative">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6">
              {editingApt ? "Modify Scheduled Appointment" : "Schedule New Examination"}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Patient Name</label>
                <input 
                  type="text" required value={patientName} onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 text-sm font-medium"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Assigned Medical Officer</label>
                <select 
                  value={doctorName} onChange={(e) => setDoctorName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 text-sm font-medium"
                >
                  <option value="Dr. Sarah Jenkins">Dr. Sarah Jenkins</option>
                  <option value="Dr. Hassan Ali">Dr. Hassan Ali</option>
                  <option value="Dr. Fartun Mohamed">Dr. Fartun Mohamed</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Date</label>
                  <input 
                    type="date" required value={date} onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Time</label>
                  <input 
                    type="text" required placeholder="10:30 AM" value={time} onChange={(e) => setTime(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Reason / Symptoms</label>
                <textarea 
                  value={reason} onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 text-sm font-medium h-20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Intake Status</label>
                  <select 
                    value={status} onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 text-sm font-medium"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Waiting">Waiting</option>
                    <option value="In Consultation">In Consultation</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="flex items-center pt-5 pl-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input 
                      type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)}
                      className="w-4 h-4 rounded text-clinical-600 focus:ring-clinical-500"
                    />
                    Urgent Intake
                  </label>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button" onClick={resetForm}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-clinical-600 text-white rounded-xl font-bold text-sm hover:bg-clinical-700 shadow-md shadow-clinical-500/20"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
