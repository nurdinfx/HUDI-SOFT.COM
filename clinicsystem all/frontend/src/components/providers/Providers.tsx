'use client'

import { ReactNode, useEffect } from 'react'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from './ThemeProvider'
import QueryProvider from './QueryProvider'
import { Toaster } from '@/components/ui/Toaster'
import { LicenseGate } from './LicenseGate'

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Unregister legacy Service Worker to avoid PWA fetch redirect crash (ERR_FAILED)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister()
        }
      })
    }
  }, [])
  return (
    <LicenseGate>
      <QueryProvider>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </QueryProvider>
    </LicenseGate>
  )
}
