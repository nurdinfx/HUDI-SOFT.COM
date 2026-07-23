'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Receipt, DollarSign, TrendingUp, Search, Download, CreditCard } from 'lucide-react'
import api from '@/lib/api'
import { Invoice, Patient } from '@/types'
import { formatDate, formatCurrency, getStatusColor } from '@/lib/utils'

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [stats, setStats] = useState<any>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [patients, setPatients] = useState<Patient[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showPay, setShowPay] = useState<Invoice | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('Cash')
  const [form, setForm] = useState({
    patientId: '',
    paymentMethod: 'Cash',
    discountPercent: 0,
    notes: '',
    items: [{ description: '', quantity: 1, unitPrice: 0 }],
  })

  const load = async () => {
    setLoading(true)
    try {
      const params: any = { page, limit: 15 }
      if (statusFilter) params.paymentStatus = statusFilter
      const [invRes, statsRes] = await Promise.all([
        api.get('/invoices', { params }),
        api.get('/invoices/stats'),
      ])
      setInvoices(invRes.data.invoices)
      setTotal(invRes.data.total)
      setStats(statsRes.data)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [page, statusFilter])
  useEffect(() => {
    api.get('/patients', { params: { limit: 100 } }).then(r => setPatients(r.data.patients)).catch(() => {})
  }, [])

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { description: '', quantity: 1, unitPrice: 0 }] }))
  const removeItem = (i: number) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))
  const updateItem = (i: number, field: string, val: any) => {
    const items = [...form.items]
    items[i] = { ...items[i], [field]: val }
    setForm(f => ({ ...f, items }))
  }

  const subtotal = form.items.reduce((s, i) => s + (i.unitPrice * i.quantity), 0)
  const discount = (subtotal * form.discountPercent) / 100
  const totalAmount = subtotal - discount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/invoices', {
        ...form,
        items: form.items.filter(i => i.description.trim()),
        paidAmount: form.paymentMethod !== 'Credit' ? totalAmount : 0,
      })
      setShowForm(false)
      setForm({ patientId: '', paymentMethod: 'Cash', discountPercent: 0, notes: '', items: [{ description: '', quantity: 1, unitPrice: 0 }] })
      load()
    } catch (err: any) { alert(err.response?.data?.message || 'Error') }
  }

  const handlePayment = async () => {
    if (!showPay || !payAmount) return
    try {
      await api.post(`/invoices/${showPay.id}/pay`, { amount: Number(payAmount), paymentMethod: payMethod })
      setShowPay(null)
      setPayAmount('')
      load()
    } catch (err: any) { alert(err.response?.data?.message || 'Error') }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Billing & Invoicing</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{total} invoices total</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Today Revenue', value: formatCurrency(stats.dailyRevenue), icon: DollarSign, grad: 'gradient-success' },
            { label: 'Monthly Revenue', value: formatCurrency(stats.monthlyRevenue), icon: TrendingUp, grad: 'gradient-primary' },
            { label: 'Yearly Revenue', value: formatCurrency(stats.yearlyRevenue), icon: Receipt, grad: 'gradient-teal' },
            { label: 'Unpaid Invoices', value: stats.unpaidInvoices, icon: CreditCard, grad: 'gradient-warning' },
          ].map((s) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="kpi-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
                  <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{s.value}</p>
                </div>
                <div className={`w-11 h-11 rounded-xl ${s.grad} flex items-center justify-center`}>
                  <s.icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="glass-card p-4 flex gap-2 flex-wrap">
        {['', 'Unpaid', 'Partial', 'Paid', 'Refunded', 'Waived'].map(s => (
          <button key={s || 'all'} onClick={() => { setStatusFilter(s); setPage(1) }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${statusFilter === s ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                {['Invoice #', 'Patient', 'Amount', 'Paid', 'Balance', 'Payment', 'Status', 'Date', ''].map(h => (
                  <th key={h} className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>{[...Array(9)].map((_, j) => <td key={j} className="px-4 py-4"><div className="h-4 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" /></td>)}</tr>
                ))
              ) : invoices.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                  <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>No invoices found</p>
                </td></tr>
              ) : invoices.map((inv, i) => (
                <motion.tr key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3.5 text-sm font-mono font-bold text-slate-700 dark:text-slate-300">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{inv.patientName}</p>
                    <p className="text-xs text-slate-400">{inv.patientNumber}</p>
                  </td>
                  <td className="px-4 py-3.5 text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(inv.totalAmount)}</td>
                  <td className="px-4 py-3.5 text-sm text-green-600 font-medium">{formatCurrency(inv.paidAmount)}</td>
                  <td className="px-4 py-3.5 text-sm font-bold text-red-500">{formatCurrency(inv.balanceDue)}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-500">{inv.paymentMethod}</td>
                  <td className="px-4 py-3.5"><span className={getStatusColor(inv.paymentStatus)}>{inv.paymentStatus}</span></td>
                  <td className="px-4 py-3.5 text-xs text-slate-500">{formatDate(inv.invoiceDate)}</td>
                  <td className="px-4 py-3.5">
                    {inv.paymentStatus !== 'Paid' && inv.paymentStatus !== 'Waived' && (
                      <button onClick={() => { setShowPay(inv); setPayAmount(String(inv.balanceDue)) }}
                        className="text-xs px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 transition-colors font-medium">
                        Pay
                      </button>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > 15 && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <p className="text-xs text-slate-500">Showing {Math.min((page-1)*15+1,total)}–{Math.min(page*15,total)} of {total}</p>
            <div className="flex gap-2">
              <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40">Prev</button>
              <button disabled={page*15>=total} onClick={() => setPage(p=>p+1)} className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      <AnimatePresence>
        {showPay && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setShowPay(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="modal-panel max-w-sm">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Record Payment</h2>
              <p className="text-sm text-slate-500 mb-5">
                {showPay.patientName} · Invoice {showPay.invoiceNumber} ·
                Balance: <span className="font-bold text-red-500">{formatCurrency(showPay.balanceDue)}</span>
              </p>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Amount</label>
                  <input type="number" min="0" step="0.01" max={showPay.balanceDue} value={payAmount}
                    onChange={e => setPayAmount(e.target.value)} className="dcs-input text-lg font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Payment Method</label>
                  <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className="dcs-input">
                    {['Cash','EVC Plus','Zaad','Sahal','Card','Insurance','Other'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setShowPay(null)} className="btn-secondary">Cancel</button>
                  <button onClick={handlePayment} className="btn-primary">Confirm Payment</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* New Invoice Modal */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setShowForm(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="modal-panel max-w-2xl">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5">New Invoice</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Patient *</label>
                    <select required value={form.patientId} onChange={e => setForm({...form, patientId: e.target.value})} className="dcs-input">
                      <option value="">Select patient…</option>
                      {patients.map(p => <option key={p.id} value={p.id}>{p.fullName} ({p.patientNumber})</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Payment Method</label>
                    <select value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value})} className="dcs-input">
                      {['Cash','EVC Plus','Zaad','Sahal','Card','Insurance','Other'].map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Invoice Items</p>
                    <button type="button" onClick={addItem} className="btn-ghost text-xs">+ Add Item</button>
                  </div>
                  <div className="space-y-2">
                    {form.items.map((item, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-center">
                        <input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)}
                          className="dcs-input col-span-6 text-sm" placeholder="Description *" />
                        <input type="number" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', Number(e.target.value))}
                          className="dcs-input col-span-2 text-sm" placeholder="Qty" />
                        <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', Number(e.target.value))}
                          className="dcs-input col-span-3 text-sm" placeholder="Price" />
                        <button type="button" onClick={() => removeItem(i)} className="col-span-1 text-red-400 hover:text-red-600 transition-colors">×</button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-semibold">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Discount (%)</span>
                    <input type="number" min="0" max="100" value={form.discountPercent}
                      onChange={e => setForm({...form, discountPercent: Number(e.target.value)})}
                      className="w-20 px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-right" />
                  </div>
                  <div className="flex justify-between text-base font-bold border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" className="btn-primary">Create Invoice</button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
