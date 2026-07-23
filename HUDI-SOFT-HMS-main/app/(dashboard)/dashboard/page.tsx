"use client"

import { useState, useEffect, useCallback } from "react"
import { dashboardApi, accountsApi } from "@/lib/api"
import { DashboardContent } from "@/components/dashboard/dashboard-content"
import { AccountantDashboard } from "@/components/dashboard/accountant-dashboard"
import { useAuth } from "@/lib/auth-context"
import LicenseWidget from "@/components/dashboard/license-widget"
import { RefreshCw, WifiOff } from "lucide-react"

export default function DashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState<any>(null)
  const [accSummary, setAccSummary] = useState<any>(null)
  const [cashFlow, setCashFlow] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      if (user?.role === 'accountant') {
        const [summary, flow] = await Promise.all([
          accountsApi.getSummary(),
          accountsApi.getCashFlow()
        ])
        setAccSummary(summary)
        setCashFlow(flow)
      } else {
        const dashData = await dashboardApi.getStats()
        setData(dashData)
      }
    } catch (e: any) {
      console.error("Failed to load dashboard:", e)
      setError(e?.message || "Failed to connect to server")
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) load()
  }, [user, load])

  if (loading) {
    return (
      <div className="space-y-6">
        <LicenseWidget />
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <RefreshCw className="size-7 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading dashboard data…</p>
        </div>
      </div>
    )
  }

  const hasNoData = (user?.role === 'accountant' && !accSummary) || (user?.role !== 'accountant' && !data)

  if (hasNoData || error) {
    return (
      <div className="space-y-6">
        <LicenseWidget />
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <WifiOff className="size-10 text-muted-foreground/50" />
          <div className="text-center">
            <p className="text-base font-semibold text-foreground">Failed to load dashboard data</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              {error?.includes('timed out') || error?.includes('connect')
                ? 'The server is starting up. Please wait a moment and try again.'
                : error || 'Could not reach the server. Check your connection.'}
            </p>
          </div>
          <button
            onClick={() => { setRetryCount(c => c + 1); load() }}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition active:scale-95"
          >
            <RefreshCw className="size-4" />
            Retry
          </button>
          {retryCount > 1 && (
            <p className="text-xs text-muted-foreground">
              Tip: The server may be waking up (30–60 sec on first load)
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <LicenseWidget />
      {user?.role === 'accountant' ? (
        <AccountantDashboard summary={accSummary} cashFlow={cashFlow} />
      ) : (
        <DashboardContent />
      )}
    </div>
  )
}
