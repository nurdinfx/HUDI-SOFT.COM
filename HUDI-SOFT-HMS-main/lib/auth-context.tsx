"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import { authApi, setToken, clearToken, type User, type UserRole } from "./api"
import { HmsApiError } from "./hms-http"

const USER_CACHE_KEY = "hms_user"

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

function readCachedUser(): User | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY)
    if (!raw) return null
    const user = JSON.parse(raw) as User
    return user?.email && user?.role ? user : null
  } catch {
    return null
  }
}

function writeCachedUser(user: User | null) {
  if (typeof window === "undefined") return
  if (user) {
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(USER_CACHE_KEY)
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => {
    if (typeof window === "undefined") {
      return { user: null, isAuthenticated: false, isLoading: true }
    }
    const hasToken = Boolean(localStorage.getItem("hms_token"))
    const cached = readCachedUser()
    if (hasToken && cached) {
      return { user: cached, isAuthenticated: true, isLoading: false }
    }
    if (!hasToken) {
      return { user: null, isAuthenticated: false, isLoading: false }
    }
    return { user: null, isAuthenticated: false, isLoading: true }
  })

  const isValidUser = (user: User | null | undefined): user is User =>
    Boolean(user?.email && user?.role)

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("hms_token") : null
    if (!token) {
      setAuth({ user: null, isAuthenticated: false, isLoading: false })
      return
    }

    const cached = readCachedUser()
    if (cached) {
      setAuth({ user: cached, isAuthenticated: true, isLoading: false })
    }

    let cancelled = false
    authApi.me()
      .then((user) => {
        if (cancelled) return
        if (!isValidUser(user as User)) return
        writeCachedUser(user as User)
        setAuth({ user: user as User, isAuthenticated: true, isLoading: false })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof HmsApiError && err.status === 401) {
          clearToken()
          writeCachedUser(null)
          setAuth({ user: null, isAuthenticated: false, isLoading: false })
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { token, user } = await authApi.login(email, password)
    setToken(token)
    writeCachedUser(user as unknown as User)
    setAuth({ user: user as unknown as User, isAuthenticated: true, isLoading: false })
  }, [])

  const logout = useCallback(() => {
    clearToken()
    writeCachedUser(null)
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
