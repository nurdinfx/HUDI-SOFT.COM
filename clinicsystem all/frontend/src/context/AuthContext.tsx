'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { User } from '@/types'
import api from '@/lib/api'

// ── Read session synchronously so first render already has the user ─────────
function readSession(): User | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('dcs_session')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.token ? parsed : null
  } catch {
    return null
  }
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  hasRole: (...roles: string[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialise from localStorage synchronously — no async useEffect needed
  const [user, setUser] = useState<User | null>(readSession)
  const [loading, setLoading] = useState(false)

  const login = async (email: string, password: string) => {
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      localStorage.setItem('dcs_session', JSON.stringify(data))
      setUser(data)
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('dcs_session')
    window.location.href = '/login'
  }

  const hasRole = (...roles: string[]) => !!user && roles.includes(user.role)

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
