import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/providers/Providers'

export const metadata: Metadata = {
  title: 'HUDI DENTAL CARE — Enterprise Practice SaaS',
  description: 'Enterprise Dental Practice Management Platform — Digital Odontogram, Dental Imaging, Lab Tracking, Multi-Branch & AI Assistant',
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
