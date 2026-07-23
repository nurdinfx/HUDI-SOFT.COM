'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Loader2, Heart } from 'lucide-react'

export default function RootPage() {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      router.replace(isAuthenticated ? '/dashboard' : '/login')
    }
  }, [isAuthenticated, loading, router])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <div className="w-16 h-16 rounded-3xl gradient-primary flex items-center justify-center shadow-glow-blue mb-6">
        <Heart className="w-8 h-8 text-white" />
      </div>
      <Loader2 className="w-8 h-8 animate-spin text-blue-400 mb-3" />
      <p className="text-slate-400 text-sm">Loading Datel Clinic System…</p>
    </div>
  )
}
