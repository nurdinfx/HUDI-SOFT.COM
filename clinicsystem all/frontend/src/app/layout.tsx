import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/providers/Providers'

export const metadata: Metadata = {
  title: 'Datel Clinic System',
  description: 'Premium SaaS Clinic Management Platform — by HUDI SOFT',
  manifest: '/manifest.json',
  icons: { icon: '/favicon.ico' },
}

export const viewport = {
  themeColor: '#2563eb',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-light dark:bg-dark">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
