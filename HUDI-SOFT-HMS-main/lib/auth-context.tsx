"use client"

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react"
import { authApi, setToken, clearToken, licenseApi, setTenantId, type User, type UserRole } from "./api"

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

function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false
  const isNative = !!(window as any).Capacitor?.isNativePlatform?.()
  const isLocalOrigin = window.location.origin === 'http://localhost' || 
                        window.location.origin.startsWith('capacitor://') || 
                        window.location.origin.startsWith('ionic://')
  return isNative || isLocalOrigin
}

function getStoredActivation() {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem("hms_activation_info")
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  })

  // Track whether login() has already succeeded — prevents mount-time me() from overwriting it
  const loginSucceededRef = useRef(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const path = window.location.pathname
    if (path === "/activate") {
      setAuth({ user: null, isAuthenticated: false, isLoading: false })
      return
    }

    const isCapacitor = isCapacitorNative()

    // Restore session immediately from cache if possible
    const restoreCachedSession = () => {
      const token = localStorage.getItem("hms_token")
      const cachedUserRaw = localStorage.getItem("hms_user")

      if (token && cachedUserRaw) {
        try {
          const cachedUser = JSON.parse(cachedUserRaw)
          // 1. Instant auth restore from cache
          setAuth({ user: cachedUser as unknown as User, isAuthenticated: true, isLoading: false })

          // 2. Revalidate in background - only logout on explicit 401, not network errors
          authApi.me().then((freshUser) => {
            localStorage.setItem('hms_user', JSON.stringify(freshUser))
            setAuth({ user: freshUser as unknown as User, isAuthenticated: true, isLoading: false })
          }).catch((err) => {
            const is401 = err?.message?.includes('401') || 
                          err?.message?.toLowerCase().includes('unauthorized') ||
                          err?.message?.toLowerCase().includes('invalid token') ||
                          err?.message?.toLowerCase().includes('no token')
            if (is401 && !loginSucceededRef.current) {
              clearToken()
              localStorage.removeItem('hms_user')
              setAuth({ user: null, isAuthenticated: false, isLoading: false })
            }
          })
          return true
        } catch (e) {
          // Corrupted cache - fall through
        }
      }
      return false
    }

    // Clean session verification when cache is empty
    const fetchSessionFromServer = () => {
      const token = localStorage.getItem("hms_token")
      if (token) {
        authApi.me()
          .then((user) => {
            localStorage.setItem('hms_user', JSON.stringify(user))
            setAuth({ user: user as unknown as User, isAuthenticated: true, isLoading: false })
          })
          .catch((err) => {
            const is401 = err?.message?.includes('401') || 
                          err?.message?.toLowerCase().includes('unauthorized') ||
                          err?.message?.toLowerCase().includes('invalid token') ||
                          err?.message?.toLowerCase().includes('no token')
            if (is401) {
              clearToken()
              localStorage.removeItem('hms_user')
              setAuth({ user: null, isAuthenticated: false, isLoading: false })
            } else {
              // Network error with no cache - still loaded but unauthenticated
              setAuth({ user: null, isAuthenticated: false, isLoading: false })
            }
          })
      } else {
        setAuth({ user: null, isAuthenticated: false, isLoading: false })
      }
    }

    if (isCapacitor) {
      const activation = getStoredActivation()
      if (!activation) {
        window.location.href = "/activate"
        return
      }
      if (activation.tenantId) setTenantId(activation.tenantId)

      // Non-blocking license revalidation
      licenseApi.status(false).then((res) => {
        if (res.tenantId) setTenantId(res.tenantId)
      }).catch(() => {})

      // Restore session from cache or verify online
      const restored = restoreCachedSession()
      if (!restored) {
        fetchSessionFromServer()
      }

    } else {
      // Web/PWA
      licenseApi.status(false)
        .then((res) => {
          if (!res.isLicensed) {
            clearToken()
            localStorage.removeItem('hms_user')
            window.location.href = "/activate"
            return
          }
          if (res.tenantId) setTenantId(res.tenantId)
          
          const restored = restoreCachedSession()
          if (!restored) {
            fetchSessionFromServer()
          }
        })
        .catch(() => {
          // License server status call failed (e.g. offline/network error)
          // Try to restore session from cache first
          const restored = restoreCachedSession()
          if (!restored) {
            fetchSessionFromServer()
          }
        })
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    if (!isCapacitorNative()) {
      try {
        const licStatus = await licenseApi.status(true)
        if (!licStatus.isLicensed) {
          throw new Error(licStatus.message || "System has no active license. Please activate to proceed.")
        }
        if (licStatus.tenantId) setTenantId(licStatus.tenantId)
      } catch (licErr: any) {
        if (licErr.message?.includes("active license")) throw licErr
      }
    } else {
      const activation = getStoredActivation()
      if (!activation) {
        window.location.href = "/activate"
        throw new Error("Please activate the app before logging in.")
      }
      if (activation.tenantId) setTenantId(activation.tenantId)
    }

    const { token, user } = await authApi.login(email, password)
    setToken(token)
    // Store user in localStorage so mount-time me() is skipped
    localStorage.setItem('hms_user', JSON.stringify(user))
    // Mark login as succeeded BEFORE setting auth — prevents race with mount me()
    loginSucceededRef.current = true
    setAuth({ user: user as unknown as User, isAuthenticated: true, isLoading: false })
  }, [])

  const logout = useCallback(() => {
    loginSucceededRef.current = false
    clearToken()
    localStorage.removeItem('hms_user')
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
