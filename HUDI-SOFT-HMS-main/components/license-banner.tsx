"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, ShieldAlert, ArrowRight } from "lucide-react"

export function LicenseBanner() {
  const [license, setLicense] = useState<{
    status: string
    daysLeft: number
    hospitalName?: string
  } | null>(null)

  useEffect(() => {
    fetch("/api/license/status")
      .then((res) => res.json())
      .then((data) => setLicense(data))
      .catch((err) => console.error("Banner license status fetch error:", err))
  }, [])

  if (!license) return null
  if (license.status === "active") return null

  if (license.status === "expired") {
    return (
      <div className="bg-red-600 text-white px-4 py-2 text-xs md:text-sm font-medium flex items-center justify-between shadow-inner">
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-4 animate-pulse shrink-0" />
          <span>
            <strong>License Expired:</strong> System functionality requires activation for {license.hospitalName || "your hospital"}.
          </span>
        </div>
        <Link
          href="/activate"
          className="bg-white text-red-600 hover:bg-slate-100 px-3 py-1 rounded-md font-semibold text-xs transition-colors flex items-center gap-1 shrink-0 ml-2"
        >
          Activate Now <ArrowRight className="size-3" />
        </Link>
      </div>
    )
  }

  if (license.status === "demo" && license.daysLeft !== undefined) {
    return (
      <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 px-4 py-1.5 text-xs font-medium flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-slate-950 shrink-0" />
          <span>
            <strong>DEMO MODE:</strong> Trial period for <strong>{license.hospitalName || "My Hospital"}</strong> ends in{" "}
            <strong>{license.daysLeft} day(s)</strong>.
          </span>
        </div>
        <Link
          href="/activate"
          className="bg-slate-950 text-white hover:bg-slate-900 px-3 py-1 rounded-md font-medium text-xs transition-colors flex items-center gap-1 shrink-0 ml-2"
        >
          Activate License <ArrowRight className="size-3" />
        </Link>
      </div>
    )
  }

  return null
}
