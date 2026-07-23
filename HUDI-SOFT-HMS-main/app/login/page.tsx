"use client"

import { useState, Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { getBaseUrl } from "@/lib/api"

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, isAuthenticated, isLoading } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [connOk, setConnOk] = useState(false)

  const [showPassword, setShowPassword] = useState(false)
  const redirectTo = searchParams.get("redirect") || "/dashboard"

  useEffect(() => {
    // Redirect to activate if not activated on native
    const isCapacitor = !!(window as any).Capacitor?.isNativePlatform?.()
    if (isCapacitor && !localStorage.getItem("hms_activation_info")) {
      router.replace("/activate")
      return
    }
    if (isAuthenticated) {
      router.replace(redirectTo)
      return
    }

    // Pre-fill email from stored activation info
    try {
      const raw = localStorage.getItem("hms_activation_info")
      if (raw) {
        const activation = JSON.parse(raw)
        if (activation?.adminEmail) {
          setEmail(activation.adminEmail)
        } else {
          setEmail("admin@hospital.com")
        }
      }
    } catch { /* ignore */ }

    // Ping server to check connectivity — keep pinging until connected
    const check = () => {
      fetch(`${getBaseUrl()}/health`, {
        signal: AbortSignal.timeout(15000),
      })
        .then((r) => { if (r.ok) setConnOk(true); else setTimeout(check, 5000) })
        .catch(() => setTimeout(check, 5000))
    }
    check()
    // Also keep pinging every 30s to prevent server sleeping again
    const keepAlive = setInterval(() => {
      fetch(`${getBaseUrl()}/health`).catch(() => {})
    }, 30000)
    return () => clearInterval(keepAlive)
  }, [isAuthenticated, router, redirectTo])

  if (isAuthenticated) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) {
      toast.error("Please enter email and password")
      return
    }
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      toast.success("Welcome back!")
      // In Capacitor static export, use window.location.href instead of router.replace
      // router.replace remounts components before auth state propagates → redirect loop
      // window.location.href forces full reload → AuthProvider restores session from localStorage
      const isCapacitor = !!(window as any).Capacitor?.isNativePlatform?.()
      if (isCapacitor) {
        // Go to root — app/page.tsx will check token and redirect to dashboard
        window.location.href = "/"
      } else {
        router.replace(redirectTo)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed"
      if (msg.toLowerCase().includes("fetch") || msg.toLowerCase().includes("connect")) {
        toast.error("Cannot reach server. Please check your internet and try again.")
      } else {
        toast.error(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="size-8 animate-spin text-white" />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/login-bg.png')" }}
      />
      <div className="absolute inset-0 z-10 bg-black/30" />

      <div className="relative z-20 w-full max-w-5xl px-4 flex flex-col md:flex-row items-center justify-center gap-8 lg:gap-24">

        {/* Fingerprint side */}
        <div className="hidden md:flex flex-col items-center justify-center text-white/90 space-y-4">
          <div className="relative p-6 border-2 border-dashed border-white/30 rounded-2xl">
            <svg viewBox="0 0 24 24" className="w-24 h-24 stroke-current fill-none" strokeWidth="1.5">
              <path d="M12 11c0-1.105-.895-2-2-2m-3 3c0-2.761 2.239-5 5-5s5 2.239 5 5m-1 3c0-2.209-1.791-4-4-4s-4 1.791-4 4m6 0a2 2 0 11-4 0" strokeLinecap="round" />
              <path d="M15 17c0-1.657-1.343-3-3-3s-3 1.343-3 3m9-2c0-3.314-2.686-6-6-6s-6 2.686-6 6M6 16c0-4.418 3.582-8 8-8s8 3.582 8 8" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <div className="hidden md:block h-72 w-[1px] bg-gradient-to-b from-transparent via-white/20 to-transparent" />

        {/* Login card */}
        <div className="glass-card w-full max-w-[420px] rounded-[32px] p-8 flex flex-col items-center shadow-2xl relative mt-16 md:mt-0">

          <div className="absolute -top-12 left-1/2 -translate-x-1/2 p-1 bg-white/10 rounded-full backdrop-blur-md border border-white/20 shadow-xl overflow-hidden">
            <div className="bg-[#1e3c72]/60 p-4 rounded-full">
              <svg viewBox="0 0 24 24" className="w-10 h-10 fill-white">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
          </div>

          <h1 className="text-white text-3xl font-light tracking-tight mt-8 mb-8">User Login</h1>

          <form onSubmit={handleSubmit} className="w-full space-y-6">
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-white transition-colors">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 glass-input pl-12 pr-4 rounded-xl outline-none focus:ring-2 focus:ring-white/30 transition-all text-sm font-light"
                required
                autoComplete="email"
              />
            </div>

            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-white transition-colors">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                </svg>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 glass-input pl-12 pr-12 rounded-xl outline-none focus:ring-2 focus:ring-white/30 transition-all text-sm font-light"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors focus:outline-none"
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-white/60 px-1">
              <label className="flex items-center cursor-pointer">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="mr-2 accent-white/20" />
                <span>Keep me logged in for 3 days</span>
              </label>
              <button type="button" className="hover:text-white transition-colors">Forgot password?</button>
            </div>

            {/* Server status — only shows when server is still starting */}
            {!connOk && (
              <div className="flex items-center gap-2 text-[11px] text-white/40 px-1">
                <div className="w-2 h-2 rounded-full bg-white/30 animate-pulse" />
                <span>Connecting to server…</span>
              </div>
            )}
            {connOk && (
              <div className="flex items-center gap-2 text-[11px] text-green-400 px-1">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span>Server connected ✓</span>
              </div>
            )}

            <div className="flex gap-4 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 h-11 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-all active:scale-95 flex items-center justify-center disabled:opacity-50 gap-2"
              >
                {submitting ? <><Loader2 className="animate-spin size-4" /><span>Logging in…</span></> : "Log in"}
              </button>
              <button
                type="button"
                onClick={() => { setEmail(""); setPassword("") }}
                className="flex-1 h-11 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all"
              >
                Cancel
              </button>
            </div>
          </form>

          <p className="mt-12 text-[10px] text-white/40 tracking-[0.2em] font-light italic">
            HUDI SOFT MEDICAL SYSTEMS
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="size-8 animate-spin text-white" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
