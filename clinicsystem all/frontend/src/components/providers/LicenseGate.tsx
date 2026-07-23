'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export function LicenseGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkLicense = () => {
      const licenseKey = localStorage.getItem('hudi_license_key')
      
      // If no license key and we are not already on the activation page
      if (!licenseKey && !pathname.includes('/activation')) {
        console.log('🔒 No license key found, redirecting to activation')
        router.push('/activation')
      } else {
        setIsChecking(false)
      }
    }

    checkLicense()
  }, [pathname, router])

  if (isChecking && !pathname.includes('/activation')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-slate-400 font-medium text-sm animate-pulse">Checking system license...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
