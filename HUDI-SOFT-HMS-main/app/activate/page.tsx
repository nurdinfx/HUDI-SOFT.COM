"use client"

import React, { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { toast } from "sonner"
import { ShieldCheck, KeyRound, Building2, Loader2, Clock, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react"

function ActivationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const keyParam = searchParams ? searchParams.get("key") : null
  const [licenseKey, setLicenseKey] = useState(keyParam || "")
  const [hospitalName, setHospitalName] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)
  const [licenseInfo, setLicenseInfo] = useState<any>(null)

  useEffect(() => {
    if (keyParam) {
      setLicenseKey(keyParam)
    }
  }, [keyParam])

  useEffect(() => {
    const url = keyParam ? `/api/license/status?key=${encodeURIComponent(keyParam)}` : "/api/license/status"
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setLicenseInfo(data)
        if (data?.hospitalName) {
          setHospitalName(data.hospitalName)
        }
      })
      .catch((err) => {
        console.error("License check error:", err)
      })
      .finally(() => setCheckingStatus(false))
  }, [keyParam])

  async function handleActivate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!licenseKey.trim()) {
      toast.error("Please enter a valid license key")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/license/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          licenseKey: licenseKey.trim(),
          hospitalName: hospitalName.trim() || "My Hospital",
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Activation failed")
      }

      toast.success(data.message || "License activated successfully!")
      router.push("/login")
    } catch (err: any) {
      toast.error(err.message || "Failed to activate license")
    } finally {
      setLoading(false)
    }
  }

  async function handleStartDemo() {
    setLoading(true)
    try {
      const res = await fetch("/api/license/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hospitalName: hospitalName.trim() || "My Hospital",
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to start demo")

      toast.success(data.message || "Demo mode activated")
      router.push("/login")
    } catch (err: any) {
      toast.error(err.message || "Could not start demo mode")
    } finally {
      setLoading(false)
    }
  }

  if (checkingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <Loader2 className="size-8 animate-spin text-teal-400" />
      </div>
    )
  }

  const isExpired = licenseInfo?.status === "expired"
  const isDemo = licenseInfo?.status === "demo"
  const daysLeft = licenseInfo?.daysLeft ?? 7

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 p-4 text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(13,148,136,0.15)_0,transparent_100%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-teal-500/10 border border-teal-500/30 rounded-2xl mb-3 shadow-lg backdrop-blur-md">
            <ShieldCheck className="size-10 text-teal-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-teal-200 bg-clip-text text-transparent">
            HUDI-SOFT HMS Activation
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Activate your license key from{" "}
            <a
              href="https://hudi-soft.com"
              target="_blank"
              rel="noreferrer"
              className="text-teal-400 hover:underline font-medium"
            >
              hudi-soft.com
            </a>
          </p>
        </div>

        {/* Demo Warning / Expiry Banner */}
        {isExpired && (
          <div className="mb-6 p-4 rounded-xl border border-red-500/40 bg-red-500/10 text-red-300 text-sm flex items-start gap-3 backdrop-blur-md">
            <AlertTriangle className="size-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-200">License / Demo Expired</p>
              <p className="text-xs text-red-300/80 mt-0.5">
                Your evaluation trial or license has ended. Please enter a valid license key to continue using HUDI-SOFT HMS.
              </p>
            </div>
          </div>
        )}

        {isDemo && daysLeft > 0 && (
          <div className="mb-6 p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-200 text-sm flex items-start gap-3 backdrop-blur-md">
            <Clock className="size-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-100">Trial Demo Mode ({daysLeft} Days Remaining)</p>
              <p className="text-xs text-amber-200/80 mt-0.5">
                You are currently running in demo mode. Activate your key below for unlimited full access.
              </p>
            </div>
          </div>
        )}

        {/* Card Form */}
        <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl shadow-2xl">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <KeyRound className="size-5 text-teal-400" />
              Enter License Key
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Keys are issued upon purchase on the HUDI-SOFT main platform.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleActivate}>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Hospital / Facility Name</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                  <Input
                    type="text"
                    placeholder="e.g. City General Hospital"
                    value={hospitalName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHospitalName(e.target.value)}
                    className="pl-9 bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-teal-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">License Key</Label>
                <Input
                  type="text"
                  placeholder="HUDI-XXXX-XXXX-XXXX"
                  value={licenseKey}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLicenseKey(e.target.value)}
                  className="bg-slate-950/60 border-slate-800 text-white font-mono text-sm tracking-wider uppercase placeholder:text-slate-600 focus-visible:ring-teal-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-400">Customer Name (Optional)</Label>
                  <Input
                    type="text"
                    placeholder="John Doe"
                    value={customerName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerName(e.target.value)}
                    className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 text-xs focus-visible:ring-teal-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-400">Email (Optional)</Label>
                  <Input
                    type="email"
                    placeholder="admin@hospital.com"
                    value={customerEmail}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerEmail(e.target.value)}
                    className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 text-xs focus-visible:ring-teal-500"
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-600 hover:bg-teal-500 text-white font-medium shadow-lg shadow-teal-900/30 py-5 text-sm"
              >
                {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : <CheckCircle2 className="size-4 mr-2" />}
                Activate System License
              </Button>

              {(!isExpired && isDemo && daysLeft > 0) || !licenseInfo?.status ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleStartDemo}
                  disabled={loading}
                  className="w-full text-slate-400 hover:text-white hover:bg-slate-800/60 text-xs"
                >
                  Continue in Demo Mode ({daysLeft} days remaining)
                  <ArrowRight className="size-3.5 ml-1.5" />
                </Button>
              ) : null}
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-xs text-slate-500 mt-6">
          © {new Date().getFullYear()} HUDI-SOFT HMS. All Rights Reserved. Multi-Tenant Licensed Software.
        </p>
      </div>
    </div>
  )
}

export default function ActivationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <Loader2 className="size-8 animate-spin text-teal-400" />
      </div>
    }>
      <ActivationContent />
    </Suspense>
  )
}
