'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Stethoscope, Plus, Search, Edit2, Trash2, CheckCircle2, AlertCircle,
  Clock, DollarSign, Tag, FileText, RefreshCw, X, ChevronDown, Package,
  TrendingUp, Activity, Shield, Sparkles, Baby, Scissors, Zap
} from 'lucide-react'
import api from '@/lib/api'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Procedure {
  id: string
  category: string
  treatment_name: string
  code: string
  description: string
  default_price: number
  duration_minutes: number
  required_materials: string
  is_active: boolean
  created_at: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Category Config
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'Preventive Dentistry',  label: 'Preventive / Dhibcaha',      icon: Shield,      color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
  { value: 'Restorative Dentistry', label: 'Restorative / Dabacsanaanta', icon: Activity,    color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  { value: 'Surgical Dentistry',    label: 'Surgical / Qalliin',          icon: Scissors,    color: 'bg-rose-500/10 text-rose-600 border-rose-200' },
  { value: 'Endodontics',           label: 'Endodontics / Xididka',       icon: Zap,         color: 'bg-purple-500/10 text-purple-600 border-purple-200' },
  { value: 'Prosthodontics',        label: 'Prosthodontics / Ilka Macmal', icon: Package,    color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  { value: 'Orthodontics',          label: 'Orthodontics / Toosinta',     icon: TrendingUp,  color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200' },
  { value: 'Cosmetic Dentistry',    label: 'Cosmetic / Qurxinta',         icon: Sparkles,    color: 'bg-pink-500/10 text-pink-600 border-pink-200' },
  { value: 'Pediatric Dentistry',   label: 'Pediatric / Carruurta',       icon: Baby,        color: 'bg-cyan-500/10 text-cyan-600 border-cyan-200' },
  { value: 'Other',                 label: 'Kale / Other',                icon: Tag,         color: 'bg-slate-500/10 text-slate-600 border-slate-200' },
]

const getCatConfig = (cat: string) =>
  CATEGORIES.find(c => c.value === cat) || CATEGORIES[CATEGORIES.length - 1]

const EMPTY_FORM = {
  category: 'Preventive Dentistry',
  treatmentName: '',
  code: '',
  description: '',
  defaultPrice: '',
  durationMinutes: '30',
  requiredMaterials: '',
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function ProceduresPage() {
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('All')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Procedure | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [seedingTemplate, setSeedingTemplate] = useState(false)

  // ── Load ────────────────────────────────────────────────────────────────
  const loadProcedures = async () => {
    setLoading(true)
    try {
      // GET /api/dental/treatments — auto-seeds if first time
      const { data } = await api.get('/dental/treatments')
      const rawList = Array.isArray(data) ? data : []
      const normalized: Procedure[] = rawList.map((p: any) => ({
        id: p.id,
        category: p.category || 'Other',
        treatment_name: p.treatmentName || p.treatment_name || '',
        code: p.code || '',
        description: p.description || '',
        default_price: Number(p.defaultPrice ?? p.default_price) || 0,
        duration_minutes: Number(p.durationMinutes ?? p.duration_minutes) || 30,
        required_materials: p.requiredMaterials || p.required_materials || '',
        is_active: p.isActive !== undefined ? p.isActive : (p.is_active !== undefined ? p.is_active : true),
        created_at: p.createdAt || p.created_at || '',
      }))
      setProcedures(normalized)
    } catch (err) {
      showMsg('error', 'Procedures load gareyso kuna dhibaato — backend check gareey')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProcedures() }, [])

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  // ── Open modal for create or edit ───────────────────────────────────────
  const openCreate = () => {
    setEditTarget(null)
    setForm({ ...EMPTY_FORM })
    setShowModal(true)
  }

  const openEdit = (p: Procedure) => {
    setEditTarget(p)
    setForm({
      category: p.category,
      treatmentName: p.treatment_name,
      code: p.code || '',
      description: p.description || '',
      defaultPrice: String(p.default_price),
      durationMinutes: String(p.duration_minutes),
      requiredMaterials: p.required_materials || '',
    })
    setShowModal(true)
  }

  // ── Save (create or update) ─────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.treatmentName.trim()) {
      showMsg('error', 'Magaca procedure-ka geli')
      return
    }

    setSaving(true)
    try {
      const payload = {
        category: form.category,
        treatmentName: form.treatmentName.trim(),
        code: form.code.trim() || undefined,
        description: form.description.trim() || undefined,
        defaultPrice: Number(form.defaultPrice) || 0,
        durationMinutes: Number(form.durationMinutes) || 30,
        requiredMaterials: form.requiredMaterials.trim() || undefined,
      }

      if (editTarget) {
        await api.put(`/dental/treatments/${editTarget.id}`, payload)
        showMsg('success', `"${form.treatmentName}" la cusbooneysiiyay ✓`)
      } else {
        await api.post('/dental/treatments', payload)
        showMsg('success', `"${form.treatmentName}" la diiwaangeliyay ✓`)
      }

      setShowModal(false)
      loadProcedures()
    } catch (err: any) {
      showMsg('error', err.response?.data?.message || 'Save gareyso kuma guulaysanin')
    } finally {
      setSaving(false)
    }
  }

  // ── Deactivate / Delete ─────────────────────────────────────────────────
  const handleDeactivate = async (id: string) => {
    setDeleting(true)
    try {
      await api.put(`/dental/treatments/${id}`, { isActive: false })
      showMsg('success', 'Procedure la joojiyay (deactivated)')
      setDeleteId(null)
      loadProcedures()
    } catch (err) {
      showMsg('error', 'Deactivate kuma guulaysanin')
    } finally {
      setDeleting(false)
    }
  }

  const handleReactivate = async (id: string) => {
    try {
      await api.put(`/dental/treatments/${id}`, { isActive: true })
      showMsg('success', 'Procedure dib loo shaqaynsiiyay ✓')
      loadProcedures()
    } catch {
      showMsg('error', 'Reactivate kuma guulaysanin')
    }
  }

  // ── Clear All Demo Data ──────────────────────────────────────────────────
  const handleClearAll = async () => {
    setClearing(true)
    try {
      await api.delete('/dental/treatments/clear-all')
      showMsg('success', 'Dhammaan xogta procedures-ka waa la tirtiray (Clear)! Boggu hadda waa maran yahay.')
      setShowClearConfirm(false)
      loadProcedures()
    } catch (err: any) {
      showMsg('error', err.response?.data?.message || 'Tirtirista kuma guulaysan')
    } finally {
      setClearing(false)
    }
  }

  // ── Load Optional 34-item Dental Template ────────────────────────────────
  const handleLoadTemplate = async () => {
    setSeedingTemplate(true)
    try {
      await api.post('/dental/treatments/seed-template')
      showMsg('success', 'Liiska 34-ka procedure ee tusaalaha ah waa la soo rariiyay!')
      loadProcedures()
    } catch (err: any) {
      showMsg('error', err.response?.data?.message || 'Soo raridda kuma guulaysan')
    } finally {
      setSeedingTemplate(false)
    }
  }

  // ── Permanent Delete Single Item ─────────────────────────────────────────
  const handleDeletePermanent = async (id: string) => {
    setDeleting(true)
    try {
      await api.delete(`/dental/treatments/${id}`)
      showMsg('success', 'Procedure-ka si rasmi ah ayaa loo tirtiray')
      setDeleteId(null)
      loadProcedures()
    } catch (err: any) {
      showMsg('error', err.response?.data?.message || 'Tirtirista kuma guulaysan')
    } finally {
      setDeleting(false)
    }
  }

  // ── Filter ───────────────────────────────────────────────────────────────
  const filtered = procedures.filter(p => {
    const matchSearch =
      p.treatment_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.code || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCat === 'All' || p.category === filterCat
    return matchSearch && matchCat
  })

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalActive = procedures.filter(p => p.is_active).length
  const totalInactive = procedures.filter(p => !p.is_active).length
  const avgPrice = procedures.length
    ? Math.round(procedures.reduce((s, p) => s + Number(p.default_price), 0) / procedures.length)
    : 0
  const categories = [...new Set(procedures.map(p => p.category))]

  // ── Group by category ─────────────────────────────────────────────────────
  const grouped: Record<string, Procedure[]> = {}
  filtered.forEach(p => {
    if (!grouped[p.category]) grouped[p.category] = []
    grouped[p.category].push(p)
  })

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-12">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center">
            <Stethoscope size={26} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">
              Dental Procedures Catalog
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Maamulka Adeegyada Ilkaha — qiimaha, wakhtigga, noocyada
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {procedures.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:hover:bg-rose-900/30 dark:text-rose-400 font-bold text-xs rounded-xl border border-rose-200 dark:border-rose-800 transition-all cursor-pointer"
              title="Tirtir Dhammaan Xogta Demo-ga ah"
            >
              <Trash2 size={15} /> Tirtir Demo-ga (Clear All)
            </button>
          )}

          {procedures.length === 0 && (
            <button
              type="button"
              onClick={handleLoadTemplate}
              disabled={seedingTemplate}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={seedingTemplate ? "animate-spin" : ""} size={15} />
              <span>Soo Rari Template (34 Adeeg)</span>
            </button>
          )}

          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus size={16} /> + Procedure Cusub
          </button>
        </div>
      </div>

      {/* ── Message ───────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`flex items-center gap-3 p-4 rounded-2xl text-xs font-bold border ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stats Row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Procedures Active', value: totalActive, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
          { label: 'Noocyada (Categories)', value: categories.length, icon: Tag, color: 'text-blue-600', bg: 'bg-blue-500/10' },
          { label: 'Qiimaha Dhexdhexaadka', value: `$${avgPrice}`, icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-500/10' },
          { label: 'La Joojiyay', value: totalInactive, icon: AlertCircle, color: 'text-slate-500', bg: 'bg-slate-500/10' },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
              <s.icon className={s.color} size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{s.label}</p>
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search + Filter ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Raadi procedure, code, sharaxaad..."
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-white"
          />
        </div>

        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
        >
          <option value="All">Dhammaan Noocyada</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {/* ── Loading ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-24 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <RefreshCw className="animate-spin text-indigo-600 mr-3" size={28} />
          <span className="text-sm font-bold text-slate-500">Procedures la soo load gareyaa...</span>
        </div>
      ) : procedures.length === 0 ? (
        <div className="py-16 px-6 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 max-w-lg mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center mx-auto">
            <Stethoscope size={32} />
          </div>
          <div>
            <h3 className="font-black text-base text-slate-900 dark:text-white">
              Procedures Catalog-gu Waa Maran Yahay (Clear & Empty)
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Xaruntan ma laha wax xog demo ah. Waxaad hadda ku dari kartaa adeegyada xaruntaada u gaarka ah, ama waxaad soo rari kartaa liiska tusaalaha ah haddii aad rabto.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={openCreate}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer"
            >
              <Plus size={16} /> + Ku Dar Procedure Cusub
            </button>
            <button
              type="button"
              onClick={handleLoadTemplate}
              disabled={seedingTemplate}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={seedingTemplate ? "animate-spin" : ""} size={15} />
              Soo Rari Template Tusaale ah (34 Adeeg)
            </button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
          <Stethoscope className="mx-auto text-slate-300 dark:text-slate-700 mb-3" size={40} />
          <p className="font-bold text-slate-600 dark:text-slate-400">Wax procedure ah lama helin</p>
          <p className="text-xs text-slate-400 mt-1">Baadhitaankaaga waxba kuma soo bixin ama filter-ka beddel</p>
        </div>
      ) : (
        // ── Grouped by Category ───────────────────────────────────────────
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, items]) => {
            const catConfig = getCatConfig(cat)
            const CatIcon = catConfig.icon
            return (
              <div key={cat} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
                {/* Category header */}
                <div className={`flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800`}>
                  <div className={`w-8 h-8 rounded-xl ${catConfig.color} border flex items-center justify-center`}>
                    <CatIcon size={15} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-900 dark:text-white">{cat}</h3>
                    <p className="text-[10px] text-slate-500">{catConfig.label} • {items.length} procedure</p>
                  </div>
                  <span className="ml-auto text-xs font-black text-slate-400">{items.length}</span>
                </div>

                {/* Procedures Table */}
                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                  {items.map(p => (
                    <div
                      key={p.id}
                      className={`flex flex-wrap items-center gap-4 px-5 py-4 transition-colors ${
                        !p.is_active ? 'opacity-50 bg-slate-50/50 dark:bg-slate-800/20' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/20'
                      }`}
                    >
                      {/* Code badge */}
                      {p.code && (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black font-mono">
                          {p.code}
                        </span>
                      )}

                      {/* Name + description */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-black text-sm text-slate-900 dark:text-white">{p.treatment_name}</p>
                          {!p.is_active && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-200 dark:bg-slate-700 text-slate-500">
                              Inactive
                            </span>
                          )}
                        </div>
                        {p.description && (
                          <p className="text-xs text-slate-500 mt-0.5 truncate max-w-sm">{p.description}</p>
                        )}
                        {p.required_materials && (
                          <p className="text-[10px] text-slate-400 mt-0.5 italic">Materials: {p.required_materials}</p>
                        )}
                      </div>

                      {/* Price */}
                      <div className="flex items-center gap-1.5 text-sm font-black text-emerald-600">
                        <DollarSign size={13} />
                        {Number(p.default_price).toFixed(2)}
                      </div>

                      {/* Duration */}
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                        <Clock size={13} />
                        {p.duration_minutes} min
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="p-2 rounded-xl text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                          title="Wax ka beddel"
                        >
                          <Edit2 size={14} />
                        </button>

                        {p.is_active ? (
                          <button
                            type="button"
                            onClick={() => setDeleteId(p.id)}
                            className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                            title="Jooji procedure-ka"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleReactivate(p.id)}
                            className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all"
                            title="Dib u shaqaysii"
                          >
                            <CheckCircle2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          CREATE / EDIT MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center">
                    <Stethoscope size={18} />
                  </div>
                  <div>
                    <h2 className="font-black text-slate-900 dark:text-white text-base">
                      {editTarget ? 'Procedure Wax ka Beddel' : '+ Procedure Cusub'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {editTarget ? `Waxaad wax ka bedelaysaa: ${editTarget.treatment_name}` : 'Catalog-ka ku dar adeeg cusub'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl">
                  <X size={18} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">

                {/* Category */}
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5 block">
                    Nooca Procedure-ka (Category) *
                  </label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>

                {/* Name + Code */}
                <div className="grid grid-cols-5 gap-3">
                  <div className="col-span-3">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5 block">
                      Magaca Adeegga *
                    </label>
                    <input
                      required
                      type="text"
                      value={form.treatmentName}
                      onChange={e => setForm(f => ({ ...f, treatmentName: e.target.value }))}
                      placeholder="e.g. Root Canal Treatment"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5 block">
                      Code (Optional)
                    </label>
                    <input
                      type="text"
                      value={form.code}
                      onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                      placeholder="e.g. ENDO-01"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                {/* Price + Duration */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5 block">
                      Qiimaha ($)
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.defaultPrice}
                        onChange={e => setForm(f => ({ ...f, defaultPrice: e.target.value }))}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5 block">
                      Wakhtiga (Daqiiqo)
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                      <input
                        type="number"
                        min="5"
                        max="480"
                        value={form.durationMinutes}
                        onChange={e => setForm(f => ({ ...f, durationMinutes: e.target.value }))}
                        className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5 block">
                    Sharaxaad (Description)
                  </label>
                  <textarea
                    rows={2}
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Sharaxaad gaaban oo ku saabsan adeeggan..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Required Materials */}
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5 block">
                    Agabka Loo Baahan Yahay (Optional)
                  </label>
                  <input
                    type="text"
                    value={form.requiredMaterials}
                    onChange={e => setForm(f => ({ ...f, requiredMaterials: e.target.value }))}
                    placeholder="e.g. Anesthesia, Composite resin, Rubber dam"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Jooji
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                  >
                    {saving ? <RefreshCw className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                    {editTarget ? 'Kaydi Isbeddelada' : 'Ku Dar Procedure'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════
          DEACTIVATE CONFIRM
      ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setDeleteId(null)}
            />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="relative z-10 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 max-w-sm w-full text-center space-y-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-900/20 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 size={28} />
              </div>
              <div>
                <h3 className="font-black text-slate-900 dark:text-white">Sideed u tirtiraysaa?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Waxaad dooran kartaa inaad gabi ahaanba tirtirto (Permanent Delete) ama aad joojiso (Deactivate).
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleDeletePermanent(deleteId!)}
                  disabled={deleting}
                  className="w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trash2 size={14} /> Tirtir Gabi Ahaanba (Delete Permanent)
                </button>
                <button
                  onClick={() => handleDeactivate(deleteId!)}
                  disabled={deleting}
                  className="w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-white disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  Kaliya Jooji (Deactivate)
                </button>
                <button
                  onClick={() => setDeleteId(null)}
                  className="w-full px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Ka Laabo (Cancel)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════
          CLEAR ALL CONFIRM MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowClearConfirm(false)}
            />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="relative z-10 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 max-w-sm w-full text-center space-y-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-900/20 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 size={28} />
              </div>
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base">Tirtir Dhammaan Xogta Demo-ga?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Dhammaan <strong>{procedures.length}</strong>-ka procedure ee demo-ga ah waa la tirtiri doonaa. Boggu wuxuu noqonayaa mid maran oo nadiif ah (clear) oo xaruntu xogteeda gaarka ah ku darsan karto.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowClearConfirm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200">
                  Jooji
                </button>
                <button onClick={handleClearAll} disabled={clearing}
                  className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50 flex items-center justify-center gap-2">
                  {clearing ? <RefreshCw className="animate-spin" size={14} /> : <Trash2 size={14} />}
                  Haa, Tirtir Dhammaan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}

