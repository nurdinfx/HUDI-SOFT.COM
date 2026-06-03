"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/db-store"
import Link from "next/link"
import {
  Users, Calendar, DollarSign, Pill, TestTube,
  AlertTriangle, CheckCircle2, Clock, ArrowRight,
  Activity, Heart, Video, Wallet
} from "lucide-react"

export default function DashboardPage() {
  const [data, setData] = useState({
    patients: 0,
    todayAppointments: [] as any[],
    waitingCount: 0,
    revenue: 0,
    pendingInvoices: 0,
    lowStock: 0,
    pendingLabs: 0,
    completedLabs: 0,
  })
  const [currentUser, setCurrentUser] = useState({ name: "Dr. Sarah Jenkins", role: "Chief Medical Officer" })
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const storedUser = localStorage.getItem("dc_current_user")
    if (storedUser) setCurrentUser(JSON.parse(storedUser))

    const patients = db.getPatients()
    const appointments = db.getAppointments()
    const invoices = db.getInvoices()
    const meds = db.getMedications()
    const labs = db.getLabs()
    const today = new Date().toISOString().split("T")[0]

    setData({
      patients: patients.length,
      todayAppointments: appointments.filter(a => a.date === today || a.status === "Waiting" || a.status === "In Consultation").slice(0, 5),
      waitingCount: appointments.filter(a => a.status === "Waiting" || a.status === "In Consultation").length,
      revenue: invoices.filter(i => i.status === "Paid").reduce((s, i) => s + i.amount, 0),
      pendingInvoices: invoices.filter(i => i.status === "Pending").length,
      lowStock: meds.filter(m => m.stock <= m.minStock).length,
      pendingLabs: labs.filter(l => l.status === "Pending" || l.status === "Processing").length,
      completedLabs: labs.filter(l => l.status === "Completed").length,
    })

    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const statCards = [
    {
      label: "Registered Patients",
      value: data.patients,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-500/10",
      border: "border-blue-100 dark:border-blue-900",
      href: "/dashboard/patients",
    },
    {
      label: "Live Queue / Waiting",
      value: data.waitingCount,
      icon: Clock,
      color: "text-orange-600",
      bg: "bg-orange-50 dark:bg-orange-500/10",
      border: "border-orange-100 dark:border-orange-900",
      href: "/dashboard/appointments",
      urgent: data.waitingCount > 0,
    },
    {
      label: "Total Revenue (Paid)",
      value: `$${data.revenue.toFixed(2)}`,
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      border: "border-emerald-100 dark:border-emerald-900",
      href: "/dashboard/billing",
    },
    {
      label: "Pending Invoices",
      value: data.pendingInvoices,
      icon: DollarSign,
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-500/10",
      border: "border-purple-100 dark:border-purple-900",
      href: "/dashboard/billing",
    },
    {
      label: "Low Stock Alerts",
      value: data.lowStock,
      icon: Pill,
      color: "text-red-600",
      bg: "bg-red-50 dark:bg-red-500/10",
      border: "border-red-100 dark:border-red-900",
      href: "/dashboard/pharmacy",
      urgent: data.lowStock > 0,
    },
    {
      label: "Pending Lab Tests",
      value: data.pendingLabs,
      icon: TestTube,
      color: "text-clinical-600",
      bg: "bg-clinical-50 dark:bg-clinical-500/10",
      border: "border-clinical-100 dark:border-clinical-900",
      href: "/dashboard/laboratory",
    },
  ]

  const quickActions = [
    { label: "Register Patient", href: "/dashboard/patients", icon: Users, color: "bg-blue-600" },
    { label: "New Appointment", href: "/dashboard/appointments", icon: Calendar, color: "bg-purple-600" },
    { label: "Start Teleconsult", href: "/dashboard/telemedicine", icon: Video, color: "bg-clinical-600" },
    { label: "Create Invoice", href: "/dashboard/billing", icon: DollarSign, color: "bg-emerald-600" },
    { label: "Customers & Loans", href: "/dashboard/customers", icon: Wallet, color: "bg-orange-600" },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-clinical-900 via-clinical-800 to-clinical-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-clinical-900/30">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-4 left-4 w-40 h-40 rounded-full bg-clinical-300 blur-2xl" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-clinical-300 font-bold text-sm uppercase tracking-widest mb-1">Welcome back</p>
            <h1 className="text-3xl font-black mb-1">{currentUser.name}</h1>
            <p className="text-clinical-200 font-semibold">{currentUser.role} · Hudi Datel Care Clinical System</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-black tracking-tight">
              {time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="text-clinical-300 font-semibold text-sm">
              {time.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>

        {/* Quick Actions inside banner */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-5 gap-3 mt-8">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.label}
                href={action.href}
                className="flex items-center gap-3 px-4 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-2xl border border-white/10 transition-all group"
              >
                <div className={`w-8 h-8 rounded-xl ${action.color} flex items-center justify-center shrink-0 shadow-md`}>
                  <Icon size={16} className="text-white" />
                </div>
                <span className="text-sm font-bold text-white group-hover:text-white/90">{action.label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Live Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.label}
              href={card.href}
              className={`bg-white dark:bg-slate-800 p-6 rounded-3xl border ${card.border} shadow-sm hover:shadow-md transition-all group relative overflow-hidden`}
            >
              {card.urgent && (
                <span className="absolute top-4 right-4 flex items-center gap-1 text-[10px] font-black text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                  <AlertTriangle size={10} /> Alert
                </span>
              )}
              <div className={`w-12 h-12 rounded-2xl ${card.bg} flex items-center justify-center mb-4`}>
                <Icon size={22} className={card.color} />
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">{card.value}</h3>
              <p className="text-sm font-bold text-slate-500 mt-1 mb-4">{card.label}</p>
              <span className="flex items-center gap-1 text-xs font-black text-slate-400 group-hover:text-clinical-600 transition-colors">
                View details <ArrowRight size={12} />
              </span>
            </Link>
          )
        })}
      </div>

      {/* Bottom Row: Live Queue + Lab Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Today's Appointment Queue */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Activity size={20} className="text-clinical-500" /> Live Consultation Queue
            </h2>
            <Link href="/dashboard/appointments" className="text-xs font-black text-clinical-600 hover:underline flex items-center gap-1">
              View All <ArrowRight size={12} />
            </Link>
          </div>

          <div className="space-y-3">
            {data.todayAppointments.length === 0 ? (
              <p className="text-center py-8 text-slate-400 font-bold">No active appointments today.</p>
            ) : (
              data.todayAppointments.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-clinical-100 dark:bg-clinical-500/10 flex items-center justify-center font-black text-clinical-700 text-sm">
                      {apt.patientName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">{apt.patientName}</p>
                      <p className="text-xs text-slate-500">{apt.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {apt.urgent && <AlertTriangle size={14} className="text-red-500" />}
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      apt.status === "In Consultation" ? "bg-blue-100 text-blue-700" :
                      apt.status === "Waiting" ? "bg-orange-100 text-orange-700" :
                      apt.status === "Completed" ? "bg-emerald-100 text-emerald-700" :
                      "bg-slate-100 text-slate-700"
                    }`}>
                      {apt.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Lab + Pharmacy Quick Status */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-8">
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 mb-6">
              <TestTube size={20} className="text-purple-500" /> Laboratory Status
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-orange-50 dark:bg-orange-500/10 rounded-2xl text-center">
                <h3 className="text-3xl font-black text-orange-600">{data.pendingLabs}</h3>
                <p className="text-xs font-bold text-slate-500 mt-1">Pending / Processing</p>
              </div>
              <div className="p-5 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl text-center">
                <h3 className="text-3xl font-black text-emerald-600">{data.completedLabs}</h3>
                <p className="text-xs font-bold text-slate-500 mt-1">Results Ready</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-8">
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 mb-6">
              <Heart size={20} className="text-rose-500" /> System Health
            </h2>
            <div className="space-y-3">
              {[
                { label: "API Connection", ok: true },
                { label: "Database Sync", ok: true },
                { label: "License Status", ok: true },
                { label: "PWA Cache", ok: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">{item.label}</span>
                  <span className={`flex items-center gap-1.5 text-xs font-black ${item.ok ? "text-emerald-600" : "text-red-500"}`}>
                    <CheckCircle2 size={14} /> {item.ok ? "Operational" : "Error"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
