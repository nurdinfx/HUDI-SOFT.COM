'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClipboardList, Plus, Search, Pill, User, Printer,
  CheckCircle, Clock, X, Trash2, AlertCircle
} from 'lucide-react'
import api from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { formatDate } from '@/lib/utils'

interface Prescription {
  id: string
  consultationId?: string
  patientId: string
  doctorId: string
  medicationName: string
  dosage?: string
  frequency?: string
  duration?: string
  instructions?: string
  isDispensed: boolean
  createdAt?: string
  patientName?: string
  patientNumber?: string
  doctorName?: string
}

interface PrescItem {
  medicationName: string
  dosage: string
  frequency: string
  duration: string
  instructions: string
}

const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'Every 8 hours', 'Every 12 hours', 'As needed', 'Before meals', 'After meals', 'At bedtime']
const DURATIONS = ['1 day', '3 days', '5 days', '7 days', '10 days', '14 days', '1 month', '2 months', '3 months', 'Ongoing']

export default function PrescriptionsPage() {
  const { user } = useAuth()
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [medications, setMedications] = useState<any[]>([])
  const [consultations, setConsultations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null)
  const [form, setForm] = useState({ patientId: '', consultationId: '' })
  const [items, setItems] = useState<PrescItem[]>([{ medicationName: '', dosage: '', frequency: 'Twice daily', duration: '7 days', instructions: '' }])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [consRes, patRes, medRes] = await Promise.all([
        api.get('/consultations', { params: { limit: 100 } }),
        api.get('/patients', { params: { limit: 100 } }),
        api.get('/pharmacy/medications', { params: { limit: 100 } }),
      ])

      setConsultations(consRes.data.records || [])
      setPatients(patRes.data.patients || [])
      setMedications(medRes.data.medications || [])

      // Extract prescriptions from consultation notes
      const allPrescriptions: Prescription[] = []
      for (const c of (consRes.data.records || [])) {
        if (c.prescriptions?.length) {
          for (const p of c.prescriptions) {
            allPrescriptions.push({
              ...p,
              patientName: c.patientName,
              patientNumber: c.patientNumber,
              doctorName: c.doctorName,
              createdAt: c.visitDate,
            })
          }
        }
      }
      setPrescriptions(allPrescriptions)
    } catch { } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = prescriptions.filter(p =>
    (p.patientName || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.medicationName || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.patientNumber || '').toLowerCase().includes(search.toLowerCase())
  )

  const addItem = () => setItems(prev => [...prev, { medicationName: '', dosage: '', frequency: 'Twice daily', duration: '7 days', instructions: '' }])
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i))
  const updateItem = (i: number, field: keyof PrescItem, value: string) =>
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.consultationId) return alert('Please select a consultation.')
    if (items.some(it => !it.medicationName)) return alert('All medication names are required.')
    try {
      for (const item of items) {
        await api.post(`/consultations/${form.consultationId}/prescriptions`, item)
      }
      setShowForm(false)
      setForm({ patientId: '', consultationId: '' })
      setItems([{ medicationName: '', dosage: '', frequency: 'Twice daily', duration: '7 days', instructions: '' }])
      load()
    } catch (err: any) { alert(err.response?.data?.message || 'Error writing prescription') }
  }

  const handlePrint = (p: Prescription) => {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html><head><title>Prescription</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
        .rx { font-size: 48px; font-weight: bold; color: #1a56db; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        td { padding: 8px 12px; border: 1px solid #ddd; }
        .sig { margin-top: 40px; border-top: 1px solid #999; padding-top: 20px; }
        @media print { button { display: none; } }
      </style></head><body>
      <div class="header">
        <div class="rx">℞</div>
        <h2>Datel Medical Clinic</h2>
        <p>Prescription</p>
      </div>
      <p><strong>Patient:</strong> ${p.patientName} (${p.patientNumber})</p>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      <p><strong>Prescribing Doctor:</strong> ${p.doctorName || user?.fullName}</p>
      <hr/>
      <table>
        <tr style="background:#f0f4ff"><td><strong>Medication</strong></td><td><strong>Dosage</strong></td><td><strong>Frequency</strong></td><td><strong>Duration</strong></td></tr>
        <tr><td>${p.medicationName}</td><td>${p.dosage || '—'}</td><td>${p.frequency || '—'}</td><td>${p.duration || '—'}</td></tr>
      </table>
      ${p.instructions ? `<p><strong>Instructions:</strong> ${p.instructions}</p>` : ''}
      <div class="sig">
        <p><strong>Doctor's Signature:</strong> ____________________</p>
        <p><strong>Stamp:</strong></p>
      </div>
      <button onclick="window.print()">Print</button>
      </body></html>
    `)
    win.document.close()
    win.print()
  }

  const patientConsultations = consultations.filter(c => !form.patientId || c.patientId === form.patientId)

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Prescriptions</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Write and manage patient prescriptions</p>
        </div>
        {['doctor', 'clinic_manager', 'super_admin'].includes(user?.role || '') && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Write Prescription
          </button>
        )}
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="dcs-input pl-10"
            placeholder="Search by patient or medication…" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Prescriptions', count: prescriptions.length, color: 'text-primary', icon: ClipboardList },
          { label: 'Dispensed', count: prescriptions.filter(p => p.isDispensed).length, color: 'text-emerald-600', icon: CheckCircle },
          { label: 'Pending', count: prescriptions.filter(p => !p.isDispensed).length, color: 'text-amber-600', icon: Clock },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="glass-card p-4 flex items-center gap-4">
            <s.icon className={`w-8 h-8 ${s.color}`} />
            <div>
              <p className={`text-2xl font-black ${s.color}`}>{s.count}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Prescription List */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white">All Prescriptions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                {['Patient', 'Medication', 'Dosage', 'Frequency', 'Duration', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>{[...Array(8)].map((_, j) => (
                    <td key={j} className="px-5 py-4"><div className="h-4 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" /></td>
                  ))}</tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                  <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  No prescriptions found
                </td></tr>
              ) : filtered.map((p, i) => (
                <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-sm text-slate-900 dark:text-white">{p.patientName || '—'}</p>
                    <p className="text-xs text-slate-400">{p.patientNumber}</p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Pill className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{p.medicationName}</span>
                    </div>
                    {p.dosage && <p className="text-xs text-slate-400 mt-0.5 ml-6">{p.dosage}</p>}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">{p.dosage || '—'}</td>
                  <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">{p.frequency || '—'}</td>
                  <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">{p.duration || '—'}</td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${p.isDispensed
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                      {p.isDispensed ? 'Dispensed' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500">{p.createdAt ? formatDate(p.createdAt) : '—'}</td>
                  <td className="px-5 py-4">
                    <button onClick={() => handlePrint(p)}
                      className="btn-ghost text-xs py-1 px-2 flex items-center gap-1">
                      <Printer className="w-3.5 h-3.5" /> Print
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Write Prescription Modal */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setShowForm(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="modal-panel max-w-2xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Write Prescription</h2>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Patient</label>
                    <select value={form.patientId} onChange={e => setForm({ ...form, patientId: e.target.value, consultationId: '' })} className="dcs-input">
                      <option value="">All patients…</option>
                      {patients.map(p => <option key={p.id} value={p.id}>{p.fullName} ({p.patientNumber})</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Consultation *</label>
                    <select required value={form.consultationId} onChange={e => setForm({ ...form, consultationId: e.target.value })} className="dcs-input">
                      <option value="">Select consultation…</option>
                      {patientConsultations.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.patientName} — {c.visitDate ? new Date(c.visitDate).toLocaleDateString() : ''} ({c.chiefComplaint || 'No complaint noted'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Prescription Items */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Medications</h3>
                    <button type="button" onClick={addItem} className="btn-ghost text-xs py-1 px-3 flex items-center gap-1 text-primary">
                      <Plus className="w-3.5 h-3.5" /> Add Medication
                    </button>
                  </div>
                  {items.map((item, i) => (
                    <div key={i} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 relative">
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItem(i)}
                          className="absolute top-3 right-3 text-red-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 space-y-1">
                          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Medication Name *</label>
                          <input required list={`meds-${i}`} value={item.medicationName}
                            onChange={e => updateItem(i, 'medicationName', e.target.value)}
                            className="dcs-input" placeholder="Type or select medication…" />
                          <datalist id={`meds-${i}`}>
                            {medications.map(m => <option key={m.id} value={m.name} />)}
                          </datalist>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Dosage</label>
                          <input value={item.dosage} onChange={e => updateItem(i, 'dosage', e.target.value)}
                            className="dcs-input" placeholder="500mg, 1 tablet…" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Frequency</label>
                          <select value={item.frequency} onChange={e => updateItem(i, 'frequency', e.target.value)} className="dcs-input">
                            {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Duration</label>
                          <select value={item.duration} onChange={e => updateItem(i, 'duration', e.target.value)} className="dcs-input">
                            {DURATIONS.map(d => <option key={d}>{d}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Instructions</label>
                          <input value={item.instructions} onChange={e => updateItem(i, 'instructions', e.target.value)}
                            className="dcs-input" placeholder="Take with food…" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" className="btn-primary flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" /> Issue Prescription
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
