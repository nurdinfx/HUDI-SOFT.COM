'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Users, Calendar, DollarSign, Pill, Download } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

const COLORS = ['#2563EB','#06B6D4','#22C55E','#F59E0B','#EF4444','#8B5CF6']

export default function ReportsPage() {
  const [stats, setStats] = useState<any>(null)
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, chartRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/monthly-chart'),
        ])
        setStats(statsRes.data)

        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
        const merged: Record<string, any> = {}
        chartRes.data.appointments.forEach((a: any) => {
          const key = `${months[parseInt(a.month)-1]}`
          merged[key] = { ...merged[key], name: key, appointments: parseInt(a.count) }
        })
        chartRes.data.revenue.forEach((r: any) => {
          const key = `${months[parseInt(r.month)-1]}`
          merged[key] = { ...merged[key], name: key, revenue: parseFloat(r.revenue) }
        })
        setChartData(Object.values(merged))
      } catch {} finally { setLoading(false) }
    }
    load()
  }, [])

  const pieData = stats ? [
    { name: 'Monthly Revenue', value: stats.monthlyRevenue },
    { name: 'Pharmacy Sales', value: stats.pharmacySalesThisMonth },
  ] : []

  const kpiItems = stats ? [
    { label: 'Total Patients', value: stats.totalPatients, icon: Users, color: 'text-primary' },
    { label: 'New This Month', value: stats.newPatientsThisMonth, icon: Users, color: 'text-teal-500' },
    { label: 'Today Appointments', value: stats.todayAppointments, icon: Calendar, color: 'text-blue-500' },
    { label: 'Completed Today', value: stats.completedTodayAppointments, icon: Calendar, color: 'text-green-500' },
    { label: 'Monthly Revenue', value: formatCurrency(stats.monthlyRevenue), icon: DollarSign, color: 'text-emerald-500' },
    { label: 'Daily Revenue', value: formatCurrency(stats.dailyRevenue), icon: DollarSign, color: 'text-green-500' },
    { label: 'Unpaid Invoices', value: stats.unpaidInvoices, icon: DollarSign, color: 'text-red-500' },
    { label: 'Low Stock Items', value: stats.lowStockMedications, icon: Pill, color: 'text-orange-500' },
    { label: 'Pending Lab Tests', value: stats.pendingLabRequests, icon: BarChart3, color: 'text-purple-500' },
    { label: 'Pharmacy Sales', value: formatCurrency(stats.pharmacySalesThisMonth), icon: Pill, color: 'text-blue-500' },
  ] : []

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Comprehensive clinic performance insights</p>
        </div>
        <button className="btn-secondary">
          <Download className="w-4 h-4" /> Export Report
        </button>
      </div>

      {/* KPI summary grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {kpiItems.map((item, i) => (
            <motion.div key={item.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="glass-card p-4 text-center">
              <item.icon className={`w-6 h-6 mx-auto mb-2 ${item.color}`} />
              <p className={`text-xl font-extrabold ${item.color}`}>{item.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{item.label}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Appointments trend */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="glass-card p-6 xl:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Appointment & Revenue Trend</h3>
              <p className="text-xs text-slate-500">Last 6 months</p>
            </div>
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gAppts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                itemStyle={{ color: '#e2e8f0' }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area yAxisId="left" type="monotone" dataKey="appointments" stroke="#2563EB" strokeWidth={2} fill="url(#gAppts)" name="Appointments" />
              <Area yAxisId="right" type="monotone" dataKey="revenue" stroke="#22C55E" strokeWidth={2} fill="url(#gRev)" name="Revenue ($)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Revenue breakdown pie */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="glass-card p-6">
          <div className="mb-5">
            <h3 className="font-bold text-slate-900 dark:text-white">Revenue Breakdown</h3>
            <p className="text-xs text-slate-500">This month</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                paddingAngle={4} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                formatter={(val: number) => [formatCurrency(val)]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Revenue bar chart */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="glass-card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Monthly Revenue (USD)</h3>
            <p className="text-xs text-slate-500">Last 6 months</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} barSize={32}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
              formatter={(val: number) => [formatCurrency(val), 'Revenue']}
            />
            <Bar dataKey="revenue" fill="#2563EB" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  )
}
