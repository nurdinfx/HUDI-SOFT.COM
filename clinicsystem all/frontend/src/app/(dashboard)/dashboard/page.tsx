'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users, Calendar, DollarSign, FileWarning, FlaskConical, Pill,
  TrendingUp, Clock, ArrowRight, Activity,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from 'recharts'
import api from '@/lib/api'
import { DashboardStats, Appointment } from '@/types'
import KPICard from '@/components/dashboard/KPICard'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentAppts, setRecentAppts] = useState<Appointment[]>([])
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [s, ra, mc] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/recent-appointments'),
          api.get('/dashboard/monthly-chart'),
        ])
        setStats(s.data)
        setRecentAppts(ra.data)

        // Merge appointment + revenue data for chart
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
        const merged: Record<string, any> = {}
        mc.data.appointments.forEach((a: any) => {
          const key = `${months[parseInt(a.month)-1]} ${a.year}`
          merged[key] = { ...merged[key], name: key, appointments: parseInt(a.count) }
        })
        mc.data.revenue.forEach((r: any) => {
          const key = `${months[parseInt(r.month)-1]} ${r.year}`
          merged[key] = { ...merged[key], name: key, revenue: parseFloat(r.revenue) }
        })
        setChartData(Object.values(merged))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Welcome */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Good morning, {user?.fullName?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {formatDate(new Date(), 'long')} · {user?.clinicName}
          </p>
        </div>
        {user?.daysRemaining !== undefined && user.daysRemaining <= 30 && (
          <div className={`px-4 py-2 rounded-xl text-sm font-semibold ${user.daysRemaining <= 7 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
            Subscription: {user.daysRemaining} days left
          </div>
        )}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Patients" value={stats?.totalPatients ?? 0} subtitle={`+${stats?.newPatientsThisMonth ?? 0} this month`} icon={Users} gradient="gradient-primary" delay={0} />
        <KPICard title="Today's Appointments" value={stats?.todayAppointments ?? 0} subtitle={`${stats?.completedTodayAppointments ?? 0} completed`} icon={Calendar} gradient="gradient-teal" delay={0.05} />
        <KPICard title="Monthly Revenue" value={formatCurrency(stats?.monthlyRevenue ?? 0)} subtitle={`Today: ${formatCurrency(stats?.dailyRevenue ?? 0)}`} icon={DollarSign} gradient="gradient-success" delay={0.1} />
        <KPICard title="Unpaid Invoices" value={stats?.unpaidInvoices ?? 0} subtitle="Pending payment" icon={FileWarning} gradient="gradient-warning" delay={0.15} />
        <KPICard title="Pending Lab Tests" value={stats?.pendingLabRequests ?? 0} subtitle="Awaiting results" icon={FlaskConical} gradient="gradient-purple" delay={0.2} />
        <KPICard title="Low Stock" value={stats?.lowStockMedications ?? 0} subtitle="Medications to reorder" icon={Pill} gradient="gradient-danger" delay={0.25} />
        <KPICard title="Pharmacy Sales" value={formatCurrency(stats?.pharmacySalesThisMonth ?? 0)} subtitle="This month" icon={TrendingUp} gradient="gradient-primary" delay={0.3} />
        <KPICard title="Active Appointments" value={(stats?.todayAppointments ?? 0) - (stats?.completedTodayAppointments ?? 0)} subtitle="In queue today" icon={Activity} gradient="gradient-teal" delay={0.35} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Area chart — Appointments trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Appointments Trend</h3>
              <p className="text-xs text-slate-500">Last 6 months</p>
            </div>
            <span className="badge-blue">Monthly</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorAppts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                itemStyle={{ color: '#e2e8f0' }}
              />
              <Area type="monotone" dataKey="appointments" stroke="#2563EB" strokeWidth={2} fill="url(#colorAppts)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Bar chart — Revenue */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Revenue Overview</h3>
              <p className="text-xs text-slate-500">Last 6 months</p>
            </div>
            <span className="badge-green">Revenue</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                itemStyle={{ color: '#e2e8f0' }}
                formatter={(val: number) => [formatCurrency(val), 'Revenue']}
              />
              <Bar dataKey="revenue" fill="#22C55E" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Recent Appointments */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-card p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-slate-900 dark:text-white">Upcoming Appointments</h3>
          <a href="/appointments" className="text-primary text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">
            View all <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {recentAppts.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No upcoming appointments</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentAppts.slice(0, 6).map((appt, i) => (
              <motion.div
                key={appt.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.05 }}
                className="flex items-center gap-4 p-3.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {(appt.patientName || 'P').charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{appt.patientName}</p>
                  <p className="text-xs text-slate-500 truncate">{appt.doctorName} · {appt.type}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 text-xs text-slate-500 justify-end">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{appt.timeSlot}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDate(appt.appointmentDate)}</p>
                </div>
                <span className={getStatusColor(appt.status)}>{appt.status}</span>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
