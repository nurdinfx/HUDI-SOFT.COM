'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Heart, Key, Loader2, ShieldCheck } from 'lucide-react'
import axios from 'axios'

export default function ActivationPage() {
  const router = useRouter()
  const [licenseKey, setLicenseKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      // Call our OWN backend — it validates with HUDI-SOFT server-side (no CORS issue)
      const backendApi = process.env.NEXT_PUBLIC_API_URL || 'https://hudi-soft-com-2.onrender.com/api'
      const response = await axios.post(`${backendApi}/auth/activate`, {
        licenseKey: licenseKey,
      })

      if (response.data.valid) {
        setSuccess('License activated successfully!')
        localStorage.setItem('hudi_license_key', licenseKey)
        setTimeout(() => {
          router.push('/login')
        }, 1500)
      } else {
        setError(response.data.message || 'Invalid license key.')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Activation failed. Please check your key or connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center shadow-glow-blue">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-lg leading-tight">License Activation</p>
            <p className="text-blue-300 text-xs">HUDI SOFT Systems</p>
          </div>
        </div>

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-4xl font-extrabold text-white leading-tight">
              Activate Your<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                Digital Clinic
              </span>
            </h1>
            <p className="mt-4 text-slate-400 text-lg leading-relaxed max-w-md">
              Please enter your 16-character HUDI-SOFT license key to unlock your dedicated clinic environment.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-4 max-w-sm">
            {[
              { label: 'Security', value: 'Bank-Grade' },
              { label: 'Isolation', value: 'Multi-Tenant' },
            ].map((stat) => (
              <div key={stat.label} className="glass-card-dark p-4">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-slate-400 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-600 text-sm">
          © {new Date().getFullYear()} HUDI SOFT · Datel Clinic System
        </p>
      </div>

      {/* Right panel — activation form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center shadow-glow-blue">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-lg leading-tight">Datel Clinic System</p>
              <p className="text-blue-300 text-xs">by HUDI SOFT</p>
            </div>
          </div>

          <div className="glass-card-dark p-8 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">System Activation</h2>
              <p className="text-slate-400 text-sm mt-1">Enter your HUDI-SOFT license key</p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-emerald-400 text-sm font-medium"
              >
                {success}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">License Key</label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                    required
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary text-sm transition-all font-mono tracking-widest uppercase"
                  />
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={loading || success !== ''}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-bold text-sm shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Validating...' : 'Activate System'}
              </motion.button>
            </form>

            <div className="border-t border-slate-700/50 pt-5 text-center space-y-2">
              <p className="text-xs text-slate-500">
                Don't have a license key?{' '}
                <a href="https://hudisoft.online/request-demo" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
                  Request a Trial
                </a>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
