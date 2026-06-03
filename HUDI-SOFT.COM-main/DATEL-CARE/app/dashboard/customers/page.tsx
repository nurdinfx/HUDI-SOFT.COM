"use client"

import { useState, useEffect } from "react"
import { db, Customer, Loan } from "@/lib/db-store"
import { PAYMENT_METHODS, getPaymentStyle } from "@/lib/payment-methods"
import {
  Users, Plus, Search, Edit2, Trash2, CreditCard,
  TrendingUp, AlertCircle, CheckCircle2, DollarSign,
  Phone, Mail, MapPin, Wallet
} from "lucide-react"

type Tab = "customers" | "loans"

export default function CustomersPage() {
  const [tab, setTab] = useState<Tab>("customers")
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [search, setSearch] = useState("")
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [showLoanModal, setShowLoanModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null)

  // Customer form
  const [cName, setCName] = useState("")
  const [cPhone, setCPhone] = useState("")
  const [cEmail, setCEmail] = useState("")
  const [cAddress, setCAddress] = useState("")
  const [cType, setCType] = useState<Customer["type"]>("Individual")
  const [cPayment, setCPayment] = useState("Zaad")
  const [cStatus, setCStatus] = useState<Customer["status"]>("Active")

  // Loan form
  const [lCustomer, setLCustomer] = useState("")
  const [lCustomerId, setLCustomerId] = useState("")
  const [lAmount, setLAmount] = useState<number>(0)
  const [lPaid, setLPaid] = useState<number>(0)
  const [lDueDate, setLDueDate] = useState("")
  const [lMethod, setLMethod] = useState("Zaad")
  const [lStatus, setLStatus] = useState<Loan["status"]>("Active")
  const [lNotes, setLNotes] = useState("")

  useEffect(() => {
    setCustomers(db.getCustomers())
    setLoans(db.getLoans())
  }, [])

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )

  const filteredLoans = loans.filter(l =>
    l.customerName.toLowerCase().includes(search.toLowerCase()) ||
    l.id.toLowerCase().includes(search.toLowerCase())
  )

  const totalCredit = loans.filter(l => l.status !== "Settled").reduce((s, l) => s + l.remaining, 0)
  const activeLoans = loans.filter(l => l.status === "Active").length
  const overdueLoans = loans.filter(l => l.status === "Overdue").length

  // ── Customer CRUD ──────────────────────────────────────────────────────────

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault()
    let updated: Customer[]
    if (editingCustomer) {
      updated = customers.map(c => c.id === editingCustomer.id
        ? { ...c, name: cName, phone: cPhone, email: cEmail, address: cAddress, type: cType, preferredPayment: cPayment, status: cStatus }
        : c)
    } else {
      const nc: Customer = {
        id: `CUS-${String(customers.length + 1).padStart(3, "0")}`,
        name: cName, phone: cPhone, email: cEmail, address: cAddress,
        type: cType, totalBilled: 0, totalPaid: 0, creditBalance: 0,
        preferredPayment: cPayment, joinDate: new Date().toISOString().split("T")[0], status: cStatus
      }
      updated = [...customers, nc]
    }
    db.saveCustomers(updated); setCustomers(updated); resetCustomerForm()
  }

  const handleEditCustomer = (c: Customer) => {
    setEditingCustomer(c); setCName(c.name); setCPhone(c.phone); setCEmail(c.email)
    setCAddress(c.address); setCType(c.type); setCPayment(c.preferredPayment); setCStatus(c.status)
    setShowCustomerModal(true)
  }

  const handleDeleteCustomer = (id: string) => {
    if (confirm("Delete this customer record?")) {
      const updated = customers.filter(c => c.id !== id)
      db.saveCustomers(updated); setCustomers(updated)
    }
  }

  const resetCustomerForm = () => {
    setCName(""); setCPhone(""); setCEmail(""); setCAddress("")
    setCType("Individual"); setCPayment("Zaad"); setCStatus("Active")
    setEditingCustomer(null); setShowCustomerModal(false)
  }

  // ── Loan CRUD ──────────────────────────────────────────────────────────────

  const handleSaveLoan = (e: React.FormEvent) => {
    e.preventDefault()
    const remaining = Number(lAmount) - Number(lPaid)
    let updated: Loan[]
    if (editingLoan) {
      updated = loans.map(l => l.id === editingLoan.id
        ? { ...l, customerName: lCustomer, amount: Number(lAmount), paid: Number(lPaid), remaining, dueDate: lDueDate, method: lMethod, status: lStatus, notes: lNotes }
        : l)
    } else {
      const nl: Loan = {
        id: `LN-${String(loans.length + 1).padStart(3, "0")}`,
        customerId: lCustomerId || "CUS-???",
        customerName: lCustomer,
        amount: Number(lAmount), paid: Number(lPaid), remaining,
        dueDate: lDueDate, method: lMethod, status: lStatus, notes: lNotes,
        date: new Date().toISOString().split("T")[0]
      }
      updated = [...loans, nl]
    }
    db.saveLoans(updated); setLoans(updated); resetLoanForm()
  }

  const handleEditLoan = (l: Loan) => {
    setEditingLoan(l); setLCustomer(l.customerName); setLCustomerId(l.customerId)
    setLAmount(l.amount); setLPaid(l.paid); setLDueDate(l.dueDate)
    setLMethod(l.method); setLStatus(l.status); setLNotes(l.notes)
    setShowLoanModal(true)
  }

  const handleDeleteLoan = (id: string) => {
    if (confirm("Delete this loan record?")) {
      const updated = loans.filter(l => l.id !== id)
      db.saveLoans(updated); setLoans(updated)
    }
  }

  const resetLoanForm = () => {
    setLCustomer(""); setLCustomerId(""); setLAmount(0); setLPaid(0)
    setLDueDate(""); setLMethod("Zaad"); setLStatus("Active"); setLNotes("")
    setEditingLoan(null); setShowLoanModal(false)
  }

  const PaymentBadge = ({ method }: { method: string }) => {
    const s = getPaymentStyle(method)
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${s.color}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
      </span>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <Users className="text-clinical-500" /> Customer Management
          </h1>
          <p className="text-slate-500">Manage clients, credit balances, and Somali payment methods.</p>
        </div>
        <div className="flex gap-3">
          {tab === "customers" ? (
            <button onClick={() => { resetCustomerForm(); setShowCustomerModal(true) }}
              className="px-5 py-2.5 bg-clinical-600 text-white rounded-xl font-bold text-sm hover:bg-clinical-700 transition-colors shadow-md shadow-clinical-500/20 flex items-center gap-2">
              <Plus size={18} /> Add Customer
            </button>
          ) : (
            <button onClick={() => { resetLoanForm(); setShowLoanModal(true) }}
              className="px-5 py-2.5 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition-colors shadow-md flex items-center gap-2">
              <Plus size={18} /> New Loan / Credit
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 shrink-0">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-clinical-50 flex items-center justify-center"><Users size={22} className="text-clinical-600" /></div>
          <div><p className="text-sm font-bold text-slate-500">Total Customers</p><h3 className="text-2xl font-black">{customers.length}</h3></div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-orange-100 dark:border-orange-900 shadow-sm flex items-center gap-4 relative overflow-hidden">
          <div className="absolute right-0 top-0 h-full w-1.5 bg-orange-500 rounded-r-3xl" />
          <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center"><CreditCard size={22} className="text-orange-500" /></div>
          <div><p className="text-sm font-bold text-slate-500">Outstanding Credit</p><h3 className="text-2xl font-black text-orange-600">${totalCredit.toFixed(2)}</h3></div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center"><AlertCircle size={22} className="text-red-500" /></div>
          <div><p className="text-sm font-bold text-slate-500">Active / Overdue Loans</p><h3 className="text-2xl font-black">{activeLoans} / <span className="text-red-500">{overdueLoans}</span></h3></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 shrink-0">
        {(["customers", "loans"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-6 py-3 font-black text-sm capitalize border-b-2 transition-all ${tab === t ? "border-clinical-600 text-clinical-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
            {t === "loans" ? "💳 Credit & Loans" : "👥 Customers"}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative w-full max-w-md shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input type="text" placeholder="Search..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 text-sm font-medium" />
      </div>

      {/* ── CUSTOMERS TABLE ── */}
      {tab === "customers" && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-widest text-slate-500">
                <th className="p-4 pl-6">Customer</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Type</th>
                <th className="p-4">Preferred Payment</th>
                <th className="p-4 text-right">Billed</th>
                <th className="p-4 text-right">Credit Due</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filteredCustomers.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="p-4 pl-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-clinical-100 flex items-center justify-center font-black text-clinical-700">{c.name.charAt(0)}</div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{c.name}</p>
                        <p className="text-xs font-mono text-slate-400">{c.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm">
                    <div className="flex flex-col gap-1">
                      {c.phone && <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium"><Phone size={11} /> {c.phone}</span>}
                      {c.email && <span className="flex items-center gap-1.5 text-slate-400 font-medium text-xs"><Mail size={11} /> {c.email}</span>}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${c.type === "Corporate" ? "bg-blue-100 text-blue-700" : c.type === "Insurance" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-700"}`}>
                      {c.type}
                    </span>
                  </td>
                  <td className="p-4"><PaymentBadge method={c.preferredPayment} /></td>
                  <td className="p-4 text-right font-bold">${c.totalBilled.toFixed(2)}</td>
                  <td className="p-4 text-right">
                    {c.creditBalance > 0
                      ? <span className="font-black text-orange-600">${c.creditBalance.toFixed(2)}</span>
                      : <span className="text-emerald-600 font-bold flex items-center gap-1 justify-end"><CheckCircle2 size={14} /> Settled</span>
                    }
                  </td>
                  <td className="p-4">
                    <span className={`text-xs font-black flex items-center gap-1.5 ${c.status === "Active" ? "text-emerald-600" : "text-red-500"}`}>
                      {c.status === "Active" ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />} {c.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleEditCustomer(c)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"><Edit2 size={15} /></button>
                      <button onClick={() => handleDeleteCustomer(c.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── LOANS TABLE ── */}
      {tab === "loans" && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-widest text-slate-500">
                <th className="p-4 pl-6">Loan ID</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Payment Method</th>
                <th className="p-4 text-right">Amount</th>
                <th className="p-4 text-right">Paid</th>
                <th className="p-4 text-right">Remaining</th>
                <th className="p-4">Due Date</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filteredLoans.map(l => (
                <tr key={l.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="p-4 pl-6 font-mono text-sm font-bold text-orange-600">{l.id}</td>
                  <td className="p-4 font-bold text-slate-900 dark:text-white">{l.customerName}</td>
                  <td className="p-4"><PaymentBadge method={l.method} /></td>
                  <td className="p-4 text-right font-bold">${l.amount.toFixed(2)}</td>
                  <td className="p-4 text-right text-emerald-600 font-bold">${l.paid.toFixed(2)}</td>
                  <td className="p-4 text-right font-black text-orange-600">${l.remaining.toFixed(2)}</td>
                  <td className="p-4 text-sm font-medium text-slate-500">{l.dueDate}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${l.status === "Settled" ? "bg-emerald-100 text-emerald-700" : l.status === "Overdue" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleEditLoan(l)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"><Edit2 size={15} /></button>
                      <button onClick={() => handleDeleteLoan(l.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── CUSTOMER MODAL ── */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-2xl">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6">{editingCustomer ? "Edit Customer" : "Register New Customer"}</h3>
            <form onSubmit={handleSaveCustomer} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label-xs">Full Name</label>
                  <input required value={cName} onChange={e => setCName(e.target.value)} className="input-field" placeholder="e.g. Ahmed Ali" />
                </div>
                <div>
                  <label className="label-xs">Phone</label>
                  <input required value={cPhone} onChange={e => setCPhone(e.target.value)} className="input-field" placeholder="+252 61..." />
                </div>
                <div>
                  <label className="label-xs">Email</label>
                  <input value={cEmail} onChange={e => setCEmail(e.target.value)} className="input-field" placeholder="Optional" />
                </div>
                <div className="col-span-2">
                  <label className="label-xs">Address</label>
                  <input value={cAddress} onChange={e => setCAddress(e.target.value)} className="input-field" placeholder="District, City" />
                </div>
                <div>
                  <label className="label-xs">Customer Type</label>
                  <select value={cType} onChange={e => setCType(e.target.value as any)} className="input-field">
                    <option value="Individual">Individual</option>
                    <option value="Corporate">Corporate</option>
                    <option value="Insurance">Insurance</option>
                  </select>
                </div>
                <div>
                  <label className="label-xs">Preferred Payment</label>
                  <select value={cPayment} onChange={e => setCPayment(e.target.value)} className="input-field">
                    {PAYMENT_METHODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-xs">Status</label>
                  <select value={cStatus} onChange={e => setCStatus(e.target.value as any)} className="input-field">
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={resetCustomerForm} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-clinical-600 text-white rounded-xl font-bold text-sm hover:bg-clinical-700 shadow-md">Save Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── LOAN MODAL ── */}
      {showLoanModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-2xl">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6">{editingLoan ? "Update Loan Record" : "Create Loan / Credit Record"}</h3>
            <form onSubmit={handleSaveLoan} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label-xs">Customer Name</label>
                  <input required value={lCustomer} onChange={e => setLCustomer(e.target.value)} className="input-field" placeholder="e.g. Ahmed Ali" />
                </div>
                <div>
                  <label className="label-xs">Total Amount ($)</label>
                  <input type="number" step="0.01" required value={lAmount} onChange={e => setLAmount(Number(e.target.value))} className="input-field" />
                </div>
                <div>
                  <label className="label-xs">Amount Paid ($)</label>
                  <input type="number" step="0.01" value={lPaid} onChange={e => setLPaid(Number(e.target.value))} className="input-field" />
                </div>
                <div>
                  <label className="label-xs">Payment Method</label>
                  <select value={lMethod} onChange={e => setLMethod(e.target.value)} className="input-field">
                    {PAYMENT_METHODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-xs">Due Date</label>
                  <input type="date" required value={lDueDate} onChange={e => setLDueDate(e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="label-xs">Status</label>
                  <select value={lStatus} onChange={e => setLStatus(e.target.value as any)} className="input-field">
                    <option value="Active">Active</option>
                    <option value="Settled">Settled</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="label-xs">Notes</label>
                  <input value={lNotes} onChange={e => setLNotes(e.target.value)} className="input-field" placeholder="Invoice reference, reason, etc." />
                </div>
              </div>
              <div className="p-4 bg-orange-50 dark:bg-orange-500/10 rounded-2xl text-sm font-bold text-orange-700">
                Remaining Balance: <span className="text-xl font-black">${Math.max(0, lAmount - lPaid).toFixed(2)}</span>
              </div>
              <div className="flex gap-4 pt-2">
                <button type="button" onClick={resetLoanForm} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 shadow-md">Save Loan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shared input styles (inline for Tailwind purge safety) */}
      <style jsx>{`
        .label-xs { @apply block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1; }
        .input-field { @apply w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 text-sm font-medium; }
      `}</style>
    </div>
  )
}
