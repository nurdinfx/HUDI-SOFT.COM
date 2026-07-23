'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pill, Search, AlertTriangle, ShoppingCart, Package } from 'lucide-react'
import api from '@/lib/api'
import { Medication } from '@/types'
import { formatDate, formatCurrency } from '@/lib/utils'

export default function PharmacyPage() {
  const [tab, setTab] = useState<'inventory' | 'sales' | 'lowstock'>('inventory')
  const [medications, setMedications] = useState<Medication[]>([])
  const [lowStock, setLowStock] = useState<Medication[]>([])
  const [sales, setSales] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Medication | null>(null)
  const [form, setForm] = useState({ name: '', genericName: '', category: '', dosageForm: 'Tablet', strength: '', stockQuantity: 0, reorderLevel: 10, sellingPrice: 0, expiryDate: '' })

  const loadMeds = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/pharmacy/medications', { params: { search, page, limit: 15 } })
      setMedications(data.medications)
      setTotal(data.total)
    } catch {} finally { setLoading(false) }
  }

  const loadLow = async () => {
    try {
      const { data } = await api.get('/pharmacy/medications', { params: { lowStock: true } })
      setLowStock(data.medications)
    } catch {}
  }

  const loadSales = async () => {
    try {
      const { data } = await api.get('/pharmacy/sales', { params: { page, limit: 15 } })
      setSales(data.sales)
    } catch {}
  }

  useEffect(() => { loadMeds(); loadLow() }, [search, page])
  useEffect(() => { if (tab === 'sales') loadSales() }, [tab])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editItem) await api.put(`/pharmacy/medications/${editItem.id}`, form)
      else await api.post('/pharmacy/medications', form)
      setShowForm(false); setEditItem(null)
      loadMeds(); loadLow()
    } catch (err: any) { alert(err.response?.data?.message || 'Error') }
  }

  const expiryWarning = (date?: string) => {
    if (!date) return ''
    const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
    if (days < 0) return 'text-red-500'
    if (days < 30) return 'text-orange-500'
    return 'text-green-500'
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Pharmacy</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Inventory · Sales · Stock Tracking</p>
        </div>
        <div className="flex items-center gap-3">
          {lowStock.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-xl text-sm font-medium">
              <AlertTriangle className="w-4 h-4" />
              {lowStock.length} low stock
            </div>
          )}
          <button onClick={() => { setEditItem(null); setForm({ name:'',genericName:'',category:'',dosageForm:'Tablet',strength:'',stockQuantity:0,reorderLevel:10,sellingPrice:0,expiryDate:'' }); setShowForm(true) }} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Medication
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        {(['inventory', 'sales', 'lowstock'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-lg capitalize transition-all ${tab === t ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            {t === 'lowstock' ? `⚠ Low Stock (${lowStock.length})` : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'inventory' && (
        <>
          <div className="glass-card p-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="dcs-input pl-10" placeholder="Search medications…" />
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    {['Name', 'Category', 'Form', 'Stock', 'Price', 'Expiry', 'Actions'].map(h => (
                      <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i}>{[...Array(7)].map((_, j) => <td key={j} className="px-5 py-4"><div className="h-4 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" /></td>)}</tr>
                    ))
                  ) : medications.map((m, i) => (
                    <motion.tr key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-sm text-slate-900 dark:text-white">{m.name}</p>
                        {m.genericName && <p className="text-xs text-slate-400">{m.genericName}</p>}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">{m.category || '—'}</td>
                      <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">{m.dosageForm} {m.strength}</td>
                      <td className="px-5 py-4">
                        <span className={`font-bold text-sm ${m.stockQuantity <= m.reorderLevel ? 'text-red-500' : 'text-green-600'}`}>
                          {m.stockQuantity}
                        </span>
                        <span className="text-xs text-slate-400 ml-1">(min {m.reorderLevel})</span>
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">{formatCurrency(m.sellingPrice)}</td>
                      <td className={`px-5 py-4 text-sm font-medium ${expiryWarning(m.expiryDate)}`}>
                        {m.expiryDate ? formatDate(m.expiryDate) : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <button onClick={() => { setEditItem(m); setForm({ name:m.name,genericName:m.genericName||'',category:m.category||'',dosageForm:m.dosageForm||'Tablet',strength:m.strength||'',stockQuantity:m.stockQuantity,reorderLevel:m.reorderLevel,sellingPrice:m.sellingPrice,expiryDate:m.expiryDate?.split('T')[0]||'' }); setShowForm(true) }}
                          className="btn-ghost text-xs py-1 px-2">Edit</button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'sales' && (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  {['Sale #', 'Patient', 'Amount', 'Payment', 'Status', 'Date'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {sales.map((s, i) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-5 py-4 text-sm font-mono font-semibold text-slate-700 dark:text-slate-300">{s.sale_number}</td>
                    <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">{s.patient_name || 'Walk-in'}</td>
                    <td className="px-5 py-4 text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(s.total_amount)}</td>
                    <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">{s.payment_method}</td>
                    <td className="px-5 py-4"><span className="badge-green">{s.payment_status}</span></td>
                    <td className="px-5 py-4 text-sm text-slate-500">{formatDate(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'lowstock' && (
        <div className="space-y-3">
          {lowStock.length === 0 ? (
            <div className="glass-card py-12 text-center text-slate-400">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>All medications are well stocked</p>
            </div>
          ) : lowStock.map((m, i) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="glass-card p-4 flex items-center gap-4 border-l-4 border-orange-400">
              <AlertTriangle className="w-8 h-8 text-orange-400 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-slate-900 dark:text-white">{m.name}</p>
                <p className="text-xs text-slate-500">{m.genericName} · {m.dosageForm} {m.strength}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-red-500">{m.stockQuantity}</p>
                <p className="text-xs text-slate-400">min {m.reorderLevel} required</p>
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
                {editItem ? 'Edit Medication' : 'Add Medication'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Name *</label>
                    <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="dcs-input" placeholder="Paracetamol 500mg" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Generic Name</label>
                    <input value={form.genericName} onChange={e => setForm({...form, genericName: e.target.value})} className="dcs-input" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
                    <input value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="dcs-input" placeholder="Analgesic…" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Dosage Form</label>
                    <select value={form.dosageForm} onChange={e => setForm({...form, dosageForm: e.target.value})} className="dcs-input">
                      {['Tablet','Capsule','Syrup','Injection','Cream','Drops','Inhaler','Powder','Other'].map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Strength</label>
                    <input value={form.strength} onChange={e => setForm({...form, strength: e.target.value})} className="dcs-input" placeholder="500mg" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Stock Qty</label>
                    <input type="number" min="0" value={form.stockQuantity} onChange={e => setForm({...form, stockQuantity: Number(e.target.value)})} className="dcs-input" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Reorder Level</label>
                    <input type="number" min="0" value={form.reorderLevel} onChange={e => setForm({...form, reorderLevel: Number(e.target.value)})} className="dcs-input" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Selling Price (USD)</label>
                    <input type="number" min="0" step="0.01" value={form.sellingPrice} onChange={e => setForm({...form, sellingPrice: Number(e.target.value)})} className="dcs-input" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Expiry Date</label>
                    <input type="date" value={form.expiryDate} onChange={e => setForm({...form, expiryDate: e.target.value})} className="dcs-input" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" className="btn-primary">{editItem ? 'Save Changes' : 'Add Medication'}</button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
