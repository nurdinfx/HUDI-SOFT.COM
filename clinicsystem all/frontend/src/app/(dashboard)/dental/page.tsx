'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HeartPulse, Users, Calendar, History, Save, Printer, RefreshCw,
  Search, ShieldCheck, ChevronRight, FileText, Plus, CheckCircle2, AlertCircle
} from 'lucide-react'
import api from '@/lib/api'
import OdontogramChart, { ToothData } from '@/components/dental/OdontogramChart'

interface PatientOption {
  id: string
  fullName: string
  patientNumber: string
  phone?: string
  gender?: string
}

export default function DentalPage() {
  const [patients, setPatients] = useState<PatientOption[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  const [searchPatient, setSearchPatient] = useState('')
  const [loadingPatients, setLoadingPatients] = useState(false)

  // Chart data
  const [currentChart, setCurrentChart] = useState<ToothData[]>([])
  const [historicalCharts, setHistoricalCharts] = useState<any[]>([])
  const [loadingChart, setLoadingChart] = useState(false)
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Load patients list
  useEffect(() => {
    const fetchPatients = async () => {
      setLoadingPatients(true)
      try {
        const { data } = await api.get('/patients', { params: { limit: 50, search: searchPatient } })
        const list = (data.patients || []).map((p: any) => ({
          id: p.id,
          fullName: p.fullName || p.full_name,
          patientNumber: p.patientNumber || p.patient_number,
          phone: p.phone,
          gender: p.gender
        }))
        setPatients(list)
        if (!selectedPatientId && list.length > 0) {
          setSelectedPatientId(list[0].id)
        }
      } catch (err) {
        console.error('Failed to load patients:', err)
      } finally {
        setLoadingPatients(false)
      }
    }
    fetchPatients()
  }, [searchPatient])

  // Load selected patient chart
  useEffect(() => {
    if (!selectedPatientId) return
    const fetchChart = async () => {
      setLoadingChart(true)
      try {
        // Fetch latest active chart
        const latestRes = await api.get('/dental/charts/latest', { params: { patientId: selectedPatientId } })
        if (latestRes.data?.teeth_data) {
          setCurrentChart(typeof latestRes.data.teeth_data === 'string' ? JSON.parse(latestRes.data.teeth_data) : latestRes.data.teeth_data)
        } else if (latestRes.data?.teethData) {
          setCurrentChart(latestRes.data.teethData)
        } else {
          setCurrentChart([])
        }

        // Fetch history snapshots
        const histRes = await api.get('/dental/charts', { params: { patientId: selectedPatientId } })
        setHistoricalCharts(histRes.data || [])
      } catch (err) {
        console.error('Failed to load dental chart:', err)
      } finally {
        setLoadingChart(false)
      }
    }
    fetchChart()
  }, [selectedPatientId])

  const selectedPatient = patients.find(p => p.id === selectedPatientId)

  const handleSaveChart = async (teeth: ToothData[], notes?: string) => {
    if (!selectedPatientId) {
      alert('Please select a patient first')
      return
    }

    try {
      await api.post('/dental/charts', {
        patientId: selectedPatientId,
        teethData: teeth,
        generalNotes: notes || null,
        isSigned: true
      })
      setMessage({ type: 'success', text: 'Dental Odontogram saved successfully into patient clinical records!' })
      setTimeout(() => setMessage(null), 3000)

      // Refresh history
      const histRes = await api.get('/dental/charts', { params: { patientId: selectedPatientId } })
      setHistoricalCharts(histRes.data || [])
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save chart' })
      setTimeout(() => setMessage(null), 4000)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Patient Selector Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-black">
            <HeartPulse size={26} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">
              HUDI Dental Care — Clinical Odontogram
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Enterprise dental chart, multi-surface anatomical diagnosis, and tooth history
            </p>
          </div>
        </div>

        {/* Patient Selection Dropdown */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              value={searchPatient}
              onChange={e => setSearchPatient(e.target.value)}
              placeholder="Search patient by name / ID..."
              className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-hidden focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white w-56"
            />
          </div>

          <select
            value={selectedPatientId}
            onChange={e => setSelectedPatientId(e.target.value)}
            className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-blue-500/20 max-w-xs"
          >
            {patients.map(p => (
              <option key={p.id} value={p.id}>
                {p.fullName} ({p.patientNumber})
              </option>
            ))}
          </select>
        </div>
      </div>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold border ${
            message.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </motion.div>
      )}

      {/* Tabs: Active Chart vs Historical Snapshots */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('current')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === 'current'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <HeartPulse size={15} /> Active Dental Chart
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === 'history'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <History size={15} /> Historical Snapshots ({historicalCharts.length})
        </button>
      </div>

      {/* Tab 1: Active Interactive Odontogram */}
      {activeTab === 'current' && (
        <div>
          {loadingChart ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              <RefreshCw className="animate-spin text-blue-600 mb-3" size={32} />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Loading Patient Odontogram...
              </p>
            </div>
          ) : (
            <OdontogramChart
              key={selectedPatientId}
              initialData={currentChart}
              patientName={selectedPatient?.fullName}
              onSave={handleSaveChart}
            />
          )}
        </div>
      )}

      {/* Tab 2: Historical Snapshots Timeline */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {historicalCharts.length === 0 ? (
            <div className="p-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
              <History className="mx-auto text-slate-300 dark:text-slate-700 mb-3" size={40} />
              <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm">No historical snapshots yet</h3>
              <p className="text-xs text-slate-400 mt-1">
                Save an Odontogram from the active chart tab to start building a clinical history.
              </p>
            </div>
          ) : (
            historicalCharts.map((snapshot, idx) => {
              const teethData = typeof snapshot.teeth_data === 'string' ? JSON.parse(snapshot.teeth_data) : snapshot.teeth_data
              const affectedCount = (teethData || []).filter((t: any) => t.condition !== 'Healthy').length

              return (
                <div
                  key={snapshot.id || idx}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-xs space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold text-sm">
                        #{historicalCharts.length - idx}
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-slate-900 dark:text-white">
                          Clinical Chart Snapshot — {new Date(snapshot.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </h4>
                        <p className="text-xs text-slate-500">
                          Recorded by: {snapshot.doctor_name || 'Attending Dentist'} • {affectedCount} affected tooth units
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setCurrentChart(teethData)
                        setActiveTab('current')
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl transition-all"
                    >
                      Load into Editor
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    {(teethData || []).filter((t: any) => t.condition !== 'Healthy').map((t: any) => (
                      <span key={t.fdi} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                        Tooth <strong>#{t.fdi}</strong>: {t.condition} {t.treatment ? `(${t.treatment})` : ''}
                      </span>
                    ))}
                  </div>

                  {snapshot.general_notes && (
                    <p className="text-xs text-slate-500 italic bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                      "{snapshot.general_notes}"
                    </p>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

