'use client'

import { createContext, useContext, useState, ReactNode, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
}

interface ToastContextType {
  toast: (opts: { type?: ToastType; title: string; message?: string }) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const toast = useCallback(({ type = 'info', title, message }: { type?: ToastType; title: string; message?: string }) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { id, type, title, message }])
    setTimeout(() => dismiss(id), 4000)
  }, [dismiss])

  const icons: Record<ToastType, JSX.Element> = {
    success: <CheckCircle2 className="w-5 h-5 text-success" />,
    error:   <AlertCircle  className="w-5 h-5 text-danger" />,
    warning: <AlertCircle  className="w-5 h-5 text-warning" />,
    info:    <Info         className="w-5 h-5 text-primary" />,
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      <div className="fixed bottom-6 right-6 z-50 space-y-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="pointer-events-auto glass-card p-4 flex items-start gap-3 min-w-72 max-w-sm shadow-glass-lg"
            >
              {icons[t.type]}
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{t.title}</p>
                {t.message && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.message}</p>}
              </div>
              <button onClick={() => dismiss(t.id)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within Toaster')
  return ctx
}
