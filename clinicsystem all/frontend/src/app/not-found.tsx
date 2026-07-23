'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Heart, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  const router = useRouter()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="w-16 h-16 rounded-3xl gradient-primary flex items-center justify-center shadow-glow-blue mx-auto mb-6">
          <Heart className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-7xl font-extrabold text-white mb-3">404</h1>
        <p className="text-xl text-slate-400 mb-2">Page Not Found</p>
        <p className="text-slate-500 text-sm mb-8 max-w-xs">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="btn-primary mx-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
      </motion.div>
    </div>
  )
}
