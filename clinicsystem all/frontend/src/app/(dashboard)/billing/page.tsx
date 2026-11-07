'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Receipt, DollarSign, TrendingUp, Search, Download, CreditCard, AlertCircle, CheckCircle, Clock } from 'lucide-react'
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
  const [submitting, setSubmitting] = useState(false)

  // Invoice Form State with Full Debt / Loan support
  const [form, setForm] = useState({
    patientId: '',
    paymentMethod: 'Cash',
    paymentType: 'full' as 'full' | 'partial' | 'credit',
    paidAmountInput: '',
    dueDate: '',
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
      setInvoices(invRes.data.invoices || [])
      setTotal(invRes.data.total || 0)
      setStats(statsRes.data || null)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [page, statusFilter])
  useEffect(() => {
    api.get('/patients', { params: { limit: 100 } }).then(r => setPatients(r.data.patients || [])).catch(() => {})
  }, [])

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { description: '', quantity: 1, unitPrice: 0 }] }))
  const removeItem = (i: number) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))
  const updateItem = (i: number, field: string, val: any) => {
    const items = [...form.items]
    items[i] = { ...items[i], [field]: val }
    setForm(f => ({ ...f, items }))
  }

  const subtotal = form.items.reduce((s, i) => s + (Number(i.unitPrice || 0) * Number(i.quantity || 1)), 0)
  const discount = (subtotal * Number(form.discountPercent || 0)) / 100
  const totalAmount = Math.max(0, subtotal - discount)

  // Calculate paid & debt amount based on payment type
  const calculatedPaidAmount =
    form.paymentType === 'credit'
      ? 0
      : form.paymentType === 'partial'
      ? Math.max(0, Math.min(totalAmount, Number(form.paidAmountInput || 0)))
      : totalAmount

  const calculatedBalanceDue = Math.max(0, totalAmount - calculatedPaidAmount)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.patientId) return alert('Fadlan dooro bukaanka (Please select a patient)')
    const validItems = form.items.filter(i => i.description.trim())
    if (!validItems.length) return alert('Fadlan ku dar ugu yaraan hal adeeg (Please add at least one item)')

    setSubmitting(true)
    try {
      await api.post('/invoices', {
        patientId: form.patientId,
        paymentMethod: form.paymentType === 'credit' ? 'Credit / Dayn (Amaah)' : form.paymentMethod,
        discountPercent: form.discountPercent,
        notes: form.notes,
        dueDate: form.dueDate || undefined,
        items: validItems,
        paidAmount: calculatedPaidAmount,
      })
      setShowForm(false)
      setForm({
        patientId: '',
        paymentMethod: 'Cash',
        paymentType: 'full',
        paidAmountInput: '',
        dueDate: '',
        discountPercent: 0,
        notes: '',
        items: [{ description: '', quantity: 1, unitPrice: 0 }],
      })
      load()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error creating invoice')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePayment = async () => {
    if (!showPay || !payAmount) return
    try {
      await api.post(`/invoices/${showPay.id}/pay`, { amount: Number(payAmount), paymentMethod: payMethod })
      setShowPay(null)
      setPayAmount('')
      load()
    } catch (err: any) { alert(err.response?.data?.message || 'Error recording payment') }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Billing & Invoicing (Xisaabaadka & Daymaha)</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {total} invoices total · Maamulka lacag-bixinta, qaansheegyada iyo daymaha bukaanada
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => {
            setForm(f => ({ ...f, paymentType: 'credit' }))
            setShowForm(true)
          }} className="px-4 py-2 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-xl hover:bg-amber-500/20 font-bold text-sm transition-all flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-600" /> + Diiwaangeli Dayn (Loan)
          </button>
          <button onClick={() => {
            setForm(f => ({ ...f, paymentType: 'full' }))
            setShowForm(true)
          }} className="btn-primary">
            <Plus className="w-4 h-4" /> New Invoice
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Today Revenue', value: formatCurrency(stats.dailyRevenue), icon: DollarSign, grad: 'gradient-success' },
            { label: 'Monthly Revenue', value: formatCurrency(stats.monthlyRevenue), icon: TrendingUp, grad: 'gradient-primary' },
            { label: 'Yearly Revenue', value: formatCurrency(stats.yearlyRevenue), icon: Receipt, grad: 'gradient-teal' },
            { label: 'Unpaid & Loans (Daymo)', value: `${stats.unpaidInvoices} Invoices`, icon: CreditCard, grad: 'bg-rose-500 text-white' },
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
      <div className="glass-card p-4 flex gap-2 flex-wrap items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {[
            { id: '', label: 'All Invoices' },
            { id: 'Unpaid', label: '🔴 Dayn Buuxda (Unpaid / Loans)' },
            { id: 'Partial', label: '🟡 Dayn Qayb ah (Partial)' },
            { id: 'Paid', label: '🟢 Bixiyey (Paid)' },
            { id: 'Refunded', label: 'Refunded' },
            { id: 'Waived', label: 'Waived' }
          ].map(s => (
            <button
              key={s.id || 'all'}
              onClick={() => { setStatusFilter(s.id); setPage(1) }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === s.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                {['Invoice #', 'Patient', 'Amount', 'Paid', 'Balance (Dayn)', 'Payment Method', 'Status', 'Date', 'Action'].map(h => (
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
              ) : invoices.map((inv, i) => {
                const hasDebt = Number(inv.balanceDue || 0) > 0
                return (
                  <motion.tr key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3.5 text-sm font-mono font-bold text-slate-700 dark:text-slate-300">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{inv.patientName}</p>
                      <p className="text-xs text-slate-400">{inv.patientNumber}</p>
                    </td>
                    <td className="px-4 py-3.5 text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(inv.totalAmount)}</td>
                    <td className="px-4 py-3.5 text-sm text-green-600 font-medium">{formatCurrency(inv.paidAmount)}</td>
                    <td className="px-4 py-3.5 text-sm font-bold">
                      {hasDebt ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
                          <span>{formatCurrency(inv.balanceDue)}</span>
                          <span className="text-[10px] font-black uppercase px-1 py-0.2 bg-rose-500 text-white rounded">Dayn</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-normal">$0.00</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300 font-medium">{inv.paymentMethod}</td>
                    <td className="px-4 py-3.5"><span className={getStatusColor(inv.paymentStatus)}>{inv.paymentStatus}</span></td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">{formatDate(inv.invoiceDate || (inv as any).createdAt)}</td>
                    <td className="px-4 py-3.5">
                      {hasDebt && inv.paymentStatus !== 'Waived' ? (
                        <button
                          onClick={() => { setShowPay(inv); setPayAmount(String(inv.balanceDue)) }}
                          className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-bold shadow-sm flex items-center gap-1"
                        >
                          <CreditCard className="w-3.5 h-3.5" /> Bixi Daynta
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Waa bixiyey
                        </span>
                      )}
                    </td>
                  </motion.tr>
                )
              })}
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

      {/* Record Payment Modal (Bixi Daynta) */}
      <AnimatePresence>
        {showPay && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setShowPay(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="modal-panel max-w-md">
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Bixi Daynta Macmiilka</h2>
                  <p className="text-xs text-slate-400">Record Debt / Loan Repayment</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>

              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-100 dark:border-rose-900/40 mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">Bukaanka: {showPay.patientName}</p>
                  <p className="text-[11px] text-slate-500">Invoice: {showPay.invoiceNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-slate-400">Wadarta Daynta Hadhay</p>
                  <p className="text-lg font-extrabold text-rose-600 dark:text-rose-400">{formatCurrency(showPay.balanceDue)}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Lacagta uu hadda keenay ($)</label>
                    <button
                      type="button"
                      onClick={() => setPayAmount(String(showPay.balanceDue))}
                      className="text-xs text-primary font-bold hover:underline"
                    >
                      Bixi Wada ({formatCurrency(showPay.balanceDue)})
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    max={showPay.balanceDue}
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    className="dcs-input text-lg font-bold text-emerald-600"
                    placeholder="0.00"
                  />
                  {Number(payAmount) > 0 && Number(payAmount) < showPay.balanceDue && (
                    <p className="text-xs text-amber-600 font-medium">
                      Waxaa weli ku haraya dayn dhan: {formatCurrency(showPay.balanceDue - Number(payAmount))}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Habka uu u bixiyey (Payment Method)</label>
                  <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className="dcs-input">
                    {['Cash (Kaash)','EVC Plus','Zaad','Sahal','eDahab','Card (Kaadh)','Insurance','Other'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setShowPay(null)} className="btn-secondary">Cancel</button>
                  <button onClick={handlePayment} className="btn-primary">
                    Xaqiiji Lacag-Bixinta
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* New Invoice / Loan Modal */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setShowForm(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="modal-panel max-w-2xl max-h-[90vh] overflow-y-auto">
              
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {form.paymentType === 'credit' ? 'Diiwaangeli Dayn / Amaah (New Loan)' : 'Qaansheeg Cusub (New Invoice)'}
                  </h2>
                  <p className="text-xs text-slate-500">Samee qaansheeg ama dayn lagu diiwaangelinayo bukaanka</p>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  form.paymentType === 'credit'
                    ? 'bg-rose-500/10 text-rose-600 border border-rose-500/30'
                    : form.paymentType === 'partial'
                    ? 'bg-amber-500/10 text-amber-600 border border-amber-500/30'
                    : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                }`}>
                  {form.paymentType === 'credit' ? 'Amaah / Dayn Buuxda' : form.paymentType === 'partial' ? 'Dayn Qayb ah' : 'Bixiyey Wada'}
                </span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Patient & Payment Method */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Bukaanka (Patient) *</label>
                    <select required value={form.patientId} onChange={e => setForm({...form, patientId: e.target.value})} className="dcs-input">
                      <option value="">Dooro bukaanka…</option>
                      {patients.map(p => <option key={p.id} value={p.id}>{p.fullName} ({p.patientNumber})</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Habka Lacagta (Payment Method)</label>
                    <select
                      value={form.paymentMethod}
                      onChange={e => setForm({...form, paymentMethod: e.target.value})}
                      className="dcs-input"
                      disabled={form.paymentType === 'credit'}
                    >
                      {['Cash (Kaash)','EVC Plus','Zaad','Sahal','eDahab','Card (Kaadh)','Credit / Dayn (Amaah)','Insurance (Caymis)','Other'].map(m => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Adeegyada Ilkaha / Daawaynta (Items) *</p>
                    <button type="button" onClick={addItem} className="btn-ghost text-xs text-primary font-bold">+ Add Item</button>
                  </div>
                  <div className="space-y-2">
                    {form.items.map((item, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-center">
                        <input
                          value={item.description}
                          onChange={e => updateItem(i, 'description', e.target.value)}
                          className="dcs-input col-span-6 text-sm"
                          placeholder="Sharaxaadda (e.g. Tooth Extraction, Braces, RCT) *"
                          required
                        />
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e => updateItem(i, 'quantity', Number(e.target.value))}
                          className="dcs-input col-span-2 text-sm"
                          placeholder="Qty"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={e => updateItem(i, 'unitPrice', Number(e.target.value))}
                          className="dcs-input col-span-3 text-sm font-semibold"
                          placeholder="Price ($)"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => removeItem(i)}
                          className="col-span-1 text-red-400 hover:text-red-600 transition-colors font-bold text-center"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals & Discount */}
                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 space-y-2 border border-slate-200/50 dark:border-slate-700/50">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Subtotal (Wadarta Adeegyada)</span>
                    <span className="font-semibold">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Dhimis / Discount (%)</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={form.discountPercent}
                      onChange={e => setForm({...form, discountPercent: Number(e.target.value)})}
                      className="w-20 px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-right font-bold"
                    />
                  </div>
                  <div className="flex justify-between text-base font-extrabold border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
                    <span>Wadarta Guud (Total Bill)</span>
                    <span className="text-primary text-lg">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>

                {/* PAYMENT & LOAN (DAYN) SELECTION - CRUCIAL */}
                <div className="space-y-3 p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/40">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider block">
                    Xaaladda Lacag-bixinta & Daynta (Payment & Debt Mode) *
                  </label>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, paymentType: 'full', paidAmountInput: '' }))}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all text-center border ${
                        form.paymentType === 'full'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      🟢 Wada Bixiyey
                      <span className="block text-[10px] opacity-80 font-normal">Full Payment</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, paymentType: 'partial', paidAmountInput: String(totalAmount / 2) }))}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all text-center border ${
                        form.paymentType === 'partial'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      🟡 Qayb Bixiyey
                      <span className="block text-[10px] opacity-80 font-normal">Partial (Dayn ku hadhay)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, paymentType: 'credit', paidAmountInput: '0' }))}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all text-center border ${
                        form.paymentType === 'credit'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      🔴 Amaah / Dayn Buuxda
                      <span className="block text-[10px] opacity-80 font-normal">Full Loan / Credit ($0)</span>
                    </button>
                  </div>

                  {/* Partial Payment Input */}
                  {form.paymentType === 'partial' && (
                    <div className="pt-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Lacagta hadda la bixiyey ($):</label>
                        <span className="text-xs text-rose-600 font-extrabold">
                          Daynta Hadhay: {formatCurrency(calculatedBalanceDue)}
                        </span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max={totalAmount}
                        step="0.01"
                        value={form.paidAmountInput}
                        onChange={e => setForm(f => ({ ...f, paidAmountInput: e.target.value }))}
                        className="dcs-input text-base font-bold text-emerald-600"
                        placeholder="Geli lacagta uu hadda bixiyey..."
                        required
                      />
                    </div>
                  )}

                  {/* Full Credit / Loan Notification */}
                  {form.paymentType === 'credit' && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-start gap-2.5">
                      <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-rose-700 dark:text-rose-300">
                          Dayn / Amaah Buuxda: {formatCurrency(totalAmount)}
                        </p>
                        <p className="text-[11px] text-rose-600 dark:text-rose-400">
                          Bukaanka wax lacag ah hadda kama qaadaysid. Wadarta oo dhan waxay u galaysaa Dayn (Unpaid Invoice).
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Due Date & Loan Notes (Optional) */}
                  {(form.paymentType === 'partial' || form.paymentType === 'credit') && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Taariikhda ballanta bixinta daynta (Due Date)</label>
                        <input
                          type="date"
                          value={form.dueDate}
                          onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                          className="dcs-input text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Qoraal / Xusuusin (Notes)</label>
                        <input
                          type="text"
                          value={form.notes}
                          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                          className="dcs-input text-xs"
                          placeholder="e.g. Dayn lagu heshiiyay..."
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Final Summary Banner */}
                <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <div className="text-xs">
                    <span className="text-slate-500">Hadda La Bixiyey: </span>
                    <span className="font-extrabold text-emerald-600">{formatCurrency(calculatedPaidAmount)}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-slate-500">Daynta Hadhay: </span>
                    <span className={`font-extrabold ${calculatedBalanceDue > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                      {formatCurrency(calculatedBalanceDue)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary" disabled={submitting}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting ? 'Kaydinayaa...' : form.paymentType === 'credit' ? 'Diiwaangeli Daynta (Save Loan)' : 'Create Invoice'}
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
