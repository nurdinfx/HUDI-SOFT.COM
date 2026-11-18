'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'

export default function SubscriptionBanner() {
  const { user } = useAuth()
  const [dismissed, setDismissed] = useState(false)

  if (!user || dismissed) return null
  if ((user.daysRemaining ?? 99) > 7) return null

  const isExpired = user.subscriptionStatus === 'Expired'
  const isSuspended = user.subscriptionStatus === 'Suspended'
  const isCritical = (user.daysRemaining ?? 0) <= 3

  if (!isExpired && !isSuspended && !isCritical) return null

  const bgClass = isExpired || isSuspended
    ? 'bg-red-500/10 border-red-500/30 text-red-400'
    : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'

  const message = isExpired
    ? 'Your subscription has expired. Please renew to continue.'
    : isSuspended
    ? 'Your clinic subscription is suspended. Contact support.'
    : `⚠ Only ${user.daysRemaining} day(s) remaining on your subscription.`

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className={`mx-6 mt-4 px-4 py-3 rounded-xl border flex items-center gap-3 ${bgClass}`}
      >
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <p className="text-sm flex-1">{message}</p>
        <a
          href="https://hudisoft.online"
          target="_blank"
          rel="noreferrer"
          className="text-xs font-semibold underline flex items-center gap-1 hover:opacity-80"
        >
          Renew Now <ExternalLink className="w-3 h-3" />
        </a>
        <button
          onClick={() => setDismissed(true)}
          className="p-0.5 opacity-60 hover:opacity-100 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
