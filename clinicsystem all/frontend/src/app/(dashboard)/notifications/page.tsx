'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, BellOff, CheckCheck, Clock, AlertCircle, Info, CheckCircle2 } from 'lucide-react'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/notifications')
      setNotifications(data)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const markRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`)
      setNotifications(n => n.map(x => x.id === id ? { ...x, is_read: true } : x))
    } catch {}
  }

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all')
      setNotifications(n => n.map(x => ({ ...x, is_read: true })))
    } catch {}
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  const typeIcon: Record<string, any> = {
    appointment: <Clock className="w-4 h-4 text-blue-500" />,
    invoice: <AlertCircle className="w-4 h-4 text-yellow-500" />,
    lab: <Info className="w-4 h-4 text-purple-500" />,
    default: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-secondary text-sm">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="glass-card py-16 text-center text-slate-400">
          <BellOff className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No notifications yet</p>
          <p className="text-sm mt-1">You'll see alerts for appointments, lab results, and more here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => !n.is_read && markRead(n.id)}
              className={`glass-card p-4 flex items-start gap-4 cursor-pointer transition-all hover:shadow-glass ${!n.is_read ? 'border-l-4 border-primary' : 'opacity-70'}`}
            >
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                {typeIcon[n.type] || typeIcon.default}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${n.is_read ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                  {n.title}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
              </div>
              <div className="text-right shrink-0 space-y-1">
                <p className="text-xs text-slate-400">{formatDate(n.created_at, 'time')}</p>
                <p className="text-xs text-slate-400">{formatDate(n.created_at)}</p>
                {!n.is_read && (
                  <span className="w-2 h-2 bg-primary rounded-full block ml-auto" />
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
