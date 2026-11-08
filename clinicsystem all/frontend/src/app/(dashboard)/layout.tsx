'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import SubscriptionBanner from '@/components/ui/SubscriptionBanner'
import SuspendedLockScreen from '@/components/ui/SuspendedLockScreen'
import Spinner from '@/components/ui/Spinner'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading } = useAuth()
  const router = useRouter()
  const [isSuspended, setIsSuspended] = useState(false)

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push('/login')
  }, [isAuthenticated, loading, router])

  useEffect(() => {
    if (user?.subscriptionStatus === 'Suspended') {
      setIsSuspended(true)
    }

    const onSuspended = () => setIsSuspended(true)
    window.addEventListener('dcs_subscription_suspended', onSuspended)
    return () => window.removeEventListener('dcs_subscription_suspended', onSuspended)
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light dark:bg-dark">
        <Spinner size="lg" label="Loading Datel Clinic System…" />
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="flex h-screen overflow-hidden bg-light dark:bg-dark relative">
      {isSuspended && <SuspendedLockScreen />}
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        <TopBar />
        <SubscriptionBanner />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
