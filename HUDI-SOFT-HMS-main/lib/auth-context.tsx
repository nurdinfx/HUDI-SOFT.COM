"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import { authApi, setToken, clearToken, type User, type UserRole } from "./api"

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  hasRole: (roles: UserRole[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => {
    if (typeof window === "undefined") {
      return { user: null, isAuthenticated: false, isLoading: true }
    }
    const hasToken = Boolean(localStorage.getItem("hms_token"))
    if (!hasToken) {
      return { user: null, isAuthenticated: false, isLoading: false }
    }
    try {
      const cached = sessionStorage.getItem("hms_user")
      if (cached) {
        const user = JSON.parse(cached) as User
        if (user?.email && user?.role) {
          return { user, isAuthenticated: true, isLoading: false }
        }
      }
    } catch {
      // ignore bad cache
    }
    return { user: null, isAuthenticated: false, isLoading: true }
  })

  const isValidUser = (user: User | null | undefined): user is User =>
    Boolean(user?.email && user?.role)

  // On mount, re-validate stored token (with timeout so APK never hangs on white screen)
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("hms_token") : null
    if (!token) {
      setAuth({ user: null, isAuthenticated: false, isLoading: false })
      return
    }

    let cancelled = false
    const timer = setTimeout(() => {
      if (cancelled) return
      clearToken()
      setAuth({ user: null, isAuthenticated: false, isLoading: false })
    }, 12000)

    authApi.me()
      .then((user) => {
        if (cancelled) return
        clearTimeout(timer)
        if (!isValidUser(user as User)) {
          clearToken()
          setAuth({ user: null, isAuthenticated: false, isLoading: false })
          return
        }
        if (typeof window !== "undefined") {
          sessionStorage.setItem("hms_user", JSON.stringify(user))
        }
        setAuth({ user: user as User, isAuthenticated: true, isLoading: false })
      })
      .catch(() => {
        if (cancelled) return
        clearTimeout(timer)
        clearToken()
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("hms_user")
        }
        setAuth({ user: null, isAuthenticated: false, isLoading: false })
      })

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { token, user } = await authApi.login(email, password)
    setToken(token)
    if (typeof window !== "undefined") {
      sessionStorage.setItem("hms_user", JSON.stringify(user))
    }
    setAuth({ user: user as unknown as User, isAuthenticated: true, isLoading: false })
  }, [])

  const logout = useCallback(() => {
    clearToken()
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("hms_user")
    }
    setAuth({ user: null, isAuthenticated: false, isLoading: false })
  }, [])

  const hasRole = useCallback(
    (roles: UserRole[]) => {
      if (!auth.user) return false
      return roles.includes(auth.user.role)
    },
    [auth.user]
  )

  return (
    <AuthContext.Provider value={{ ...auth, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
