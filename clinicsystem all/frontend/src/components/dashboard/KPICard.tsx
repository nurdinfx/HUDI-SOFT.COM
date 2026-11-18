'use client'

import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  gradient: string
  change?: { value: number; label: string }
  delay?: number
}

export default function KPICard({ title, value, subtitle, icon: Icon, gradient, change, delay = 0 }: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 200, damping: 20 }}
      className="kpi-card"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <motion.p
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: delay + 0.1, type: 'spring' }}
            className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight"
          >
            {value}
          </motion.p>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
          {change && (
            <div className={cn('flex items-center gap-1 text-xs font-semibold',
              change.value >= 0 ? 'text-success' : 'text-danger')}>
              <span>{change.value >= 0 ? '↑' : '↓'} {Math.abs(change.value)}%</span>
              <span className="text-slate-400 font-normal">{change.label}</span>
            </div>
          )}
        </div>
        <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shrink-0', gradient)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </motion.div>
  )
}
