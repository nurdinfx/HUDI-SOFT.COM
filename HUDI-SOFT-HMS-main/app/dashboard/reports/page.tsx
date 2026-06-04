"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/db-store"
import {
  BarChart3, TrendingUp, Users, DollarSign,
  TestTube, Pill, Calendar, Activity
} from "lucide-react"

export default function ReportsPage() {
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalInvoices: 0,
    totalRevenue: 0,
    pendingInvoices: 0,
    totalAppointments: 0,
    completedAppointments: 0,
    totalLabTests: 0,
    completedLabs: 0,
    totalMedications: 0,
    lowStockMeds: 0,
  })

  useEffect(() => {
    const patients = db.getPatients()
    const invoices = db.getInvoices()
    const appointments = db.getAppointments()
    const labs = db.getLabs()
    const meds = db.getMedications()

    setStats({
      totalPatients: patients.length,
      totalInvoices: invoices.length,
      totalRevenue: invoices.filter(i => i.status === "Paid").reduce((s, i) => s + i.amount, 0),
      pendingInvoices: invoices.filter(i => i.status === "Pending").length,
      totalAppointments: appointments.length,
      completedAppointments: appointments.filter(a => a.status === "Completed").length,
      totalLabTests: labs.length,
      completedLabs: labs.filter(l => l.status === "Completed").length,
      totalMedications: meds.length,
      lowStockMeds: meds.filter(m => m.stock <= m.minStock).length,
    })
  }, [])

  const kpis = [
    { label: "Total Patients", value: stats.totalPatients, icon: Users, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
    { label: "Total Revenue", value: `$${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
    { label: "Total Appointments", value: stats.totalAppointments, icon: Calendar, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100" },
    { label: "Lab Tests Run", value: stats.totalLabTests, icon: TestTube, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" },
  ]

  const bars = [
    { label: "Patients", total: stats.totalPatients, done: stats.totalPatients, color: "bg-blue-500" },
    { label: "Appointments", total: stats.totalAppointments, done: stats.completedAppointments, color: "bg-purple-500" },
    { label: "Lab Tests", total: stats.totalLabTests, done: stats.completedLabs, color: "bg-rose-500" },
    { label: "Invoices", total: stats.totalInvoices, done: stats.totalInvoices - stats.pendingInvoices, color: "bg-emerald-500" },
  ]

  const paymentRows = [
    { method: "Zaad",   pct: 35, color: "bg-red-500" },
    { method: "Sahal",  pct: 25, color: "bg-blue-500" },
    { method: "Edahab", pct: 20, color: "bg-yellow-500" },
    { method: "MyCash", pct: 12, color: "bg-green-500" },
    { method: "Credit (Loan)", pct: 8, color: "bg-orange-500" },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-500 flex flex-col">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
          <BarChart3 className="text-clinical-500" /> Reports & Analytics
        </h1>
        <p className="text-slate-500">Live insights pulled from all clinical modules.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className={`bg-white dark:bg-slate-800 p-6 rounded-3xl border ${kpi.border} dark:border-slate-700 shadow-sm`}>
              <div className={`w-12 h-12 rounded-2xl ${kpi.bg} flex items-center justify-center mb-4`}>
                <Icon size={22} className={kpi.color} />
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">{kpi.value}</h3>
              <p className="text-sm font-bold text-slate-500 mt-1">{kpi.label}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Completion Rates */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-8">
          <h2 className="text-lg font-black text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <Activity size={20} className="text-clinical-500" /> Module Completion Rates
          </h2>
          <p className="text-xs font-bold text-slate-400 mb-8 uppercase tracking-widest">Done vs Total across all workflows</p>

          <div className="space-y-6">
            {bars.map((bar) => {
              const pct = bar.total === 0 ? 0 : Math.round((bar.done / bar.total) * 100)
              return (
                <div key={bar.label}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{bar.label}</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">{bar.done} / {bar.total}
                      <span className="text-xs font-bold text-slate-400 ml-2">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${bar.color} rounded-full transition-all duration-700`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Payment Breakdown */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-8">
          <h2 className="text-lg font-black text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <DollarSign size={20} className="text-emerald-500" /> Payment Method Breakdown
          </h2>
          <p className="text-xs font-bold text-slate-400 mb-8 uppercase tracking-widest">Revenue split across all payment channels</p>

          <div className="space-y-5">
            {paymentRows.map((row) => (
              <div key={row.method}>
                <div className="flex justify-between mb-1.5">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{row.method}</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">{row.pct}%</span>
                </div>
                <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full ${row.color} rounded-full transition-all duration-700`} style={{ width: `${row.pct}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-500">Total Paid Revenue</span>
            <span className="text-2xl font-black text-emerald-600">${stats.totalRevenue.toFixed(2)}</span>
          </div>
        </div>

        {/* Inventory Health */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-8">
          <h2 className="text-lg font-black text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <Pill size={20} className="text-clinical-500" /> Pharmacy Inventory Health
          </h2>
          <p className="text-xs font-bold text-slate-400 mb-8 uppercase tracking-widest">Stock level analysis</p>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-5 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl">
              <h3 className="text-3xl font-black text-emerald-600">{stats.totalMedications - stats.lowStockMeds}</h3>
              <p className="text-xs font-bold text-slate-500 mt-1">In Stock</p>
            </div>
            <div className="p-5 bg-orange-50 dark:bg-orange-500/10 rounded-2xl">
              <h3 className="text-3xl font-black text-orange-500">{stats.lowStockMeds}</h3>
              <p className="text-xs font-bold text-slate-500 mt-1">Low / Out</p>
            </div>
            <div className="p-5 bg-slate-50 dark:bg-slate-700 rounded-2xl">
              <h3 className="text-3xl font-black text-slate-700 dark:text-white">{stats.totalMedications}</h3>
              <p className="text-xs font-bold text-slate-500 mt-1">Total SKUs</p>
            </div>
          </div>
        </div>

        {/* Quick Summary Table */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-8">
          <h2 className="text-lg font-black text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-500" /> Operations Summary
          </h2>
          <p className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-widest">Snapshot across all modules</p>

          <div className="space-y-3">
            {[
              { label: "Patients Registered", value: stats.totalPatients },
              { label: "Appointments Scheduled", value: stats.totalAppointments },
              { label: "Appointments Completed", value: stats.completedAppointments },
              { label: "Pending Invoices", value: stats.pendingInvoices },
              { label: "Lab Tests Requested", value: stats.totalLabTests },
              { label: "Lab Tests Completed", value: stats.completedLabs },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-center py-2.5 border-b border-slate-50 dark:border-slate-700/50 last:border-none">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">{row.label}</span>
                <span className="text-sm font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-lg">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
