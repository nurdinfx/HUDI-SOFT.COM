'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Pill, Search, AlertTriangle, ShoppingCart, Package, DollarSign,
  TrendingUp, Receipt, CheckCircle, Trash2, Printer, User, UserPlus,
  AlertCircle, X
} from 'lucide-react'
import api from '@/lib/api'
import { Medication, Patient } from '@/types'
import { formatDate, formatCurrency } from '@/lib/utils'
import { useLanguage } from '@/context/LanguageContext'

interface CartItem {
  medication: Medication
  quantity: number
  unitPrice: number
}

export default function PharmacyPage() {
  const { t, language } = useLanguage()
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

  // Quick Customer Registration Modal state
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false)
  const [newCustForm, setNewCustForm] = useState({ fullName: '', phone: '', gender: 'Male', address: '' })
  const [savingCustomer, setSavingCustomer] = useState(false)

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

  const isDebtSale = posPaymentMethod.toLowerCase().includes('credit') || posPaymentMethod.toLowerCase().includes('dayn')

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
      const { data } = await api.get('/patients', { params: { limit: 200 } })
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

  // When user switches to Credit/Dayn, force customerType to patient
  useEffect(() => {
    if (isDebtSale && customerType !== 'patient') {
      setCustomerType('patient')
    }
  }, [posPaymentMethod, isDebtSale])

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

  // Quick Customer Registration
  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCustForm.fullName.trim() || !newCustForm.phone.trim()) {
      return alert(language === 'so' ? 'Fadlan geli magaca iyo taleefanka macmiilka' : 'Please enter customer name and phone')
    }
    setSavingCustomer(true)
    try {
      const { data } = await api.post('/patients', {
        ...newCustForm,
        dateOfBirth: '1995-01-01'
      })
      const createdPatient = data.patient || data
      setPatients(prev => [createdPatient, ...prev])
      setSelectedPatientId(createdPatient.id)
      setCustomerType('patient')
      setShowNewCustomerModal(false)
      setNewCustForm({ fullName: '', phone: '', gender: 'Male', address: '' })
      alert(language === 'so' ? 'Macmiilka cusub waa la diiwaangeliyay!' : 'Customer successfully registered!')
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error registering customer')
    } finally {
      setSavingCustomer(false)
    }
  }

  // POS Functions
  const addToCart = (med: Medication) => {
    if (med.stockQuantity <= 0) {
      alert(language === 'so' ? `Daawada "${med.name}" kaydkeedu waa eber (0)!` : `Medication "${med.name}" is out of stock!`)
      return
    }
    setCart(prev => {
      const existing = prev.find(item => item.medication.id === med.id)
      if (existing) {
        if (existing.quantity >= med.stockQuantity) {
          alert(language === 'so' ? `Kama kordhin kartid kaydka yaalla (${med.stockQuantity})` : `Cannot exceed available stock (${med.stockQuantity})`)
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
            alert(language === 'so' ? `Kaydka ugu badan waa ${item.medication.stockQuantity}` : `Max stock available is ${item.medication.stockQuantity}`)
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
    if (cart.length === 0) {
      return alert(language === 'so' ? 'Dambiiluhu waa maran yahay! Fadlan dawo ku dar.' : 'Cart is empty! Please add items.')
    }
    if (isDebtSale && !selectedPatientId) {
      return alert(language === 'so' ? 'Iibka daynta ah wuxuu u baahan yahay in la doorto macmiil diiwaangashan.' : 'Credit / Debt sale requires selecting or registering a customer.')
    }
    if (customerType === 'patient' && !selectedPatientId) {
      return alert(language === 'so' ? 'Fadlan dooro bukaanka ama diiwaangeli macmiil cusub.' : 'Please select a registered patient/customer.')
    }

    setProcessingSale(true)
    try {
      const saleNotes = isDebtSale
        ? `[Dayn / Debt Sale] ${posNotes || ''}`
        : customerType === 'walkin'
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
        customerName: customerType === 'patient'
          ? patients.find(p => p.id === selectedPatientId)?.fullName
          : (walkinName || (language === 'so' ? 'Macmiil Socod ah' : 'Walk-in Customer')),
        totalAmount: cartTotal,
        paymentMethod: posPaymentMethod,
        isDebt: isDebtSale,
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
    const isDebt = saleData.isDebt || (saleData.payment_status === 'Unpaid') || (saleData.payment_method?.includes('Credit') || saleData.payment_method?.includes('Dayn'))
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
        .debt-banner { background: #fee2e2; border: 1px solid #ef4444; color: #b91c1c; font-weight: bold; text-align: center; padding: 6px; margin: 10px 0; border-radius: 4px; }
        .footer { text-align: center; font-size: 11px; border-top: 1px dashed #000; padding-top: 10px; margin-top: 15px; }
        @media print { button { display: none; } }
      </style></head><body>
      <div class="header center">
        <h1 class="title">HUDI DENTAL & PHARMACY</h1>
        <p class="sub">Dispensary Point of Sale</p>
        <p class="sub">Sale #: ${saleData.sale_number || 'SALE'}</p>
        <p class="sub">Date: ${new Date().toLocaleString()}</p>
        <p class="sub">Customer: ${saleData.customerName || saleData.patient_name || 'Walk-in'}</p>
      </div>
      ${isDebt ? '<div class="debt-banner">*** LOAN / DAYN (UNPAID) ***</div>' : ''}
      <table>
        <thead>
          <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
        </thead>
        <tbody>
          ${(saleData.items || []).map((it: any) => `
            <tr>
              <td>${it.medication?.name || it.name || it.medication_name || 'Medication'}</td>
              <td>${it.quantity}</td>
              <td>$${Number(it.unitPrice || it.unit_price || 0).toFixed(2)}</td>
              <td>$${(it.quantity * Number(it.unitPrice || it.unit_price || 0)).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="totals">
        <div class="row bold"><span>Total Amount:</span><span>$${Number(saleData.totalAmount || saleData.total_amount || 0).toFixed(2)}</span></div>
        <div class="row"><span>Status:</span><span>${isDebt ? 'UNPAID / DAYN' : 'PAID'}</span></div>
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
            <Pill className="w-6 h-6 text-primary" /> {t('pharmacyTitle', 'Pharmacy & Drug Store')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('pharmacySubtitle', 'Dispensary POS · Inventory · Sales & Accounts')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lowStock.length > 0 && (
            <div onClick={() => setTab('lowstock')} className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-rose-100 dark:bg-rose-950/40 text-rose-600 rounded-xl text-xs font-bold border border-rose-200">
              <AlertTriangle className="w-4 h-4" />
              {lowStock.length} {t('lowStock', 'Low Stock')}
            </div>
          )}
          <button
            onClick={() => setTab('pos')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
              tab === 'pos' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <ShoppingCart className="w-4 h-4" /> {t('posTerminal', 'Point of Sale (POS)')}
          </button>
          <button
            onClick={() => {
              setEditItem(null)
              setForm({ name:'',genericName:'',category:'',dosageForm:'Tablet',strength:'',stockQuantity:0,reorderLevel:10,sellingPrice:0,expiryDate:'' })
              setShowForm(true)
            }}
            className="btn-primary text-xs"
          >
            <Plus className="w-4 h-4" /> {t('addMedication', 'Add Medication')}
          </button>
        </div>
      </div>

      {/* KPI Accounts Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="kpi-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 font-semibold">{t('todaySales', "Today's Sales")}</p>
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
                <p className="text-xs text-slate-500 font-semibold">{t('monthlySales', 'Monthly Sales')}</p>
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
                <p className="text-xs text-slate-500 font-semibold">{t('totalTransactions', 'Transactions')}</p>
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
                <p className="text-xs text-slate-500 font-semibold">{t('stockValue', 'Stock Value')}</p>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{formatCurrency(stats.inventoryValue)}</p>
                <p className="text-[11px] text-slate-400">{stats.totalMedications} Items</p>
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
          { id: 'pos', label: t('posTerminal', 'Point of Sale (POS)'), badge: cart.length > 0 ? `${cart.length}` : null },
          { id: 'inventory', label: t('inventory', 'Inventory') },
          { id: 'sales', label: t('salesLogs', 'Sales Logs') },
          { id: 'lowstock', label: `${t('lowStock', 'Low Stock')} (${lowStock.length})` },
        ].map(tTab => (
          <button
            key={tTab.id}
            onClick={() => setTab(tTab.id as any)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              tab === tTab.id
                ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>{tTab.label}</span>
            {tTab.badge && (
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center">
                {tTab.badge}
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
                  placeholder={t('searchMedications', 'Search medications...')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[620px] overflow-y-auto pr-1">
              {filteredMeds.length === 0 ? (
                <div className="col-span-3 py-16 text-center text-slate-400 glass-card">
                  <Pill className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{language === 'so' ? 'Wax dawo ah lama helin' : 'No medications found'}</p>
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
                        {isOutOfStock ? (language === 'so' ? 'Eber (0)' : 'Out of stock') : `Stock: ${m.stockQuantity}`}
                      </span>
                      {inCart ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-black text-[10px]">
                          +{inCart.quantity}
                        </span>
                      ) : (
                        <span className="text-primary font-bold text-xs hover:underline">+ Add</span>
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
                  <h2 className="font-extrabold text-base text-slate-900 dark:text-white">{t('cart', 'Cart')}</h2>
                </div>
                {cart.length > 0 && (
                  <button onClick={clearCart} className="text-xs text-rose-500 hover:underline font-semibold">
                    {language === 'so' ? 'Faaruqi' : 'Clear'}
                  </button>
                )}
              </div>

              {/* Customer Selector with Quick Register */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                    {t('customer', 'Customer')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewCustomerModal(true)}
                    className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> {t('newCustomer', '+ Register Customer')}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isDebtSale}
                    onClick={() => setCustomerType('walkin')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      customerType === 'walkin'
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 border-slate-200'
                    } ${isDebtSale ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    🚶 {t('walkin', 'Walk-in Customer')}
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
                    🏥 {t('registeredPatient', 'Registered Patient')}
                  </button>
                </div>

                {customerType === 'walkin' ? (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <input
                      value={walkinName}
                      onChange={e => setWalkinName(e.target.value)}
                      placeholder={language === 'so' ? 'Magaca (Optional)' : 'Name (Optional)'}
                      className="dcs-input text-xs"
                    />
                    <input
                      value={walkinPhone}
                      onChange={e => setWalkinPhone(e.target.value)}
                      placeholder={language === 'so' ? 'Telefoonka (Optional)' : 'Phone (Optional)'}
                      className="dcs-input text-xs"
                    />
                  </div>
                ) : (
                  <div className="space-y-1 pt-1">
                    <select
                      value={selectedPatientId}
                      onChange={e => setSelectedPatientId(e.target.value)}
                      className="dcs-input text-xs font-semibold"
                    >
                      <option value="">{t('selectPatient', 'Select patient...')}</option>
                      {patients.map(p => (
                        <option key={p.id} value={p.id}>{p.fullName} ({p.patientNumber})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Cart Items List */}
              <div className="border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-3 max-h-52 overflow-y-auto space-y-2">
                {cart.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-1 opacity-20" />
                    <p className="text-xs">{t('cartEmpty', 'Cart is empty. Click a medicine to add.')}</p>
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
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {t('paymentMethod', 'Payment Method')}
                    </label>
                    {isDebtSale && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-rose-500 text-white">
                        {language === 'so' ? 'Dayn (Loan)' : 'Debt Sale'}
                      </span>
                    )}
                  </div>
                  <select
                    value={posPaymentMethod}
                    onChange={e => setPosPaymentMethod(e.target.value)}
                    className={`dcs-input text-xs font-bold ${isDebtSale ? 'border-rose-500 text-rose-600 dark:text-rose-400' : ''}`}
                  >
                    {[
                      { val: 'Cash', label: 'Cash (Kaash)' },
                      { val: 'EVC Plus', label: 'EVC Plus' },
                      { val: 'Zaad', label: 'Zaad' },
                      { val: 'Sahal', label: 'Sahal' },
                      { val: 'Card', label: 'Card (Kaadh)' },
                      { val: 'Credit / Dayn (Amaah)', label: '🔴 Credit / Dayn (Amaah)' },
                      { val: 'Insurance', label: 'Insurance (Caymis)' }
                    ].map(m => (
                      <option key={m.val} value={m.val}>{m.label}</option>
                    ))}
                  </select>
                </div>

                {/* Debt Notification Box */}
                {isDebtSale && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-start gap-2 text-xs">
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-rose-700 dark:text-rose-300">
                        {language === 'so' ? 'Iibka Daynta ah (Loan Sale)' : 'Credit / Debt Sale'}
                      </p>
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">
                        {t('debtNotice', 'Debt requires selecting a registered customer to track in accounts.')}
                      </p>
                    </div>
                  </div>
                )}

                <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('subtotal', 'Subtotal')}:</span>
                    <span className="font-semibold">{formatCurrency(cartSubtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{t('discount', 'Discount')} (%):</span>
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
                    <span>{t('total', 'Total')}:</span>
                    <span className={`text-lg ${isDebtSale ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {formatCurrency(cartTotal)}
                    </span>
                  </div>
                </div>

                <button
                  disabled={cart.length === 0 || processingSale}
                  onClick={handleCheckout}
                  className={`w-full py-3 text-white rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isDebtSale
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  } disabled:opacity-50`}
                >
                  <CheckCircle className="w-4 h-4" />
                  {processingSale
                    ? (language === 'so' ? 'Iibinayaa...' : 'Processing...')
                    : isDebtSale
                    ? `${language === 'so' ? 'Diiwaangeli Daynta' : 'Save as Debt'} (${formatCurrency(cartTotal)})`
                    : `${t('completeSale', 'Complete Sale')} (${formatCurrency(cartTotal)})`}
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
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="dcs-input pl-10"
                placeholder={t('searchMedications', 'Search medications…')}
              />
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
                          <ShoppingCart className="w-3 h-3" /> {language === 'so' ? 'Iibi' : 'Sell'}
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
                    <p>{language === 'so' ? 'Wax iib ah weli ma jiraan' : 'No sales recorded yet'}</p>
                  </td></tr>
                ) : sales.map((s) => {
                  const isSaleDebt = s.payment_status === 'Unpaid' || s.payment_method?.includes('Credit') || s.payment_method?.includes('Dayn')
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-5 py-4 text-sm font-mono font-semibold text-slate-700 dark:text-slate-300">{s.sale_number}</td>
                      <td className="px-5 py-4 text-sm font-medium text-slate-900 dark:text-white">
                        {s.patient_name || 'Walk-in Customer'}
                        {s.patient_number && <span className="block text-xs text-slate-400">{s.patient_number}</span>}
                      </td>
                      <td className="px-5 py-4 text-sm font-bold text-slate-900 dark:text-white">
                        <span className={isSaleDebt ? 'text-rose-600' : 'text-emerald-600'}>
                          {formatCurrency(s.total_amount)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-400 font-medium">{s.payment_method}</td>
                      <td className="px-5 py-4 text-xs text-slate-500">{s.served_by_name || 'Pharmacist'}</td>
                      <td className="px-5 py-4">
                        {isSaleDebt ? (
                          <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                            Dayn (Unpaid)
                          </span>
                        ) : (
                          <span className="badge-green">{s.payment_status}</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500">{formatDate(s.created_at)}</td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => printReceipt(s)}
                          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1"
                        >
                          <Printer className="w-3.5 h-3.5" /> {t('printReceipt', 'Receipt')}
                        </button>
                      </td>
                    </tr>
                  )
                })}
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
              <p>{language === 'so' ? 'Dhammaan daawooyinku kayd fiican ayay leeyihiin' : 'All medications are well stocked'}</p>
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

      {/* Quick Register Customer Modal */}
      <AnimatePresence>
        {showNewCustomerModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setShowNewCustomerModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="modal-panel max-w-md z-50">
              <div className="flex items-center justify-between mb-4 border-b pb-3">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {language === 'so' ? 'Diiwaangeli Macmiil / Bukaan Cusub' : 'Register New Customer / Patient'}
                  </h3>
                </div>
                <button onClick={() => setShowNewCustomerModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleQuickAddCustomer} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'so' ? 'Magaca oo buuxa (Full Name) *' : 'Full Name *'}
                  </label>
                  <input
                    required
                    value={newCustForm.fullName}
                    onChange={e => setNewCustForm({ ...newCustForm, fullName: e.target.value })}
                    className="dcs-input text-sm"
                    placeholder="e.g. Liibaan Maxamed Cali"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {language === 'so' ? 'Telefoonka (Phone) *' : 'Phone *'}
                    </label>
                    <input
                      required
                      value={newCustForm.phone}
                      onChange={e => setNewCustForm({ ...newCustForm, phone: e.target.value })}
                      className="dcs-input text-sm"
                      placeholder="+252 61..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {language === 'so' ? 'Jinsiga (Gender)' : 'Gender'}
                    </label>
                    <select
                      value={newCustForm.gender}
                      onChange={e => setNewCustForm({ ...newCustForm, gender: e.target.value })}
                      className="dcs-input text-sm"
                    >
                      <option value="Male">Lab (Male)</option>
                      <option value="Female">Dheddig (Female)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'so' ? 'Cinwaanka / Xaafadda (Address)' : 'Address'}
                  </label>
                  <input
                    value={newCustForm.address}
                    onChange={e => setNewCustForm({ ...newCustForm, address: e.target.value })}
                    className="dcs-input text-sm"
                    placeholder="e.g. Hodan, Muqdisho"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowNewCustomerModal(false)} className="btn-secondary text-xs">
                    {t('cancel', 'Cancel')}
                  </button>
                  <button type="submit" disabled={savingCustomer} className="btn-primary text-xs flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {savingCustomer ? 'Saving...' : (language === 'so' ? 'Diiwaangeli & Xulo' : 'Register & Select')}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add / Edit Medication Modal */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setShowForm(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="modal-panel max-w-lg">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5">
                {editItem ? 'Edit Medication' : t('addMedication', 'Add Medication')}
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
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">{t('cancel', 'Cancel')}</button>
                  <button type="submit" className="btn-primary">{editItem ? t('save', 'Save') : t('addMedication', 'Add Medication')}</button>
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
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                {completedSale.isDebt
                  ? (language === 'so' ? 'Iibka Daynta ah wuu Diyaarsan yahay!' : 'Debt Sale Recorded!')
                  : (language === 'so' ? 'Iibku wuu Guulaystay!' : 'Sale Completed!')}
              </h3>
              <p className="text-xs text-slate-500 mt-1">Sale #{completedSale.sale_number}</p>
              
              <div className="my-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-bold flex justify-between">
                <span>{completedSale.isDebt ? (language === 'so' ? 'Daynta Guud:' : 'Total Debt:') : `${t('total', 'Total')}:`}</span>
                <span className={`font-extrabold ${completedSale.isDebt ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {formatCurrency(completedSale.totalAmount)}
                </span>
              </div>

              {completedSale.isDebt && (
                <p className="text-xs text-rose-600 font-medium mb-3">
                  {language === 'so'
                    ? 'Dayntan waxaa toos loogu daray xisaabaadka iyo qaansheegyada bukaanka.'
                    : 'This debt has been added to the customer billing account.'}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => printReceipt(completedSale)}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> {t('printReceipt', 'Print Receipt')}
                </button>
                <button
                  onClick={() => setCompletedSale(null)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                >
                  {language === 'so' ? 'Xir' : 'Close'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
