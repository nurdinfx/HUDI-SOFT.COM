'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, CheckCircle, LogIn, LogOut, Calendar,
  Users, AlertCircle, ChevronLeft, ChevronRight, ClipboardEdit
} from 'lucide-react'
import api from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { formatDate } from '@/lib/utils'

interface AttendanceRecord {
  id?: string
  userId: string
  employeeName: string
  employeeRole: string
  employeeEmail: string
  workDate: string
  clockIn?: string
  clockOut?: string
  status?: 'Present' | 'Late' | 'Absent' | 'Half-Day'
  notes?: string
}

const STATUS_COLORS: Record<string, string> = {
  Present: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Late: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Absent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'Half-Day': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}

function formatTime(ts?: string) {
  if (!ts) return '—'
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function calcHours(clockIn?: string, clockOut?: string) {
  if (!clockIn || !clockOut) return '—'
  const diff = (new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 3600000
  return `${diff.toFixed(1)}h`
}

export default function AttendancePage() {
  const { user } = useAuth()
  const isManager = user?.role === 'clinic_manager' || user?.role === 'super_admin'

  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [myRecord, setMyRecord] = useState<AttendanceRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [clockLoading, setClockLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [showManualModal, setShowManualModal] = useState(false)
  const [manualForm, setManualForm] = useState({ userId: '', date: selectedDate, status: 'Present', notes: '' })
  const [staff, setStaff] = useState<any[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [attRes, myRes] = await Promise.all([
        api.get('/attendance', { params: { date: selectedDate } }),
        api.get('/attendance/me'),
      ])
      setRecords(attRes.data)
      setMyRecord(myRes.data)
    } catch { } finally { setLoading(false) }
  }, [selectedDate])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (isManager) {
      api.get('/clinic/staff').then(r => setStaff(r.data)).catch(() => { })
    }
  }, [isManager])

  const handleClockIn = async () => {
    setClockLoading(true)
    try {
      const { data } = await api.post('/attendance/clock-in')
      setMyRecord(data)
      load()
    } catch (err: any) { alert(err.response?.data?.message || 'Error') }
    finally { setClockLoading(false) }
  }

  const handleClockOut = async () => {
    setClockLoading(true)
    try {
      const { data } = await api.post('/attendance/clock-out')
      setMyRecord(data)
      load()
    } catch (err: any) { alert(err.response?.data?.message || 'Error') }
    finally { setClockLoading(false) }
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/attendance/manual', manualForm)
      setShowManualModal(false)
      load()
    } catch (err: any) { alert(err.response?.data?.message || 'Error') }
  }

  const changeDate = (days: number) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + days)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const presentCount = records.filter(r => r.status === 'Present').length
  const lateCount = records.filter(r => r.status === 'Late').length
  const absentCount = records.filter(r => !r.status || r.status === 'Absent').length

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Attendance Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Track staff clock-in/out and daily attendance</p>
        </div>
        <div className="flex items-center gap-3">
          {isManager && (
            <button onClick={() => { setManualForm({ userId: '', date: selectedDate, status: 'Present', notes: '' }); setShowManualModal(true) }}
              className="btn-secondary flex items-center gap-2">
              <ClipboardEdit className="w-4 h-4" /> Manual Entry
            </button>
          )}
        </div>
      </div>

      {/* My Clock-In Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 border-l-4 border-primary">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-glow-blue shrink-0">
              <Clock className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Today — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              <p className="font-bold text-xl text-slate-900 dark:text-white">{user?.fullName}</p>
              {myRecord ? (
                <div className="flex items-center gap-4 mt-1 flex-wrap">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    In: <span className="font-semibold text-emerald-600">{formatTime(myRecord.clockIn)}</span>
                  </span>
                  {myRecord.clockOut && (
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Out: <span className="font-semibold text-blue-600">{formatTime(myRecord.clockOut)}</span>
                    </span>
                  )}
                  {myRecord.clockIn && myRecord.clockOut && (
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Hours: <span className="font-semibold">{calcHours(myRecord.clockIn, myRecord.clockOut)}</span>
                    </span>
                  )}
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[myRecord.status || 'Present']}`}>
                    {myRecord.status || 'Present'}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-slate-400 mt-1">Not clocked in yet</p>
              )}
            </div>
          </div>
          <div className="flex gap-3 shrink-0">
            {!myRecord?.clockIn && (
              <button onClick={handleClockIn} disabled={clockLoading}
                className="btn-primary flex items-center gap-2 disabled:opacity-60">
                <LogIn className="w-4 h-4" />
                {clockLoading ? 'Please wait...' : 'Clock In'}
              </button>
            )}
            {myRecord?.clockIn && !myRecord?.clockOut && (
              <button onClick={handleClockOut} disabled={clockLoading}
                className="btn-secondary flex items-center gap-2 border-red-400 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-60">
                <LogOut className="w-4 h-4" />
                {clockLoading ? 'Please wait...' : 'Clock Out'}
              </button>
            )}
            {myRecord?.clockIn && myRecord?.clockOut && (
              <div className="flex items-center gap-2 text-emerald-600 font-medium">
                <CheckCircle className="w-5 h-5" />
                <span>Shift completed — {calcHours(myRecord.clockIn, myRecord.clockOut)}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Present', count: presentCount, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
          { label: 'Late', count: lateCount, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
          { label: 'Absent', count: absentCount, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="glass-card p-4 text-center">
            <div className={`text-3xl font-black ${s.color}`}>{s.count}</div>
            <div className="text-sm text-slate-500 mt-1">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Date Picker */}
      <div className="flex items-center gap-3">
        <button onClick={() => changeDate(-1)} className="btn-ghost p-2"><ChevronLeft className="w-5 h-5" /></button>
        <div className="flex items-center gap-2 glass-card px-4 py-2">
          <Calendar className="w-4 h-4 text-primary" />
          <input type="date" value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="bg-transparent text-sm font-semibold text-slate-900 dark:text-white outline-none" />
        </div>
        <button onClick={() => changeDate(1)} className="btn-ghost p-2"><ChevronRight className="w-5 h-5" /></button>
        <button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
          className="btn-secondary text-xs py-1.5">Today</button>
      </div>

      {/* Attendance Table */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-slate-900 dark:text-white">
            Staff Attendance — {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                {['Employee', 'Role', 'Clock In', 'Clock Out', 'Hours', 'Status', 'Notes'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>{[...Array(7)].map((_, j) => (
                    <td key={j} className="px-5 py-4"><div className="h-4 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" /></td>
                  ))}</tr>
                ))
              ) : records.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                  <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  No attendance records for this date
                </td></tr>
              ) : records.map((r, i) => (
                <motion.tr key={r.userId || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-sm text-slate-900 dark:text-white">{r.employeeName}</p>
                    <p className="text-xs text-slate-400">{r.employeeEmail}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500 capitalize">{(r.employeeRole || '').replace(/_/g, ' ')}</td>
                  <td className="px-5 py-4 text-sm font-mono font-medium text-emerald-600">{formatTime(r.clockIn)}</td>
                  <td className="px-5 py-4 text-sm font-mono font-medium text-blue-600">{formatTime(r.clockOut)}</td>
                  <td className="px-5 py-4 text-sm font-bold text-slate-700 dark:text-slate-300">{calcHours(r.clockIn, r.clockOut)}</td>
                  <td className="px-5 py-4">
                    {r.status ? (
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[r.status]}`}>{r.status}</span>
                    ) : (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Absent</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-400">{r.notes || '—'}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Entry Modal */}
      <AnimatePresence>
        {showManualModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setShowManualModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="modal-panel max-w-md">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5">Manual Attendance Entry</h2>
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Employee *</label>
                  <select required value={manualForm.userId} onChange={e => setManualForm({ ...manualForm, userId: e.target.value })} className="dcs-input">
                    <option value="">Select employee…</option>
                    {staff.map((s: any) => <option key={s.id} value={s.id}>{s.fullName} ({s.role})</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Date *</label>
                  <input type="date" required value={manualForm.date} onChange={e => setManualForm({ ...manualForm, date: e.target.value })} className="dcs-input" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status *</label>
                  <select required value={manualForm.status} onChange={e => setManualForm({ ...manualForm, status: e.target.value })} className="dcs-input">
                    {['Present', 'Late', 'Absent', 'Half-Day'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Notes</label>
                  <textarea value={manualForm.notes} onChange={e => setManualForm({ ...manualForm, notes: e.target.value })} className="dcs-input" rows={3} placeholder="Optional notes…" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowManualModal(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" className="btn-primary">Save Entry</button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
