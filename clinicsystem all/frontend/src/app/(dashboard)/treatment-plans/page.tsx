'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Plus, CheckCircle2, Clock, AlertTriangle, ChevronRight,
  UserCheck, DollarSign, Calendar, Sparkles, Filter, Search, Check, X, ShieldCheck
} from 'lucide-react'
import api from '@/lib/api'

interface TreatmentPlan {
  id: string
  plan_number: string
  title: string
  patient_name: string
  doctor_name: string
  status: string
  total_estimated_cost: number
  patient_consent: boolean
  total_items?: number
  completed_items?: number
  created_at: string
  items?: any[]
}

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
  Proposed: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400',
  'Awaiting Approval': 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400',
  Approved: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400',
  'In Progress': 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400',
  Completed: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400',
  Cancelled: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400',
}

export default function TreatmentPlansPage() {
  const [plans, setPlans] = useState<TreatmentPlan[]>([])
  const [treatmentsCatalog, setTreatmentsCatalog] = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<TreatmentPlan | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Form
  const [formPatientId, setFormPatientId] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formItems, setFormItems] = useState<any[]>([
    { treatmentName: 'Dental Cleaning', toothNumber: 'All', stage: 1, sessionNumber: 1, estimatedCost: 40, notes: '' }
  ])

  const loadData = async () => {
    setLoading(true)
    try {
      const [plansRes, treatRes, patientsRes] = await Promise.all([
        api.get('/dental/plans'),
        api.get('/dental/treatments'),
        api.get('/patients', { params: { limit: 100 } })
      ])
      setPlans(plansRes.data || [])
      setTreatmentsCatalog(treatRes.data || [])
      setPatients(patientsRes.data?.patients || [])
    } catch (err) {
      console.error('Failed to load treatment plans:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleSelectPlan = async (id: string) => {
    try {
      const { data } = await api.get(`/dental/plans/${id}`)
      setSelectedPlan(data)
    } catch (err) {
      console.error('Failed to fetch plan details:', err)
    }
  }

  const handleAddItemRow = () => {
    setFormItems(prev => [
      ...prev,
      { treatmentName: 'Composite Filling', toothNumber: '11', stage: 1, sessionNumber: 1, estimatedCost: 50, notes: '' }
    ])
  }

  const handleRemoveItemRow = (idx: number) => {
    setFormItems(prev => prev.filter((_, i) => i !== idx))
  }

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formPatientId || !formTitle.trim()) {
      alert('Please select patient and title')
      return
    }

    try {
      await api.post('/dental/plans', {
        patientId: formPatientId,
        title: formTitle,
        clinicalNotes: formNotes,
        items: formItems
      })
      setShowCreateModal(false)
      setFormTitle('')
      setFormNotes('')
      loadData()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create treatment plan')
    }
  }

  const handleUpdateStatus = async (planId: string, status: string, consent?: boolean) => {
    try {
      await api.put(`/dental/plans/${planId}`, { status, patientConsent: consent })
      loadData()
      if (selectedPlan?.id === planId) {
        handleSelectPlan(planId)
      }
    } catch (err) {
      console.error('Failed to update plan status:', err)
    }
  }

  const handleToggleProcedureStatus = async (itemId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Completed' ? 'Planned' : 'Completed'
    try {
      await api.patch(`/dental/plans/items/${itemId}/status`, { status: nextStatus })
      if (selectedPlan) {
        handleSelectPlan(selectedPlan.id)
      }
      loadData()
    } catch (err) {
      console.error('Failed to update procedure status:', err)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="text-blue-600" size={24} />
            Dental Treatment Planning & Clinical Workflow
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Multi-stage dental procedure planning, patient consent tracking, and session execution
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-600/20 transition-all"
        >
          <Plus size={16} /> Create Treatment Plan
        </button>
      </div>

      {/* Main Grid: Plans List + Details View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Plans List */}
        <div className="lg:col-span-5 space-y-3">
          {loading ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
              Loading treatment plans...
            </div>
          ) : plans.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
              <FileText className="mx-auto text-slate-300 dark:text-slate-700" size={36} />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No treatment plans found</p>
              <p className="text-xs text-slate-400">Click "Create Treatment Plan" to start a new patient plan.</p>
            </div>
          ) : (
            plans.map(p => {
              const isSelected = selectedPlan?.id === p.id
              const total = Number(p.totalItems ?? p.total_items) || 0
              const completed = Number(p.completedItems ?? p.completed_items) || 0
              const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0

              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectPlan(p.id)}
                  className={`p-5 rounded-3xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-500 shadow-md shadow-blue-500/5'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                        {p.planNumber || p.plan_number}
                      </span>
                      <h4 className="font-black text-sm text-slate-900 dark:text-white">
                        {p.title}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        Patient: <strong>{p.patientName || p.patient_name}</strong>
                      </p>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${STATUS_COLORS[p.status] || STATUS_COLORS.Draft}`}>
                      {p.status}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1 mt-3">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400">
                      <span>Procedures Progress</span>
                      <span>{completed} / {total} Done ({progressPct}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-300 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span>Est. Cost: ${Number(p.totalEstimatedCost ?? p.total_estimated_cost ?? 0).toFixed(2)}</span>
                    <span className={`text-[10px] ${p.patientConsent ?? p.patient_consent ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {p.patientConsent ?? p.patient_consent ? '✓ Patient Consented' : '⏳ Pending Consent'}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Right Side: Detailed Plan Execution */}
        <div className="lg:col-span-7">
          {selectedPlan ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
              {/* Header details */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-blue-600">{selectedPlan.planNumber || selectedPlan.plan_number}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${STATUS_COLORS[selectedPlan.status]}`}>
                      {selectedPlan.status}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {selectedPlan.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Patient: {selectedPlan.patientName || selectedPlan.patient_name} • Attending Dentist: {selectedPlan.doctorName || selectedPlan.doctor_name || 'Dr. Assigned'}
                  </p>
                </div>

                {/* Consent & Approval Action Bar */}
                <div className="flex flex-wrap items-center gap-2">
                  {!(selectedPlan.patientConsent ?? selectedPlan.patient_consent) && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedPlan.id, 'Approved', true)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                    >
                      <Check size={14} /> Record Patient Consent
                    </button>
                  )}

                  {selectedPlan.status !== 'In Progress' && selectedPlan.status !== 'Completed' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedPlan.id, 'In Progress')}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
                    >
                      Start Treatment
                    </button>
                  )}

                  {selectedPlan.status === 'In Progress' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedPlan.id, 'Completed')}
                      className="px-3.5 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-bold"
                    >
                      Mark Completed
                    </button>
                  )}
                </div>
              </div>

              {/* Procedures Checklist */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
                  Phased Treatment Procedures Checklist
                </h4>

                <div className="space-y-2.5">
                  {(selectedPlan.items || []).map((item: any, idx: number) => {
                    const isDone = item.status === 'Completed'

                    return (
                      <div
                        key={item.id || idx}
                        className={`p-4 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                          isDone
                            ? 'bg-emerald-50/40 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/40 text-slate-600'
                            : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleToggleProcedureStatus(item.id, item.status)}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                              isDone
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'border-2 border-slate-300 dark:border-slate-600 hover:border-blue-500'
                            }`}
                          >
                            {isDone && <Check size={14} />}
                          </button>

                          <div>
                            <p className={`text-xs font-black ${isDone ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                              {item.treatmentName || item.treatment_name}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Tooth: <strong>{item.toothNumber || item.tooth_number || 'General'}</strong> {item.surfaces ? `(${item.surfaces})` : ''} • Session #{item.sessionNumber || item.session_number || 1} • Stage {item.stage || 1}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                            ${Number(item.estimatedCost ?? item.estimated_cost ?? 0).toFixed(2)}
                          </p>
                          <span className={`text-[9px] font-bold ${isDone ? 'text-emerald-500' : 'text-slate-400'}`}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {selectedPlan.clinical_notes && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Dentist Clinical Assessment Notes
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {selectedPlan.clinical_notes}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
              <FileText className="mx-auto text-slate-300 dark:text-slate-700 mb-3" size={48} />
              <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Select a treatment plan</h3>
              <p className="text-xs text-slate-400 mt-1">
                Choose any patient treatment plan on the left to review procedures, record consents, or track completions.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Treatment Plan Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Plus className="text-blue-600" size={18} /> New Dental Treatment Plan
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreatePlan} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5 block">
                      Patient
                    </label>
                    <select
                      required
                      value={formPatientId}
                      onChange={e => setFormPatientId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    >
                      <option value="">Select Patient...</option>
                      {patients.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.fullName || p.full_name} ({p.patientNumber || p.patient_number})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5 block">
                      Plan Title
                    </label>
                    <input
                      type="text"
                      required
                      value={formTitle}
                      onChange={e => setFormTitle(e.target.value)}
                      placeholder="e.g. Full Mouth Rehabilitation / Ortho Phase 1"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Procedure Items List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                      Planned Procedures
                    </label>
                    <button
                      type="button"
                      onClick={handleAddItemRow}
                      className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Plus size={14} /> Add Procedure
                    </button>
                  </div>

                  <div className="space-y-2">
                    {formItems.map((item, idx) => (
                      <div key={idx} className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <select
                          value={item.treatmentName}
                          onChange={e => {
                            const found = treatmentsCatalog.find(t => (t.treatmentName || t.treatment_name) === e.target.value)
                            const updated = [...formItems]
                            updated[idx].treatmentName = e.target.value
                            if (found) {
                              updated[idx].treatmentId = found.id
                              updated[idx].estimatedCost = Number(found.defaultPrice ?? found.default_price) || 0
                            }
                            setFormItems(updated)
                          }}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold flex-1"
                        >
                          {treatmentsCatalog.map(t => {
                            const name = t.treatmentName || t.treatment_name || 'Procedure'
                            const price = Number(t.defaultPrice ?? t.default_price ?? 0)
                            return (
                              <option key={t.id} value={name}>
                                {name} (${price})
                              </option>
                            )
                          })}
                        </select>

                        <input
                          type="text"
                          placeholder="Tooth (e.g. 16, 21)"
                          value={item.toothNumber}
                          onChange={e => {
                            const updated = [...formItems]
                            updated[idx].toothNumber = e.target.value
                            setFormItems(updated)
                          }}
                          className="w-24 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                        />

                        <input
                          type="number"
                          placeholder="Cost $"
                          value={item.estimatedCost}
                          onChange={e => {
                            const updated = [...formItems]
                            updated[idx].estimatedCost = Number(e.target.value)
                            setFormItems(updated)
                          }}
                          className="w-24 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                        />

                        {formItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5 block">
                    Clinical Notes & Prognosis
                  </label>
                  <textarea
                    rows={2}
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                    placeholder="Patient motivation, medical precautions, treatment phases..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-600/20"
                  >
                    Save & Propose Plan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

