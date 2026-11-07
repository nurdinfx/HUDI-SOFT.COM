'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pill, Search, AlertTriangle, ShoppingCart, Package, DollarSign, TrendingUp, Receipt, CheckCircle, Trash2, Printer, User, ArrowRight } from 'lucide-react'
import api from '@/lib/api'
import { Medication, Patient } from '@/types'
import { formatDate, formatCurrency } from '@/lib/utils'

interface CartItem {
  medication: Medication
  quantity: number
  unitPrice: number
}

export default function PharmacyPage() {
  const [tab, setTab] = useState<'pos' | 'inventory' | 'sales' | 'lowstock'>('pos')
  const [medications, setMedications] = useState<Medication[]>([])
  const [lowStock, setLowStock] = useState<Medication[]>([])
  const [sales, setSales] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [posSearch, setPosSearch] = useState('')
  const [loading, setLoading] = useState(true)

  // Medication modal state
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Medication | null>(null)
  const [form, setForm] = useState({
    name: '',
    genericName: '',
    category: '',
    dosageForm: 'Tablet',
    strength: '',
    stockQuantity: 0,
    reorderLevel: 10,
    sellingPrice: 0,
    expiryDate: ''
  })

  // POS State
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerType, setCustomerType] = useState<'walkin' | 'patient'>('walkin')
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [walkinName, setWalkinName] = useState('')
  const [walkinPhone, setWalkinPhone] = useState('')
  const [posPaymentMethod, setPosPaymentMethod] = useState('Cash')
  const [posDiscount, setPosDiscount] = useState<number>(0)
  const [posNotes, setPosNotes] = useState('')
  const [processingSale, setProcessingSale] = useState(false)
  const [completedSale, setCompletedSale] = useState<any | null>(null)

  const loadStats = async () => {
    try {
      const { data } = await api.get('/pharmacy/stats')
      setStats(data)
    } catch {}
  }

  const loadMeds = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/pharmacy/medications', { params: { search, page, limit: 100 } })
      setMedications(data.medications || [])
      setTotal(data.total || 0)
    } catch {} finally { setLoading(false) }
  }

  const loadLow = async () => {
    try {
      const { data } = await api.get('/pharmacy/medications', { params: { lowStock: true } })
      setLowStock(data.medications || [])
    } catch {}
  }

  const loadSales = async () => {
    try {
      const { data } = await api.get('/pharmacy/sales', { params: { page, limit: 20 } })
      setSales(data.sales || [])
    } catch {}
  }

  const loadPatients = async () => {
    try {
      const { data } = await api.get('/patients', { params: { limit: 100 } })
      setPatients(data.patients || [])
    } catch {}
  }

  useEffect(() => {
    loadMeds()
    loadLow()
    loadStats()
    loadPatients()
  }, [search, page])

  useEffect(() => {
    if (tab === 'sales') {
      loadSales()
      loadStats()
    }
  }, [tab])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editItem) await api.put(`/pharmacy/medications/${editItem.id}`, form)
      else await api.post('/pharmacy/medications', form)
      setShowForm(false)
      setEditItem(null)
      loadMeds()
      loadLow()
      loadStats()
    } catch (err: any) { alert(err.response?.data?.message || 'Error saving medication') }
  }

  // POS Functions
  const addToCart = (med: Medication) => {
    if (med.stockQuantity <= 0) {
      alert(`Daawada "${med.name}" kaydkeedu waa eber (0 Stock)!`)
      return
    }
    setCart(prev => {
      const existing = prev.find(item => item.medication.id === med.id)
      if (existing) {
        if (existing.quantity >= med.stockQuantity) {
          alert(`Kama kordhin kartid kaydka yaalla (${med.stockQuantity})`)
          return prev
        }
        return prev.map(item =>
          item.medication.id === med.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { medication: med, quantity: 1, unitPrice: med.sellingPrice }]
    })
  }

  const updateCartQty = (medId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(medId)
      return
    }
    setCart(prev =>
      prev.map(item => {
        if (item.medication.id === medId) {
          if (qty > item.medication.stockQuantity) {
            alert(`Kaydka ugu badan waa ${item.medication.stockQuantity}`)
            return { ...item, quantity: item.medication.stockQuantity }
          }
          return { ...item, quantity: qty }
        }
        return item
      })
    )
  }

  const removeFromCart = (medId: string) => {
    setCart(prev => prev.filter(item => item.medication.id !== medId))
  }

  const clearCart = () => setCart([])

  const cartSubtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
  const cartDiscountAmount = (cartSubtotal * Number(posDiscount || 0)) / 100
  const cartTotal = Math.max(0, cartSubtotal - cartDiscountAmount)

  const handleCheckout = async () => {
    if (cart.length === 0) return alert('Dambiiluhu waa maran yahay! Fadlan dawo ku dar.')
    if (customerType === 'patient' && !selectedPatientId) return alert('Fadlan dooro bukaanka diiwaangashan.')

    setProcessingSale(true)
    try {
      const saleNotes = customerType === 'walkin'
        ? `Walk-in Customer: ${walkinName || 'General'} ${walkinPhone ? `(${walkinPhone})` : ''} ${posNotes ? `- ${posNotes}` : ''}`
        : posNotes

      const payload = {
        patientId: customerType === 'patient' ? selectedPatientId : undefined,
        paymentMethod: posPaymentMethod,
        notes: saleNotes,
        items: cart.map(i => ({
          medicationId: i.medication.id,
          quantity: i.quantity,
          unitPrice: i.unitPrice
        }))
      }

      const { data } = await api.post('/pharmacy/sales', payload)
      setCompletedSale({
        ...data,
        items: [...cart],
        customerName: customerType === 'patient' ? patients.find(p => p.id === selectedPatientId)?.fullName : (walkinName || 'Walk-in Customer'),
        totalAmount: cartTotal,
        paymentMethod: posPaymentMethod,
        date: new Date()
      })
      clearCart()
      setPosNotes('')
      setWalkinName('')
      setWalkinPhone('')
      loadMeds()
      loadLow()
      loadStats()
      loadSales()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error completing sale')
    } finally {
      setProcessingSale(false)
    }
  }

  const printReceipt = (saleData: any) => {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html><head><title>Pharmacy Receipt</title>
      <style>
        body { font-family: 'Courier New', monospace; padding: 20px; max-width: 380px; margin: 0 auto; color: #111; }
        .center { text-align: center; }
        .header { border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
        .title { font-size: 18px; font-weight: bold; margin: 0; }
        .sub { font-size: 11px; margin: 2px 0; color: #555; }
        table { width: 100%; font-size: 12px; margin: 10px 0; border-collapse: collapse; }
        th { text-align: left; border-bottom: 1px solid #000; padding: 4px 0; }
        td { padding: 4px 0; }
        .totals { border-top: 1px dashed #000; padding-top: 8px; font-size: 13px; margin-top: 8px; }
        .row { display: flex; justify-content: space-between; margin: 3px 0; }
        .bold { font-weight: bold; }
        .footer { text-align: center; font-size: 11px; border-top: 1px dashed #000; padding-top: 10px; margin-top: 15px; }
        @media print { button { display: none; } }
      </style></head><body>
      <div class="header center">
        <h1 class="title">HUDI DENTAL & PHARMACY</h1>
        <p class="sub">Clinical Dispensary & POS</p>
        <p class="sub">Receipt #: ${saleData.sale_number || 'SALE'}</p>
        <p class="sub">Date: ${new Date().toLocaleString()}</p>
        <p class="sub">Customer: ${saleData.customerName || saleData.patient_name || 'Walk-in'}</p>
      </div>
      <table>
        <thead>
          <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
        </thead>
        <tbody>
          ${(saleData.items || []).map((it: any) => `
            <tr>
              <td>${it.medication?.name || it.name || 'Medication'}</td>
              <td>${it.quantity}</td>
              <td>$${Number(it.unitPrice || it.unit_price || 0).toFixed(2)}</td>
              <td>$${(it.quantity * Number(it.unitPrice || it.unit_price || 0)).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="totals">
        <div class="row bold"><span>Total Paid:</span><span>$${Number(saleData.totalAmount || saleData.total_amount || 0).toFixed(2)}</span></div>
        <div class="row"><span>Payment Method:</span><span>${saleData.paymentMethod || saleData.payment_method || 'Cash'}</span></div>
      </div>
      <div class="footer">
        <p>Mahadsanid! Waad ku mahadsan tahay booqashadaada.</p>
        <p>Ku kaydi daawada meel qabow oo qalalan.</p>
      </div>
      <script>window.print();</script>
      </body></html>
    `)
  }

  const filteredMeds = medications.filter(m =>
    m.name.toLowerCase().includes(posSearch.toLowerCase()) ||
    (m.genericName && m.genericName.toLowerCase().includes(posSearch.toLowerCase())) ||
    (m.category && m.category.toLowerCase().includes(posSearch.toLowerCase()))
  )

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Pill className="w-6 h-6 text-primary" /> Pharmacy & Drug Store POS
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Iibinta Daawooyinka (POS) · Maamulka Kaydka (Inventory) · Xisaabaadka & Dakhliga
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lowStock.length > 0 && (
            <div onClick={() => setTab('lowstock')} className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-rose-100 dark:bg-rose-950/40 text-rose-600 rounded-xl text-xs font-bold border border-rose-200">
              <AlertTriangle className="w-4 h-4" />
              {lowStock.length} Low Stock
            </div>
          )}
          <button
            onClick={() => setTab('pos')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
              tab === 'pos' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <ShoppingCart className="w-4 h-4" /> Pharmacy POS (Iibi Dawo)
          </button>
          <button
            onClick={() => {
              setEditItem(null)
              setForm({ name:'',genericName:'',category:'',dosageForm:'Tablet',strength:'',stockQuantity:0,reorderLevel:10,sellingPrice:0,expiryDate:'' })
              setShowForm(true)
            }}
            className="btn-primary text-xs"
          >
            <Plus className="w-4 h-4" /> Add Medication
          </button>
        </div>
      </div>

      {/* KPI Accounts Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="kpi-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 font-semibold">Iibka Maanta (Today's Sales)</p>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1">{formatCurrency(stats.todaySales)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 font-semibold">Iibka Bishaan (Monthly Sales)</p>
                <p className="text-2xl font-extrabold text-primary mt-1">{formatCurrency(stats.monthSales)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 font-semibold">Tirada Iibka (Transactions)</p>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{stats.totalTransactions}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 font-semibold">Qiimaha Kaydka (Stock Value)</p>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{formatCurrency(stats.inventoryValue)}</p>
                <p className="text-[11px] text-slate-400">{stats.totalMedications} Nooc Dawo ah</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit border border-slate-200/50">
        {[
          { id: 'pos', label: '🛒 Pharmacy POS (Terminal)', badge: cart.length > 0 ? `${cart.length}` : null },
          { id: 'inventory', label: '📦 Kaydka Daawooyinka (Inventory)' },
          { id: 'sales', label: '📊 Xisaabaadka Iibka (Sales Logs)' },
          { id: 'lowstock', label: `⚠️ Low Stock (${lowStock.length})` },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              tab === t.id
                ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>{t.label}</span>
            {t.badge && (
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: PHARMACY POS (POINT OF SALE) */}
      {tab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Medication Catalog Grid */}
          <div className="lg:col-span-7 space-y-4">
            <div className="glass-card p-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={posSearch}
                  onChange={e => setPosSearch(e.target.value)}
                  className="dcs-input pl-10 text-sm font-medium"
                  placeholder="Raadi Dawo (Magaca, Generic, ama Qaybta)..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[620px] overflow-y-auto pr-1">
              {filteredMeds.length === 0 ? (
                <div className="col-span-3 py-16 text-center text-slate-400 glass-card">
                  <Pill className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Wax dawo ah lama helin</p>
                </div>
              ) : filteredMeds.map(m => {
                const inCart = cart.find(c => c.medication.id === m.id)
                const isOutOfStock = m.stockQuantity <= 0
                return (
                  <div
                    key={m.id}
                    onClick={() => !isOutOfStock && addToCart(m)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isOutOfStock
                        ? 'opacity-50 bg-slate-100 dark:bg-slate-800/40 border-slate-200 cursor-not-allowed'
                        : inCart
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-400 shadow-sm'
                        : 'bg-white dark:bg-slate-800 border-slate-200/80 hover:border-primary hover:shadow-md'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <p className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{m.name}</p>
                        <span className="text-xs font-black text-emerald-600">{formatCurrency(m.sellingPrice)}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{m.dosageForm} {m.strength}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between text-xs">
                      <span className={`font-bold ${isOutOfStock ? 'text-red-500' : m.stockQuantity <= m.reorderLevel ? 'text-amber-500' : 'text-slate-500'}`}>
                        {isOutOfStock ? 'Eber (0)' : `Kayd: ${m.stockQuantity}`}
                      </span>
                      {inCart ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-black text-[10px]">
                          +{inCart.quantity}
                        </span>
                      ) : (
                        <span className="text-primary font-bold text-xs hover:underline">+ Iibi</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right Panel: Cart & Checkout */}
          <div className="lg:col-span-5">
            <div className="glass-card p-5 space-y-4 sticky top-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                  <h2 className="font-extrabold text-base text-slate-900 dark:text-white">Dambiisha POS-ka</h2>
                </div>
                {cart.length > 0 && (
                  <button onClick={clearCart} className="text-xs text-rose-500 hover:underline font-semibold">
                    Faaruqi Dambiisha
                  </button>
                )}
              </div>

              {/* Customer Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Macmiilka (Customer)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomerType('walkin')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      customerType === 'walkin'
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 border-slate-200'
                    }`}
                  >
                    🚶 Macmiil Socod ah (Walk-in)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerType('patient')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      customerType === 'patient'
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 border-slate-200'
                    }`}
                  >
                    🏥 Bukaan Diiwaangashan
                  </button>
                </div>

                {customerType === 'walkin' ? (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <input
                      value={walkinName}
                      onChange={e => setWalkinName(e.target.value)}
                      placeholder="Magaca Macmiilka (Optional)"
                      className="dcs-input text-xs"
                    />
                    <input
                      value={walkinPhone}
                      onChange={e => setWalkinPhone(e.target.value)}
                      placeholder="Telefoonka (Optional)"
                      className="dcs-input text-xs"
                    />
                  </div>
                ) : (
                  <select
                    value={selectedPatientId}
                    onChange={e => setSelectedPatientId(e.target.value)}
                    className="dcs-input text-xs"
                  >
                    <option value="">Dooro bukaanka…</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.fullName} ({p.patientNumber})</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Cart Items List */}
              <div className="border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-3 max-h-56 overflow-y-auto space-y-2">
                {cart.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-1 opacity-20" />
                    <p className="text-xs">Dambiishu waa maran tahay. Guji dawo si aad ugu darto.</p>
                  </div>
                ) : cart.map(it => (
                  <div key={it.medication.id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-none">
                    <div className="flex-1 pr-2">
                      <p className="font-bold text-slate-900 dark:text-white leading-tight">{it.medication.name}</p>
                      <p className="text-[10px] text-slate-400">{formatCurrency(it.unitPrice)} x {it.quantity}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateCartQty(it.medication.id, it.quantity - 1)}
                        className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-bold">{it.quantity}</span>
                      <button
                        onClick={() => updateCartQty(it.medication.id, it.quantity + 1)}
                        className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                      >
                        +
                      </button>
                      <span className="w-14 text-right font-bold text-emerald-600">
                        {formatCurrency(it.unitPrice * it.quantity)}
                      </span>
                      <button
                        onClick={() => removeFromCart(it.medication.id)}
                        className="text-red-400 hover:text-red-600 ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Payment Method & Totals */}
              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Habka Lacag-bixinta (Payment Method)</label>
                  <select
                    value={posPaymentMethod}
                    onChange={e => setPosPaymentMethod(e.target.value)}
                    className="dcs-input text-xs font-semibold"
                  >
                    {['Cash','EVC Plus','Zaad','Sahal','Card','Insurance'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subtotal:</span>
                    <span className="font-semibold">{formatCurrency(cartSubtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Dhimis / Discount (%):</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={posDiscount}
                      onChange={e => setPosDiscount(Number(e.target.value))}
                      className="w-16 px-1.5 py-0.5 border rounded text-right font-bold"
                    />
                  </div>
                  <div className="flex justify-between text-base font-extrabold border-t border-slate-200 dark:border-slate-700 pt-2 text-slate-900 dark:text-white">
                    <span>Wadarta Guud:</span>
                    <span className="text-emerald-600 text-lg">{formatCurrency(cartTotal)}</span>
                  </div>
                </div>

                <button
                  disabled={cart.length === 0 || processingSale}
                  onClick={handleCheckout}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  {processingSale ? 'Iibinayaa...' : `Xaqiiji Iibka (${formatCurrency(cartTotal)})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INVENTORY TABLE */}
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
                      <td className="px-5 py-4 flex gap-2">
                        <button
                          onClick={() => {
                            addToCart(m)
                            setTab('pos')
                          }}
                          className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-lg text-xs font-bold hover:bg-emerald-100 flex items-center gap-1"
                        >
                          <ShoppingCart className="w-3 h-3" /> Iibi
                        </button>
                        <button onClick={() => {
                          setEditItem(m)
                          setForm({ name:m.name,genericName:m.genericName||'',category:m.category||'',dosageForm:m.dosageForm||'Tablet',strength:m.strength||'',stockQuantity:m.stockQuantity,reorderLevel:m.reorderLevel,sellingPrice:m.sellingPrice,expiryDate:m.expiryDate?.split('T')[0]||'' })
                          setShowForm(true)
                        }} className="btn-ghost text-xs py-1 px-2">Edit</button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB 3: SALES & ACCOUNTS LOGS */}
      {tab === 'sales' && (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  {['Sale #', 'Customer / Patient', 'Amount', 'Payment Method', 'Served By', 'Status', 'Date', 'Action'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {sales.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>Wax iib ah weli ma jiraan</p>
                  </td></tr>
                ) : sales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-5 py-4 text-sm font-mono font-semibold text-slate-700 dark:text-slate-300">{s.sale_number}</td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-900 dark:text-white">
                      {s.patient_name || 'Walk-in Customer'}
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-emerald-600">{formatCurrency(s.total_amount)}</td>
                    <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-400 font-medium">{s.payment_method}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">{s.served_by_name || 'Pharmacist'}</td>
                    <td className="px-5 py-4"><span className="badge-green">{s.payment_status}</span></td>
                    <td className="px-5 py-4 text-xs text-slate-500">{formatDate(s.created_at)}</td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => printReceipt(s)}
                        className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        <Printer className="w-3.5 h-3.5" /> Rasiidh
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: LOW STOCK */}
      {tab === 'lowstock' && (
        <div className="space-y-3">
          {lowStock.length === 0 ? (
            <div className="glass-card py-12 text-center text-slate-400">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Dhammaan daawooyinku kayd fiican ayay leeyihiin</p>
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

      {/* Add / Edit Medication Modal */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setShowForm(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="modal-panel max-w-lg">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5">
                {editItem ? 'Edit Medication' : 'Add Medication to Inventory'}
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
                    <input value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="dcs-input" placeholder="Antibiotic, Analgesic…" />
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
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Selling Price ($)</label>
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

      {/* Sale Completed Success Modal with Receipt Print */}
      <AnimatePresence>
        {completedSale && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setCompletedSale(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="modal-panel max-w-sm z-50 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Iibku wuu Guulaystay!</h3>
              <p className="text-xs text-slate-500 mt-1">Sale #{completedSale.sale_number} has been recorded</p>
              
              <div className="my-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-bold flex justify-between">
                <span>Wadarta La Bixiyey:</span>
                <span className="text-emerald-600 font-extrabold">{formatCurrency(completedSale.totalAmount)}</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => printReceipt(completedSale)}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Daabac Rasiidhka
                </button>
                <button
                  onClick={() => setCompletedSale(null)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                >
                  Xir
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
