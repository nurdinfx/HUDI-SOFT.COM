'use client'

import { Bell, Search, Menu } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { getInitials } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function TopBar() {
  const { user } = useAuth()
  const router = useRouter()
  const [searchValue, setSearchValue] = useState('')

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchValue.trim()) {
      router.push(`/patients?search=${encodeURIComponent(searchValue.trim())}`)
      setSearchValue('')
    }
  }

  return (
    <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 px-6 py-3.5 flex items-center justify-between gap-4">
      {/* Search */}
      <div className="flex items-center gap-3 flex-1">
        <div className="relative max-w-sm w-full hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="Search patients… (press Enter)"
            className="dcs-input pl-9 py-2 text-xs"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Subscription warning */}
        {user?.daysRemaining !== undefined && user.daysRemaining <= 7 && user.daysRemaining > 0 && (
          <span className="badge-yellow hidden sm:inline-flex">
            ⚡ {user.daysRemaining}d left
          </span>
        )}

        {/* Notifications bell */}
        <button
          onClick={() => router.push('/notifications')}
          className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5 text-slate-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
        </button>

        {/* User info */}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => router.push('/settings?tab=account')}>
          <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
            {user ? getInitials(user.fullName) : '?'}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{user?.fullName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 capitalize leading-tight">
              {user?.role?.replace('_', ' ')} · {user?.clinicName}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
