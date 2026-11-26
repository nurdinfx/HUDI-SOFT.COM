'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Calendar, Clock, Stethoscope, FileText, HeartPulse } from 'lucide-react'
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
  const getTodayStr = () => new Date().toISOString().split('T')[0]
  const getYesterdayStr = () => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d.toISOString().split('T')[0]
  }

  const [selectedDate, setSelectedDate] = useState(getTodayStr())
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [form, setForm] = useState({
    patientId: '', doctorId: '', appointmentDate: getTodayStr(),
    timeSlot: '09:00', type: 'Consultation', chiefComplaint: '', duration: 30,
  })

  const load = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (selectedDate) params.date = selectedDate
      if (statusFilter) params.status = statusFilter
      const [apptRes, summaryRes] = await Promise.all([
        api.get('/appointments', { params }),
        api.get('/appointments/today'),
      ])
      setAppointments(apptRes.data?.appointments || [])
      setSummary(summaryRes.data)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [selectedDate, statusFilter])

  useEffect(() => {
    Promise.all([
      api.get('/patients', { params: { limit: 100 } }),
      api.get('/clinic/staff'),
    ]).then(([p, s]: [any, any]) => {
      setPatients(p.data.patients || [])
      setDoctors((s.data || []).filter((u: ClinicUser) => ['doctor', 'clinic_manager', 'super_admin'].includes(u.role)))
    }).catch(() => {})
  }, [])

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.put(`/appointments/${id}`, { status })
      load()
    } catch (err: any) { alert(err.response?.data?.message || 'Error') }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
          ].map((s: { label: string; value: number; color: string }) => (
            <div key={s.label} className="glass-card p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap items-center gap-3">
        {/* Quick Date Presets */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setSelectedDate(getTodayStr())}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedDate === getTodayStr()
                ? 'bg-white dark:bg-slate-700 text-primary shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate(getYesterdayStr())}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedDate === getYesterdayStr()
                ? 'bg-white dark:bg-slate-700 text-primary shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Yesterday (Shalay)
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedDate === ''
                ? 'bg-white dark:bg-slate-700 text-primary shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            All Dates (Dhammaan)
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedDate(e.target.value)}
            className="dcs-input w-auto"
          />
        </div>
        <select value={statusFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)} className="dcs-input w-auto">
          <option value="">All Statuses</option>
          {['Scheduled','Confirmed','Checked-In','In Progress','Completed','Cancelled','No Show'].map((s: string) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <button onClick={() => { setSelectedDate(getTodayStr()); setStatusFilter('') }} className="btn-ghost text-xs">
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
        <div className="glass-card py-16 text-center text-slate-400 space-y-3">
          <Calendar className="w-12 h-12 mx-auto mb-1 opacity-30" />
          <p className="font-semibold text-slate-700 dark:text-slate-300">
            {selectedDate ? `No appointments found for ${selectedDate}` : 'No appointments found'}
          </p>
          <p className="text-xs text-slate-400">
            {selectedDate
              ? 'Check other dates or click "All Dates" to see all recorded appointments.'
              : 'Click "New Appointment" to schedule one.'}
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            {selectedDate !== '' && (
              <button
                type="button"
                onClick={() => setSelectedDate('')}
                className="btn-secondary text-xs"
              >
                View All Appointments (Dhammaan)
              </button>
            )}
            {selectedDate !== getYesterdayStr() && (
              <button
                type="button"
                onClick={() => setSelectedDate(getYesterdayStr())}
                className="btn-secondary text-xs"
              >
                View Yesterday (Shalay)
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appt: Appointment, i: number) => (
            <motion.div
              key={appt.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`rounded-2xl border p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:shadow-glass transition-all ${statusColors[appt.status] || 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}
            >
              {/* Time & Date */}
              <div className="flex flex-col items-start gap-1 text-slate-700 dark:text-slate-300 shrink-0 min-w-28">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="font-bold text-base">{appt.timeSlot}</span>
                  <span className="text-xs text-slate-400">({appt.durationMinutes}m)</span>
                </div>
                {appt.appointmentDate && (
                  <span className="text-[11px] text-slate-500 font-medium">
                    {formatDate(appt.appointmentDate)}
                  </span>
                )}
              </div>

              {/* Patient */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {(appt.patientName || 'P')[0]}
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/patients/${appt.patientId}`}
                      className="font-semibold text-sm text-slate-900 dark:text-white truncate hover:text-primary transition-colors inline-block"
                      title="Open patient profile"
                    >
                      {appt.patientName}
                    </Link>
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

              {/* Clinical Quick Links */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Link
                  href="/consultations"
                  className="text-xs px-2.5 py-1 rounded-lg font-medium bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors flex items-center gap-1"
                  title="Start Consultation"
                >
                  <FileText className="w-3 h-3" />
                  Consultation
                </Link>
                <Link
                  href="/dental"
                  className="text-xs px-2.5 py-1 rounded-lg font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-1"
                  title="Dental Odontogram"
                >
                  <HeartPulse className="w-3 h-3" />
                  Odontogram
                </Link>
              </div>

              {/* Status + Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <span className={getStatusColor(appt.status)}>{appt.status}</span>
                {STATUS_ACTIONS[appt.status]?.map((action: string) => (
                  <button
                    key={action}
                    onClick={() => updateStatus(appt.id, action)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors ${
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
                  <select required value={form.patientId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({...form, patientId: e.target.value})} className="dcs-input">
                    <option value="">Select patient…</option>
                    {patients.map((p: Patient) => <option key={p.id} value={p.id}>{p.fullName} ({p.patientNumber})</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Doctor *</label>
                  <select required value={form.doctorId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({...form, doctorId: e.target.value})} className="dcs-input">
                    <option value="">Select doctor…</option>
                    {doctors.map((d: ClinicUser) => <option key={d.id} value={d.id}>{d.fullName}{d.specialization ? ` — ${d.specialization}` : ''}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Date *</label>
                    <input type="date" required value={form.appointmentDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({...form, appointmentDate: e.target.value})} className="dcs-input" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Time Slot *
                    </label>
                    <div className="relative">
                      <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="time"
                        required
                        value={form.timeSlot}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({...form, timeSlot: e.target.value})}
                        className="dcs-input pl-9"
                      />
                    </div>
                    {/* Quick popular presets */}
                    <div className="flex flex-wrap items-center gap-1 pt-0.5">
                      {['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '16:00', '18:00', '20:00'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setForm({...form, timeSlot: preset})}
                          className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-all ${
                            form.timeSlot === preset
                              ? 'bg-primary text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Type</label>
                    <select value={form.type} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({...form, type: e.target.value})} className="dcs-input">
                      {['Consultation','Follow-Up','Check-Up','Procedure','Emergency','Vaccination'].map((t: string) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Duration (min)</label>
                    <select value={form.duration} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({...form, duration: Number(e.target.value)})} className="dcs-input">
                      {[15,20,30,45,60,90].map((d: number) => <option key={d} value={d}>{d} min</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Chief Complaint</label>
                  <input value={form.chiefComplaint} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({...form, chiefComplaint: e.target.value})} className="dcs-input" placeholder="Patient's main concern…" />
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
