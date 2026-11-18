'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, Plus, MapPin, Phone, Mail, Users, Calendar, Check, X, ShieldCheck, Star
} from 'lucide-react'
import api from '@/lib/api'

interface Branch {
  id: string
  name: string
  code: string
  phone?: string
  email?: string
  address?: string
  city?: string
  is_main: boolean
  is_active: boolean
  total_staff?: number
  total_appointments?: number
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  // Form states
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('Mogadishu')
  const [isMain, setIsMain] = useState(false)

  const loadBranches = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/branches')
      setBranches(data || [])
    } catch (err) {
      console.error('Failed to load branches:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadBranches() }, [])

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    try {
      await api.post('/branches', {
        name, code, phone, email, address, city, isMain
      })
      setShowModal(false)
      setName('')
      setCode('')
      setPhone('')
      setEmail('')
      setAddress('')
      loadBranches()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create branch')
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="text-blue-600" size={24} />
            Multi-Branch Dental Practice Operations
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Centralized practice control across satellite locations, multi-chair clinic branches, and regional hubs
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-600/20 transition-all"
        >
          <Plus size={16} /> Add Clinic Branch
        </button>
      </div>

      {/* Branches Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-16 text-center text-xs text-slate-400">Loading branch network...</div>
        ) : branches.length === 0 ? (
          <div className="col-span-full p-16 text-center space-y-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
            <Building2 className="mx-auto text-slate-300 dark:text-slate-700" size={40} />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No branches registered</p>
            <p className="text-xs text-slate-400">Click "Add Clinic Branch" to register your first practice location.</p>
          </div>
        ) : (
          branches.map(b => (
            <div
              key={b.id}
              className={`p-6 rounded-3xl border bg-white dark:bg-slate-900 space-y-5 transition-all shadow-xs hover:shadow-lg ${
                b.is_main
                  ? 'border-blue-500/50 ring-2 ring-blue-500/10'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{b.code}</span>
                    {b.is_main && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 font-bold text-[9px] flex items-center gap-1">
                        <Star size={10} fill="currentColor" /> Main Headquarters
                      </span>
                    )}
                  </div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white mt-1">
                    {b.name}
                  </h3>
                </div>

                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="Active Branch" />
              </div>

              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                {b.address && (
                  <p className="flex items-center gap-2">
                    <MapPin size={14} className="text-slate-400 shrink-0" />
                    <span>{b.address}, {b.city}</span>
                  </p>
                )}
                {b.phone && (
                  <p className="flex items-center gap-2">
                    <Phone size={14} className="text-slate-400 shrink-0" />
                    <span>{b.phone}</span>
                  </p>
                )}
                {b.email && (
                  <p className="flex items-center gap-2">
                    <Mail size={14} className="text-slate-400 shrink-0" />
                    <span>{b.email}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                  <span className="text-lg font-black text-slate-900 dark:text-white">{b.total_staff || 0}</span>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Doctors & Staff</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                  <span className="text-lg font-black text-slate-900 dark:text-white">{b.total_appointments || 0}</span>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Total Visits</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Branch Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="text-blue-600" size={18} /> Register Clinic Location
                </h3>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateBranch} className="space-y-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1 block">Branch Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Hodan Dental Branch / Airport Road Clinic"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1 block">Branch Code</label>
                    <input
                      type="text"
                      value={code}
                      onChange={e => setCode(e.target.value)}
                      placeholder="e.g. HD-02"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1 block">City / Region</label>
                    <input
                      type="text"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1 block">Phone</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+252 61 ..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1 block">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="branch@clinic.com"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1 block">Physical Street Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Maka Al Mukarama St, Wardhiigley"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isMainCheckbox"
                    checked={isMain}
                    onChange={e => setIsMain(e.target.checked)}
                    className="w-4 h-4 rounded-md text-blue-600"
                  />
                  <label htmlFor="isMainCheckbox" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Set as Main Headquarters Branch
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-600/20"
                  >
                    Register Location
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

