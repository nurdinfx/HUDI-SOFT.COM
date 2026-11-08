'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldAlert, Lock, RefreshCw, LogOut, PhoneCall, ExternalLink } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import api from '@/lib/api'

export default function SuspendedLockScreen() {
  const { user, logout } = useAuth()
  const [checking, setChecking] = useState(false)
  const [msg, setMsg] = useState('')

  const handleCheckAgain = async () => {
    setChecking(true)
    setMsg('')
    try {
      const { data } = await api.get('/clinic/subscription')
      if (data.subscriptionStatus === 'Active') {
        const raw = localStorage.getItem('dcs_session')
        if (raw) {
          const parsed = JSON.parse(raw)
          parsed.subscriptionStatus = 'Active'
          localStorage.setItem('dcs_session', JSON.stringify(parsed))
        }
        window.location.reload()
      } else {
        setMsg('Weli waa hakad. Maamulka HUDI-SOFT ayaan weli fasixin.')
      }
    } catch (err: any) {
      setMsg(err.response?.data?.message || 'Weli nidaamku waa xiran yahay.')
    } finally {
      setChecking(false)
    }
  }

  const licenseKey = typeof window !== 'undefined' ? localStorage.getItem('hudi_license_key') || 'L-XXXX-XXXX' : 'L-XXXX-XXXX'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg bg-slate-900 border border-red-500/30 rounded-3xl p-8 shadow-[0_0_60px_rgba(239,68,68,0.2)] text-center relative overflow-hidden"
      >
        {/* Glow circle */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Lock Icon */}
        <div className="mx-auto w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6 shadow-lg shadow-red-500/20">
          <Lock className="w-10 h-10 text-red-400 animate-pulse" />
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-red-500/20 text-red-400 border border-red-500/30">
          System Suspended • Hakad
        </span>

        <h2 className="text-2xl font-black text-white mt-4 tracking-tight">
          Nidaamka Xarunta Waa La Hakiyay
        </h2>

        <p className="text-slate-400 text-sm mt-2 leading-relaxed">
          Maamulka dhexe ee <strong>HUDI-SOFT</strong> ayaa si kumeel-gaar ah u xanibay shatiga xaruntan.
          Dhammaan adeegyada bukaanka, qorshayaasha daawaynta, iyo diiwaanka xarunta waa xiran yihiin ilaa xarunta dib loo furo.
        </p>

        {/* Clinic & License info box */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 my-6 text-left space-y-2 text-xs">
          <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
            <span className="text-slate-400">Xarunta (Clinic):</span>
            <span className="font-bold text-white text-sm">{user?.clinicName || 'Clinic'}</span>
          </div>
          <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
            <span className="text-slate-400">Furaha Shatiga (Key):</span>
            <span className="font-mono text-cyan-300 font-semibold">{licenseKey}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Xaaladda Nidaamka:</span>
            <span className="text-red-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
              Waa Xaniban Yahay (Suspended)
            </span>
          </div>
        </div>

        {msg && (
          <p className="text-amber-400 text-xs font-semibold mb-4 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
            {msg}
          </p>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <a
            href="https://hudisoft.online"
            target="_blank"
            rel="noreferrer"
            className="w-full py-3 px-4 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
          >
            <PhoneCall className="w-4 h-4" /> La Xiriir Maamulka HUDI-SOFT
          </a>

          <div className="flex gap-2.5">
            <button
              onClick={handleCheckAgain}
              disabled={checking}
              className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-slate-700 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
              {checking ? 'Waa la hubinayaa...' : 'Dib u Hubi (Refresh)'}
            </button>

            <button
              onClick={logout}
              className="py-2.5 px-4 bg-red-950/40 hover:bg-red-900/50 text-red-400 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-red-800/40 transition"
            >
              <LogOut className="w-3.5 h-3.5" /> Ka Bax (Sign Out)
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
