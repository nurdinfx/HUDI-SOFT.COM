'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, FlaskConical, Search, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import api from '@/lib/api'
import { LabRequest, Patient } from '@/types'
import { formatDate, getStatusColor } from '@/lib/utils'

export default function LaboratoryPage() {
  const [requests, setRequests] = useState<LabRequest[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [patients, setPatients] = useState<Patient[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showResults, setShowResults] = useState<LabRequest | null>(null)
  const [results, setResults] = useState<any[]>([])
  const [resultForm, setResultForm] = useState([{ parameterName: '', resultValue: '', unit: '', referenceRange: '', interpretation: 'Normal' }])
  const [form, setForm] = useState({ patientId: '', testName: '', testCategory: '', priority: 'Routine', notes: '' })

  const load = async () => {
    setLoading(true)
    try {
      const params: any = { page, limit: 15 }
      if (statusFilter) params.status = statusFilter
      const { data } = await api.get('/lab/requests', { params })
      setRequests(data.requests)
      setTotal(data.total)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [page, statusFilter])
  useEffect(() => {
    api.get('/patients', { params: { limit: 100 } }).then(r => setPatients(r.data.patients)).catch(() => {})
  }, [])

  const openResults = async (req: LabRequest) => {
    setShowResults(req)
    try {
      const { data } = await api.get(`/lab/requests/${req.id}/results`)
      setResults(data)
    } catch { setResults([]) }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/lab/requests', form)
      setShowForm(false)
      load()
    } catch (err: any) { alert(err.response?.data?.message || 'Error') }
  }

  const submitResults = async () => {
    if (!showResults) return
    try {
      await api.post(`/lab/requests/${showResults.id}/results`, { results: resultForm.filter(r => r.parameterName) })
      setShowResults(null)
      load()
    } catch (err: any) { alert(err.response?.data?.message || 'Error') }
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.put(`/lab/requests/${id}/status`, { status })
      load()
    } catch {}
  }

  const priorityColor: Record<string, string> = {
    Routine: 'badge-gray',
    Urgent: 'badge-yellow',
    STAT: 'badge-red',
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Laboratory</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{total} lab requests</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Lab Request
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex gap-3 flex-wrap">
        {['', 'Requested', 'Sample Collected', 'In Progress', 'Completed', 'Cancelled'].map(s => (
          <button key={s || 'all'} onClick={() => { setStatusFilter(s); setPage(1) }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${statusFilter === s ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />)}</div>
      ) : requests.length === 0 ? (
        <div className="glass-card py-16 text-center text-slate-400">
          <FlaskConical className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No lab requests found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req, i) => (
            <motion.div key={req.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="glass-card p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${req.priority === 'STAT' ? 'bg-red-100' : req.priority === 'Urgent' ? 'bg-yellow-100' : 'bg-blue-100'}`}>
                <FlaskConical className={`w-5 h-5 ${req.priority === 'STAT' ? 'text-red-500' : req.priority === 'Urgent' ? 'text-yellow-500' : 'text-blue-500'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-900 dark:text-white">{req.testName}</p>
                  <span className={priorityColor[req.priority]}>{req.priority}</span>
                  <span className="badge-gray text-xs">{req.requestNumber}</span>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">
                  {req.patientName} · {req.patientNumber} · Requested by Dr. {req.doctorName}
                </p>
                <p className="text-xs text-slate-400">{formatDate(req.requestedDate)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <span className={getStatusColor(req.status)}>{req.status}</span>
                {req.status === 'Requested' && (
                  <button onClick={() => updateStatus(req.id, 'Sample Collected')} className="text-xs px-2.5 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-lg hover:bg-yellow-200 transition-colors">
                    Collect Sample
                  </button>
                )}
                {req.status === 'Sample Collected' && (
                  <button onClick={() => updateStatus(req.id, 'In Progress')} className="text-xs px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 transition-colors">
                    Start Processing
                  </button>
                )}
                {req.status === 'In Progress' && (
                  <button onClick={() => openResults(req)} className="text-xs px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 transition-colors">
                    Enter Results
                  </button>
                )}
                {req.status === 'Completed' && (
                  <button onClick={() => openResults(req)} className="text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 transition-colors">
                    View Results
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* New Request Modal */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setShowForm(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="modal-panel max-w-md">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5">New Lab Request</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Patient *</label>
                  <select required value={form.patientId} onChange={e => setForm({...form, patientId: e.target.value})} className="dcs-input">
                    <option value="">Select patient…</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.fullName} ({p.patientNumber})</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Test Name *</label>
                  <input required value={form.testName} onChange={e => setForm({...form, testName: e.target.value})} className="dcs-input" placeholder="Complete Blood Count, Lipid Profile…" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
                    <input value={form.testCategory} onChange={e => setForm({...form, testCategory: e.target.value})} className="dcs-input" placeholder="Hematology…" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Priority</label>
                    <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="dcs-input">
                      <option>Routine</option><option>Urgent</option><option>STAT</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" className="btn-primary">Create Request</button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Results Modal */}
      <AnimatePresence>
        {showResults && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setShowResults(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="modal-panel max-w-2xl">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                {showResults.status === 'Completed' ? 'Lab Results' : 'Enter Results'} — {showResults.requestNumber}
              </h2>
              <p className="text-sm text-slate-500 mb-5">{showResults.testName} · {showResults.patientName}</p>

              {results.length > 0 ? (
                <div className="space-y-2 mb-5">
                  {results.map((r, i) => (
                    <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${r.interpretation === 'Critical' ? 'bg-red-50 dark:bg-red-900/20' : r.interpretation === 'Normal' ? 'bg-green-50 dark:bg-green-900/10' : 'bg-yellow-50 dark:bg-yellow-900/10'}`}>
                      <p className="font-medium text-sm">{r.parameter_name}</p>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="font-bold">{r.result_value} {r.unit}</span>
                        <span className="text-slate-400">({r.reference_range})</span>
                        <span className={`badge ${r.interpretation === 'Normal' ? 'badge-green' : r.interpretation === 'Critical' ? 'badge-red' : 'badge-yellow'}`}>{r.interpretation}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : showResults.status !== 'Completed' && (
                <div className="space-y-3 mb-5">
                  {resultForm.map((r, i) => (
                    <div key={i} className="grid grid-cols-5 gap-2">
                      <input value={r.parameterName} onChange={e => { const rows = [...resultForm]; rows[i].parameterName = e.target.value; setResultForm(rows) }} className="dcs-input text-xs col-span-2" placeholder="Parameter *" />
                      <input value={r.resultValue} onChange={e => { const rows = [...resultForm]; rows[i].resultValue = e.target.value; setResultForm(rows) }} className="dcs-input text-xs" placeholder="Value" />
                      <input value={r.unit} onChange={e => { const rows = [...resultForm]; rows[i].unit = e.target.value; setResultForm(rows) }} className="dcs-input text-xs" placeholder="Unit" />
                      <select value={r.interpretation} onChange={e => { const rows = [...resultForm]; rows[i].interpretation = e.target.value; setResultForm(rows) }} className="dcs-input text-xs">
                        <option>Normal</option><option>Low</option><option>High</option><option>Critical</option>
                      </select>
                    </div>
                  ))}
                  <button type="button" onClick={() => setResultForm(f => [...f, { parameterName:'',resultValue:'',unit:'',referenceRange:'',interpretation:'Normal' }])}
                    className="btn-ghost text-xs">+ Add Parameter</button>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button onClick={() => setShowResults(null)} className="btn-secondary">Close</button>
                {showResults.status !== 'Completed' && (
                  <button onClick={submitResults} className="btn-primary">Submit Results</button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
