'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UserCog, Plus, Search, Shield, Mail, Phone, Eye, EyeOff,
  Trash2, Edit2, CheckCircle, XCircle, Calendar
} from 'lucide-react'
import api from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { ClinicUser } from '@/types'
import { formatDate, getInitials } from '@/lib/utils'

const ROLES = [
  { value: 'clinic_manager', label: 'Clinic Manager' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'receptionist', label: 'Receptionist' },
  { value: 'pharmacist', label: 'Pharmacist' },
  { value: 'lab_staff', label: 'Lab Technician' },
  { value: 'accountant', label: 'Accountant' },
]

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  clinic_manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  doctor: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  receptionist: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  pharmacist: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  lab_staff: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  accountant: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

const emptyForm = { fullName: '', email: '', password: '', role: 'receptionist', phone: '', specialization: '' }

export default function EmployeesPage() {
  const { user } = useAuth()
  const [staff, setStaff] = useState<ClinicUser[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editStaff, setEditStaff] = useState<ClinicUser | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [showPw, setShowPw] = useState(false)
  const [filterRole, setFilterRole] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/clinic/staff')
      setStaff(data)
    } catch { } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = staff.filter(s => {
    const matchSearch = s.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase())
    const matchRole = filterRole === 'all' || s.role === filterRole
    return matchSearch && matchRole
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editStaff) {
        const { data } = await api.put(`/clinic/staff/${editStaff.id}`, form)
        setStaff(s => s.map(u => u.id === editStaff.id ? { ...u, ...data } : u))
      } else {
        const { data } = await api.post('/clinic/staff', form)
        setStaff(s => [...s, data])
      }
      setShowForm(false)
      setEditStaff(null)
      setForm(emptyForm)
    } catch (err: any) { alert(err.response?.data?.message || 'Error saving employee') }
  }

  const toggleActive = async (emp: ClinicUser) => {
    if (emp.id === user?.id) return alert('You cannot deactivate your own account.')
    try {
      await api.put(`/clinic/staff/${emp.id}`, { isActive: !emp.isActive })
      setStaff(s => s.map(u => u.id === emp.id ? { ...u, isActive: !u.isActive } : u))
    } catch { }
  }

  const handleDelete = async (emp: ClinicUser) => {
    if (emp.id === user?.id) return alert('You cannot delete your own account.')
    if (!confirm(`Remove ${emp.fullName} from the clinic? This action cannot be undone.`)) return
    try {
      await api.delete(`/clinic/staff/${emp.id}`)
      setStaff(s => s.filter(u => u.id !== emp.id))
    } catch (err: any) { alert(err.response?.data?.message || 'Error') }
  }

  const openEdit = (emp: ClinicUser) => {
    setEditStaff(emp)
    setForm({ fullName: emp.fullName, email: emp.email, password: '', role: emp.role, phone: emp.phone || '', specialization: emp.specialization || '' })
    setShowForm(true)
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Employee Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage clinic staff accounts, roles, and access</p>
        </div>
        <button onClick={() => { setEditStaff(null); setForm(emptyForm); setShowForm(true) }} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Staff', count: staff.length, color: 'text-primary' },
          { label: 'Active', count: staff.filter(s => s.isActive).length, color: 'text-emerald-600' },
          { label: 'Doctors', count: staff.filter(s => s.role === 'doctor').length, color: 'text-teal-600' },
          { label: 'Inactive', count: staff.filter(s => !s.isActive).length, color: 'text-red-500' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="glass-card p-4">
            <p className={`text-3xl font-black ${stat.color}`}>{stat.count}</p>
            <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="dcs-input pl-10" placeholder="Search by name or email…" />
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="dcs-input sm:w-48">
          <option value="all">All Roles</option>
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {/* Employee Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card p-5 space-y-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card py-16 text-center text-slate-400">
          <UserCog className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No employees found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((emp, i) => (
            <motion.div key={emp.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className={`glass-card p-5 transition-all ${!emp.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {getInitials(emp.fullName || 'U')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{emp.fullName}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[emp.role] || ROLE_COLORS.receptionist} capitalize`}>
                        {emp.role.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {emp.isActive
                        ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                        : <XCircle className="w-4 h-4 text-red-400" />
                      }
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{emp.email}</span>
                    </div>
                    {emp.phone && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span>{emp.phone}</span>
                      </div>
                    )}
                    {emp.specialization && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Shield className="w-3.5 h-3.5 shrink-0" />
                        <span>{emp.specialization}</span>
                      </div>
                    )}
                    {emp.lastLogin && (
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>Last login: {formatDate(emp.lastLogin)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <button onClick={() => openEdit(emp)} className="btn-ghost text-xs py-1 px-3 flex items-center gap-1">
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button onClick={() => toggleActive(emp)}
                      className={`btn-ghost text-xs py-1 px-3 flex items-center gap-1 ${emp.isActive ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {emp.isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      {emp.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    {emp.id !== user?.id && (
                      <button onClick={() => handleDelete(emp)} className="btn-ghost text-xs py-1 px-3 text-red-500 flex items-center gap-1 ml-auto">
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setShowForm(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="modal-panel max-w-lg">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5">
                {editStaff ? 'Edit Employee' : 'Add New Employee'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name *</label>
                    <input required value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} className="dcs-input" placeholder="Dr. Ahmed Hassan" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email *</label>
                    <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="dcs-input" placeholder="doctor@clinic.com" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{editStaff ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                    <div className="relative">
                      <input type={showPw ? 'text' : 'password'} required={!editStaff} value={form.password}
                        onChange={e => setForm({ ...form, password: e.target.value })} className="dcs-input pr-10" placeholder="Min. 8 characters" />
                      <button type="button" onClick={() => setShowPw(!showPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Role *</label>
                    <select required value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="dcs-input">
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone</label>
                    <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="dcs-input" placeholder="+252 61 …" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Specialization (Doctors)</label>
                    <input value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} className="dcs-input" placeholder="General Medicine, Dentistry…" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => { setShowForm(false); setEditStaff(null) }} className="btn-secondary">Cancel</button>
                  <button type="submit" className="btn-primary">{editStaff ? 'Save Changes' : 'Add Employee'}</button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
