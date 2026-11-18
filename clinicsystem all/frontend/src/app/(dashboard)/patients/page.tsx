'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Filter, Download, UserCircle, Phone, Calendar, Droplets, Trash2, Edit, Eye } from 'lucide-react'
import api from '@/lib/api'
import { Patient } from '@/types'
import { formatDate, getAgeFromDOB, getInitials, getStatusColor } from '@/lib/utils'

export default function PatientsPage() {
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editPatient, setEditPatient] = useState<Patient | null>(null)
  const [form, setForm] = useState({ fullName: '', gender: 'Male', phone: '', dateOfBirth: '', bloodType: 'Unknown', notes: '' })

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/patients', { params: { search, page, limit: 15 } })
      setPatients(data.patients)
      setTotal(data.total)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [search, page])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editPatient) {
        await api.put(`/patients/${editPatient.id}`, form)
      } else {
        await api.post('/patients', form)
      }
      setShowForm(false)
      setEditPatient(null)
      setForm({ fullName: '', gender: 'Male', phone: '', dateOfBirth: '', bloodType: 'Unknown', notes: '' })
      load()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error saving patient')
    }
  }

  const bloodColors: Record<string, string> = {
    'A+': 'bg-red-100 text-red-600', 'A-': 'bg-red-100 text-red-600',
    'B+': 'bg-orange-100 text-orange-600', 'B-': 'bg-orange-100 text-orange-600',
    'AB+': 'bg-purple-100 text-purple-600', 'AB-': 'bg-purple-100 text-purple-600',
    'O+': 'bg-blue-100 text-blue-600', 'O-': 'bg-blue-100 text-blue-600',
    'Unknown': 'bg-slate-100 text-slate-500',
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Patient Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{total} registered patients</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => { setEditPatient(null); setForm({ fullName: '', gender: 'Male', phone: '', dateOfBirth: '', bloodType: 'Unknown', notes: '' }); setShowForm(true) }} className="btn-primary">
            <Plus className="w-4 h-4" /> New Patient
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, phone, or patient number…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="dcs-input pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                {['Patient', 'Gender / Age', 'Contact', 'Blood Type', 'Registered', 'Actions'].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : patients.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                  <UserCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No patients found</p>
                </td></tr>
              ) : patients.map((p, i) => (
                <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {getInitials(p.fullName)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{p.fullName}</p>
                        <p className="text-xs text-slate-500">{p.patientNumber}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm text-slate-700 dark:text-slate-300">{p.gender}</p>
                    {p.dateOfBirth && <p className="text-xs text-slate-500">{getAgeFromDOB(p.dateOfBirth)} years</p>}
                  </td>
                  <td className="px-5 py-4">
                    {p.phone ? (
                      <div className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
                        <Phone className="w-3.5 h-3.5 text-slate-400" /> {p.phone}
                      </div>
                    ) : <span className="text-slate-400 text-sm">—</span>}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`badge text-xs px-2.5 py-1 rounded-full font-semibold ${bloodColors[p.bloodType || 'Unknown'] || bloodColors.Unknown}`}>
                      <Droplets className="w-3 h-3 inline mr-1" />{p.bloodType || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500">{formatDate(p.createdAt)}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => router.push(`/patients/${p.id}`)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-primary transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setEditPatient(p); setForm({ fullName: p.fullName, gender: p.gender, phone: p.phone || '', dateOfBirth: p.dateOfBirth?.split('T')[0] || '', bloodType: p.bloodType || 'Unknown', notes: p.notes || '' }); setShowForm(true) }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-primary transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 15 && (
          <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <p className="text-xs text-slate-500">Showing {Math.min((page-1)*15+1, total)}–{Math.min(page*15, total)} of {total}</p>
            <div className="flex gap-2">
              <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40">Prev</button>
              <button disabled={page*15>=total} onClick={() => setPage(p=>p+1)} className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={() => setShowForm(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="modal-panel max-w-lg">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5">
                {editPatient ? 'Edit Patient' : 'Register New Patient'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name *</label>
                    <input value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} required className="dcs-input" placeholder="Ahmed Ibrahim Ali" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Gender *</label>
                    <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} className="dcs-input">
                      <option>Male</option><option>Female</option><option>Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Date of Birth</label>
                    <input type="date" value={form.dateOfBirth} onChange={e => setForm({...form, dateOfBirth: e.target.value})} className="dcs-input" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone</label>
                    <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="dcs-input" placeholder="+252 61 …" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Blood Type</label>
                    <select value={form.bloodType} onChange={e => setForm({...form, bloodType: e.target.value})} className="dcs-input">
                      {['A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown'].map(b => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Notes</label>
                    <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="dcs-input resize-none" rows={2} />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" className="btn-primary">{editPatient ? 'Save Changes' : 'Register Patient'}</button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
