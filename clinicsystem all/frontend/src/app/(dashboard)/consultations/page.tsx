'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Stethoscope, Search, FileText, Thermometer, Heart } from 'lucide-react'
import api from '@/lib/api'
import { ConsultationNote, Patient, Appointment } from '@/types'
import { formatDate, getStatusColor } from '@/lib/utils'

export default function ConsultationsPage() {
  const [records, setRecords] = useState<ConsultationNote[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [patientSearch, setPatientSearch] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [filterPatient, setFilterPatient] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<ConsultationNote | null>(null)
  const [form, setForm] = useState({
    patientId: '', appointmentId: '', visitDate: new Date().toISOString().split('T')[0],
    chiefComplaint: '', diagnosis: '', diagnosisNotes: '', treatmentPlan: '',
    bpSystolic: '', bpDiastolic: '', heartRate: '', temperature: '', weightKg: '', heightCm: '',
    oxygenSaturation: '', bloodSugar: '',
    prescriptions: [{ medicationName: '', dosage: '', frequency: '', duration: '', instructions: '' }],
    followUpDate: '', referredTo: '', notes: '',
  })

  const load = async () => {
    setLoading(true)
    try {
      const params: any = { page, limit: 15 }
      if (filterPatient) params.patientId = filterPatient
      const { data } = await api.get('/consultations', { params })
      setRecords(data.records)
      setTotal(data.total)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [page, filterPatient])
  useEffect(() => {
    api.get('/patients', { params: { limit: 100 } }).then(r => setPatients(r.data.patients)).catch(() => {})
  }, [])

  const addPrescriptionRow = () => setForm(f => ({
    ...f,
    prescriptions: [...f.prescriptions, { medicationName: '', dosage: '', frequency: '', duration: '', instructions: '' }],
  }))

  const updatePrescRow = (idx: number, field: string, val: string) => {
    const rows = [...form.prescriptions]
    rows[idx] = { ...rows[idx], [field]: val }
    setForm(f => ({ ...f, prescriptions: rows }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/consultations', {
        ...form,
        diagnosis: form.diagnosis ? form.diagnosis.split(',').map(s => s.trim()).filter(Boolean) : [],
        bpSystolic: form.bpSystolic ? Number(form.bpSystolic) : undefined,
        bpDiastolic: form.bpDiastolic ? Number(form.bpDiastolic) : undefined,
        heartRate: form.heartRate ? Number(form.heartRate) : undefined,
        temperature: form.temperature ? Number(form.temperature) : undefined,
        weightKg: form.weightKg ? Number(form.weightKg) : undefined,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        oxygenSaturation: form.oxygenSaturation ? Number(form.oxygenSaturation) : undefined,
        bloodSugar: form.bloodSugar ? Number(form.bloodSugar) : undefined,
        prescriptions: form.prescriptions.filter(p => p.medicationName.trim()),
      })
      setShowForm(false)
      load()
    } catch (err: any) { alert(err.response?.data?.message || 'Error saving record') }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Consultations</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{total} consultation records</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Consultation
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-3">
        <select value={filterPatient} onChange={e => { setFilterPatient(e.target.value); setPage(1) }} className="dcs-input w-auto">
          <option value="">All Patients</option>
          {patients.map(p => <option key={p.id} value={p.id}>{p.fullName} ({p.patientNumber})</option>)}
        </select>
      </div>

      {/* Records */}
      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />)}</div>
      ) : records.length === 0 ? (
        <div className="glass-card py-16 text-center text-slate-400">
          <Stethoscope className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No consultation records yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((rec, i) => (
            <motion.div key={rec.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="glass-card p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 cursor-pointer hover:shadow-glass transition-all"
              onClick={() => setSelected(rec)}>
              <div className="w-10 h-10 rounded-2xl gradient-teal flex items-center justify-center text-white shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="font-semibold text-slate-900 dark:text-white">{rec.patientName}</p>
                  <span className="badge-gray text-xs">{rec.recordNumber}</span>
                  {rec.isSigned && <span className="badge-green text-xs">✓ Signed</span>}
                </div>
                <p className="text-sm text-slate-500 mt-0.5">
                  Dr. {rec.doctorName} · {formatDate(rec.visitDate)}
                  {rec.diagnosis && rec.diagnosis.length > 0 && <span className="ml-2 text-primary font-medium">{rec.diagnosis.slice(0, 2).join(', ')}</span>}
                </p>
              </div>
              {/* Vitals mini */}
              <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0">
                {rec.bpSystolic && (
                  <div className="flex items-center gap-1"><Heart className="w-3 h-3 text-red-400" />{rec.bpSystolic}/{rec.bpDiastolic}</div>
                )}
                {rec.temperature && (
                  <div className="flex items-center gap-1"><Thermometer className="w-3 h-3 text-orange-400" />{rec.temperature}°C</div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {total > 15 && (
        <div className="flex justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40">← Prev</button>
          <button disabled={page * 15 >= total} onClick={() => setPage(p => p + 1)} className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40">Next →</button>
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setSelected(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="modal-panel max-w-2xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Consultation Record — {selected.recordNumber}</h2>
                <button onClick={() => setSelected(null)} className="btn-ghost text-xs">Close</button>
              </div>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-slate-400">Patient</p><p className="font-semibold">{selected.patientName}</p></div>
                  <div><p className="text-xs text-slate-400">Doctor</p><p className="font-semibold">{selected.doctorName}</p></div>
                  <div><p className="text-xs text-slate-400">Visit Date</p><p>{formatDate(selected.visitDate)}</p></div>
                  <div><p className="text-xs text-slate-400">Status</p><p>{selected.isSigned ? '✅ Signed' : '📝 Draft'}</p></div>
                </div>
                {selected.chiefComplaint && <div><p className="text-xs text-slate-400 mb-1">Chief Complaint</p><p className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">{selected.chiefComplaint}</p></div>}
                {selected.diagnosis && selected.diagnosis.length > 0 && <div><p className="text-xs text-slate-400 mb-1">Diagnosis</p><div className="flex flex-wrap gap-2">{selected.diagnosis.map((d, i) => <span key={i} className="badge-blue">{d}</span>)}</div></div>}
                {selected.treatmentPlan && <div><p className="text-xs text-slate-400 mb-1">Treatment Plan</p><p className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">{selected.treatmentPlan}</p></div>}
                {selected.bpSystolic && (
                  <div>
                    <p className="text-xs text-slate-400 mb-2">Vital Signs</p>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'BP', value: `${selected.bpSystolic}/${selected.bpDiastolic} mmHg` },
                        { label: 'HR', value: `${selected.heartRate} bpm` },
                        { label: 'Temp', value: `${selected.temperature}°C` },
                        { label: 'SpO₂', value: `${selected.oxygenSaturation}%` },
                        { label: 'Weight', value: `${selected.weightKg} kg` },
                        { label: 'Height', value: `${selected.heightCm} cm` },
                      ].filter(v => v.value && !v.value.includes('undefined')).map(v => (
                        <div key={v.label} className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl text-center">
                          <p className="text-xs text-slate-400">{v.label}</p>
                          <p className="font-bold text-slate-900 dark:text-white mt-0.5">{v.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selected.prescriptions && selected.prescriptions.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-2">Prescriptions</p>
                    <div className="space-y-2">
                      {selected.prescriptions.map((p, i) => (
                        <div key={i} className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl text-xs">
                          <p className="font-semibold text-blue-700 dark:text-blue-300">{p.medicationName}</p>
                          <p className="text-blue-600 dark:text-blue-400 mt-0.5">{[p.dosage, p.frequency, p.duration].filter(Boolean).join(' · ')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* New Consultation Modal */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setShowForm(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="modal-panel max-w-2xl">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5">New Consultation</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Patient *</label>
                    <select required value={form.patientId} onChange={e => setForm({...form, patientId: e.target.value})} className="dcs-input">
                      <option value="">Select patient…</option>
                      {patients.map(p => <option key={p.id} value={p.id}>{p.fullName} ({p.patientNumber})</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Visit Date</label>
                    <input type="date" value={form.visitDate} onChange={e => setForm({...form, visitDate: e.target.value})} className="dcs-input" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Chief Complaint</label>
                    <input value={form.chiefComplaint} onChange={e => setForm({...form, chiefComplaint: e.target.value})} className="dcs-input" placeholder="Headache, fever…" />
                  </div>
                </div>

                {/* Vital Signs */}
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Vital Signs</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'BP Systolic', key: 'bpSystolic', placeholder: '120' },
                      { label: 'BP Diastolic', key: 'bpDiastolic', placeholder: '80' },
                      { label: 'Heart Rate', key: 'heartRate', placeholder: '72' },
                      { label: 'Temperature (°C)', key: 'temperature', placeholder: '37.0' },
                      { label: 'SpO₂ (%)', key: 'oxygenSaturation', placeholder: '98' },
                      { label: 'Blood Sugar', key: 'bloodSugar', placeholder: '110' },
                      { label: 'Weight (kg)', key: 'weightKg', placeholder: '70' },
                      { label: 'Height (cm)', key: 'heightCm', placeholder: '170' },
                    ].map(f => (
                      <div key={f.key} className="space-y-1">
                        <label className="text-xs text-slate-500">{f.label}</label>
                        <input type="number" step="any" value={(form as any)[f.key]} onChange={e => setForm(prev => ({...prev, [f.key]: e.target.value}))} className="dcs-input" placeholder={f.placeholder} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Diagnosis (comma separated)</label>
                  <input value={form.diagnosis} onChange={e => setForm({...form, diagnosis: e.target.value})} className="dcs-input" placeholder="Hypertension, Diabetes Type 2" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Treatment Plan</label>
                  <textarea value={form.treatmentPlan} onChange={e => setForm({...form, treatmentPlan: e.target.value})} className="dcs-input resize-none" rows={2} />
                </div>

                {/* Prescriptions */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Prescriptions</p>
                    <button type="button" onClick={addPrescriptionRow} className="btn-ghost text-xs">+ Add Row</button>
                  </div>
                  <div className="space-y-2">
                    {form.prescriptions.map((p, i) => (
                      <div key={i} className="grid grid-cols-5 gap-2">
                        <input value={p.medicationName} onChange={e => updatePrescRow(i, 'medicationName', e.target.value)} className="dcs-input col-span-2 text-xs" placeholder="Medication *" />
                        <input value={p.dosage} onChange={e => updatePrescRow(i, 'dosage', e.target.value)} className="dcs-input text-xs" placeholder="Dosage" />
                        <input value={p.frequency} onChange={e => updatePrescRow(i, 'frequency', e.target.value)} className="dcs-input text-xs" placeholder="Frequency" />
                        <input value={p.duration} onChange={e => updatePrescRow(i, 'duration', e.target.value)} className="dcs-input text-xs" placeholder="Duration" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Follow-up Date</label>
                    <input type="date" value={form.followUpDate} onChange={e => setForm({...form, followUpDate: e.target.value})} className="dcs-input" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Referred To</label>
                    <input value={form.referredTo} onChange={e => setForm({...form, referredTo: e.target.value})} className="dcs-input" placeholder="Specialist, Hospital…" />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" className="btn-primary">Save Consultation</button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
