'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Calendar, Clock, User, Stethoscope, CheckCircle2, XCircle, Search } from 'lucide-react'
import api from '@/lib/api'
import { Appointment, Patient, ClinicUser } from '@/types'
import { formatDate, getStatusColor } from '@/lib/utils'

const STATUS_ACTIONS: Record<string, string[]> = {
  Scheduled:   ['Confirmed', 'Cancelled'],
  Confirmed:   ['Checked-In', 'Cancelled'],
  'Checked-In':['In Progress'],
  'In Progress':['Completed'],
  Completed:   [],
  Cancelled:   [],
  'No Show':   [],
}

export default function AppointmentsPage() {
  const [summary, setSummary] = useState<any>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<ClinicUser[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [form, setForm] = useState({
    patientId: '', doctorId: '', appointmentDate: new Date().toISOString().split('T')[0],
    timeSlot: '09:00', type: 'Consultation', chiefComplaint: '', duration: 30,
  })

  const TIME_SLOTS = Array.from({ length: 18 }, (_, i) => {
    const h = Math.floor(i / 2) + 8
    const m = i % 2 === 0 ? '00' : '30'
    return `${String(h).padStart(2, '0')}:${m}`
  })

  const load = async () => {
    setLoading(true)
    try {
      const params: any = { date: selectedDate }
      if (statusFilter) params.status = statusFilter
      const [apptRes, summaryRes] = await Promise.all([
        api.get('/appointments', { params }),
        api.get('/appointments/today'),
      ])
      setAppointments(apptRes.data.appointments)
      setSummary(summaryRes.data)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [selectedDate, statusFilter])

  useEffect(() => {
    Promise.all([
      api.get('/patients', { params: { limit: 100 } }),
      api.get('/clinic/staff'),
    ]).then(([p, s]) => {
      setPatients(p.data.patients)
      setDoctors(s.data.filter((u: ClinicUser) => ['doctor', 'clinic_manager', 'super_admin'].includes(u.role)))
    }).catch(() => {})
  }, [])

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.put(`/appointments/${id}`, { status })
      load()
    } catch (err: any) { alert(err.response?.data?.message || 'Error') }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/appointments', form)
      setShowForm(false)
      load()
    } catch (err: any) { alert(err.response?.data?.message || 'Error creating appointment') }
  }

  const statusColors: Record<string, string> = {
    Scheduled: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800',
    Confirmed: 'bg-teal-50 dark:bg-teal-900/20 border-teal-100 dark:border-teal-800',
    'Checked-In': 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-800',
    'In Progress': 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800',
    Completed: 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800',
    Cancelled: 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800',
    'No Show': 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700',
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Appointments</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Schedule & manage patient appointments</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Appointment
        </button>
      </div>

      {/* Today's Summary Cards */}
      {summary && (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: 'Total', value: summary.total, color: 'text-slate-900 dark:text-white' },
            { label: 'Scheduled', value: summary.scheduled, color: 'text-blue-600' },
            { label: 'Confirmed', value: summary.confirmed, color: 'text-teal-600' },
            { label: 'Checked-In', value: summary.checkedIn, color: 'text-yellow-600' },
            { label: 'In Progress', value: summary.inProgress, color: 'text-orange-600' },
            { label: 'Completed', value: summary.completed, color: 'text-green-600' },
            { label: 'Cancelled', value: summary.cancelled, color: 'text-red-500' },
          ].map((s) => (
            <div key={s.label} className="glass-card p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="dcs-input w-auto"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="dcs-input w-auto">
          <option value="">All Statuses</option>
          {['Scheduled','Confirmed','Checked-In','In Progress','Completed','Cancelled','No Show'].map(s => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <button onClick={() => { setSelectedDate(new Date().toISOString().split('T')[0]); setStatusFilter('') }} className="btn-ghost text-xs">
          Reset
        </button>
      </div>

      {/* Appointment cards */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <div className="glass-card py-16 text-center text-slate-400">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No appointments for this date</p>
          <p className="text-sm mt-1">Click "New Appointment" to schedule one</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appt, i) => (
            <motion.div
              key={appt.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`rounded-2xl border p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:shadow-glass transition-all ${statusColors[appt.status] || 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}
            >
              {/* Time */}
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 shrink-0">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="font-bold text-base">{appt.timeSlot}</span>
                <span className="text-xs text-slate-400">({appt.durationMinutes}m)</span>
              </div>

              {/* Patient */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {(appt.patientName || 'P')[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{appt.patientName}</p>
                    <p className="text-xs text-slate-500">{appt.patientNumber} · {appt.type}</p>
                  </div>
                </div>
                {appt.chiefComplaint && (
                  <p className="mt-1.5 text-xs text-slate-500 italic ml-10 truncate">"{appt.chiefComplaint}"</p>
                )}
              </div>

              {/* Doctor */}
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 shrink-0">
                <Stethoscope className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="font-medium text-xs">{appt.doctorName}</p>
                  <p className="text-xs text-slate-400">{appt.specialization}</p>
                </div>
              </div>

              {/* Status + Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <span className={getStatusColor(appt.status)}>{appt.status}</span>
                {STATUS_ACTIONS[appt.status]?.map((action) => (
                  <button
                    key={action}
                    onClick={() => updateStatus(appt.id, action)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      action === 'Cancelled' ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-primary/10 text-primary hover:bg-primary/20'
                    }`}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* New Appointment Modal */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setShowForm(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="modal-panel max-w-lg">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5">Schedule Appointment</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Patient *</label>
                  <select required value={form.patientId} onChange={e => setForm({...form, patientId: e.target.value})} className="dcs-input">
                    <option value="">Select patient…</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.fullName} ({p.patientNumber})</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Doctor *</label>
                  <select required value={form.doctorId} onChange={e => setForm({...form, doctorId: e.target.value})} className="dcs-input">
                    <option value="">Select doctor…</option>
                    {doctors.map(d => <option key={d.id} value={d.id}>{d.fullName}{d.specialization ? ` — ${d.specialization}` : ''}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Date *</label>
                    <input type="date" required value={form.appointmentDate} onChange={e => setForm({...form, appointmentDate: e.target.value})} className="dcs-input" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Time Slot *</label>
                    <select required value={form.timeSlot} onChange={e => setForm({...form, timeSlot: e.target.value})} className="dcs-input">
                      {TIME_SLOTS.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Type</label>
                    <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="dcs-input">
                      {['Consultation','Follow-Up','Check-Up','Procedure','Emergency','Vaccination'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Duration (min)</label>
                    <select value={form.duration} onChange={e => setForm({...form, duration: Number(e.target.value)})} className="dcs-input">
                      {[15,20,30,45,60,90].map(d => <option key={d} value={d}>{d} min</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Chief Complaint</label>
                  <input value={form.chiefComplaint} onChange={e => setForm({...form, chiefComplaint: e.target.value})} className="dcs-input" placeholder="Patient's main concern…" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" className="btn-primary">Schedule Appointment</button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
