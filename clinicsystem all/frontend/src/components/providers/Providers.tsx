'use client'

import { ReactNode, useEffect } from 'react'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from './ThemeProvider'
import QueryProvider from './QueryProvider'
import { Toaster } from '@/components/ui/Toaster'
import { LicenseGate } from './LicenseGate'

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    if ('serviceWorker' in navigator && window.self === window.top) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (reg) => console.log('🚀 PWA Service Worker registered:', reg.scope),
          (err) => console.warn('❌ Service Worker registration failed:', err)
        )
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
