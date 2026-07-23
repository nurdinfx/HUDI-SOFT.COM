"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { useAuth } from "@/lib/auth-context"
import { Loader2 } from "lucide-react"
import { RouteGuard } from "@/components/with-role-guard"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, isLoading, user } = useAuth()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      // Only redirect to login if there's no cached user at all
      const cachedUser = typeof window !== 'undefined' ? localStorage.getItem('hms_user') : null
      const cachedToken = typeof window !== 'undefined' ? localStorage.getItem('hms_token') : null
      if (!cachedUser || !cachedToken) {
        const redirect = `/login?redirect=${encodeURIComponent(pathname || "/dashboard")}`
        router.replace(redirect)
      }
      return
    }
  }, [isAuthenticated, isLoading, router, pathname, user?.role])

  // Show spinner only when truly loading (no cached data)
  const hasCachedSession = typeof window !== 'undefined' && 
    !!localStorage.getItem('hms_token') && 
    !!localStorage.getItem('hms_user')

  if ((isLoading && !hasCachedSession) || (!isAuthenticated && !hasCachedSession)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <RouteGuard>
            {children}
          </RouteGuard>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
