"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { useAuth } from "@/lib/auth-context"
import { RouteGuard } from "@/components/with-role-guard"
import { goToLoginPage } from "@/lib/capacitor-nav"
import { isNativeCapacitor } from "@/lib/capacitor-platform"

function hasStoredToken(): boolean {
  return typeof window !== "undefined" && Boolean(localStorage.getItem("hms_token"))
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, isLoading } = useAuth()
  const tokenPresent = hasStoredToken()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated && !tokenPresent) {
      const redirect = `/login?redirect=${encodeURIComponent(pathname || "/dashboard")}`
      if (isNativeCapacitor()) {
        goToLoginPage()
      } else {
        router.replace(redirect)
      }
    }
  }, [isAuthenticated, isLoading, tokenPresent, router, pathname])

  if (!tokenPresent && !isAuthenticated && !isLoading) {
    return null
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
