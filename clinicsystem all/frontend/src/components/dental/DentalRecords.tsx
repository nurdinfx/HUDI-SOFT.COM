'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, Info, Plus, Trash2, HeartPulse, RefreshCw } from 'lucide-react'

// Adult Teeth Numbers (Universal System: 1 to 32)
// Child Teeth Letters (Universal System: A to T)
const ADULT_TEETH = Array.from({ length: 32 }, (_, i) => i + 1)
const CHILD_TEETH = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T']

const CONDITIONS = [
  { value: 'Healthy', label: 'Healthy', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { value: 'Decayed', label: 'Decayed (Caries)', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
  { value: 'Missing', label: 'Missing', color: 'bg-slate-700/50 text-slate-400 border-slate-600' },
  { value: 'Filled', label: 'Filled / Restored', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'Crown', label: 'Crown / Bridge', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { value: 'Root Canal', label: 'Root Canal', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
]

interface ToothState {
  toothNumber: string | number
  condition: string
  treatment?: string
  notes?: string
}

interface DentalRecordsProps {
  initialChart?: ToothState[]
  onSave?: (chart: ToothState[]) => void
  readOnly?: boolean
}

export default function DentalRecords({ initialChart = [], onSave, readOnly = false }: DentalRecordsProps) {
  const [chart, setChart] = useState<ToothState[]>(initialChart)
  const [isAdult, setIsAdult] = useState(true)
  const [selectedTooth, setSelectedTooth] = useState<string | number | null>(null)
  
  // Current tooth form details
  const [condition, setCondition] = useState('Healthy')
  const [treatment, setTreatment] = useState('')
  const [notes, setNotes] = useState('')

  const getToothState = (num: string | number) => {
    return chart.find(t => String(t.toothNumber) === String(num)) || { toothNumber: num, condition: 'Healthy', treatment: '', notes: '' }
  }

  const handleToothClick = (num: string | number) => {
    setSelectedTooth(num)
    const state = getToothState(num)
    setCondition(state.condition)
    setTreatment(state.treatment || '')
    setNotes(state.notes || '')
  }

  const handleUpdateTooth = () => {
    if (selectedTooth === null) return
    
    const newToothState: ToothState = {
      toothNumber: selectedTooth,
      condition,
      treatment: treatment.trim() || undefined,
      notes: notes.trim() || undefined
    }

    const updatedChart = chart.filter(t => String(t.toothNumber) !== String(selectedTooth))
    if (condition !== 'Healthy' || treatment.trim() || notes.trim()) {
      updatedChart.push(newToothState)
    }

    setChart(updatedChart)
    if (onSave) onSave(updatedChart)
    setSelectedTooth(null)
  }

  const handleClearTooth = (num: string | number) => {
    const updatedChart = chart.filter(t => String(t.toothNumber) !== String(num))
    setChart(updatedChart)
    if (onSave) onSave(updatedChart)
    if (selectedTooth === num) setSelectedTooth(null)
  }

  const activeTeeth = isAdult ? ADULT_TEETH : CHILD_TEETH

  return (
    <div className="space-y-6">
      {/* Selector & Options */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <HeartPulse className="text-blue-500" size={20} />
            Interactive Dental Chart
          </h3>
          <p className="text-xs text-slate-500">Select any tooth to view details or log treatment plans</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setIsAdult(true); setSelectedTooth(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${isAdult ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
          >
            Adult (32 Teeth)
          </button>
          <button
            type="button"
            onClick={() => { setIsAdult(false); setSelectedTooth(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${!isAdult ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
          >
            Pediatric (20 Teeth)
          </button>
        </div>
      </div>

      {/* Jaw Layout */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 overflow-x-auto">
        <div className="min-w-[600px] flex flex-col gap-8 justify-center items-center py-6">
          {/* Upper Jaw Row */}
          <div className="flex gap-2.5">
            {activeTeeth.slice(0, activeTeeth.length / 2).map((num) => {
              const state = getToothState(num)
              const isSelected = selectedTooth === num
              const isAffected = state.condition !== 'Healthy'
              const cond = CONDITIONS.find(c => c.value === state.condition)

              return (
                <div key={num} className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400">{num}</span>
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => handleToothClick(num)}
                    className={`w-10 h-12 rounded-t-xl rounded-b-md flex flex-col items-center justify-center font-black transition-all border ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500 text-white scale-110 shadow-lg shadow-blue-500/20'
                        : isAffected
                        ? 'border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-400'
                    }`}
                  >
                    🦷
                  </button>
                  {isAffected && cond && (
                    <span className="text-[8px] px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 truncate max-w-[42px]" title={cond.label}>
                      {cond.label.slice(0, 3)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Bite Separator */}
          <div className="w-full max-w-lg border-b border-dashed border-slate-200 dark:border-slate-800" />

          {/* Lower Jaw Row */}
          <div className="flex gap-2.5">
            {activeTeeth.slice(activeTeeth.length / 2).map((num) => {
              const state = getToothState(num)
              const isSelected = selectedTooth === num
              const isAffected = state.condition !== 'Healthy'
              const cond = CONDITIONS.find(c => c.value === state.condition)

              return (
                <div key={num} className="flex flex-col items-center gap-1.5">
                  {isAffected && cond && (
                    <span className="text-[8px] px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 truncate max-w-[42px]" title={cond.label}>
                      {cond.label.slice(0, 3)}
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => handleToothClick(num)}
                    className={`w-10 h-12 rounded-b-xl rounded-t-md flex flex-col items-center justify-center font-black transition-all border ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500 text-white scale-110 shadow-lg shadow-blue-500/20'
                        : isAffected
                        ? 'border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-400'
                    }`}
                  >
                    🦷
                  </button>
                  <span className="text-[10px] font-bold text-slate-400">{num}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Editor Panel */}
      {selectedTooth !== null && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 bg-white dark:bg-slate-900"
        >
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="font-bold text-slate-900 dark:text-white">
              Editing Tooth #{selectedTooth}
            </span>
            <button
              type="button"
              onClick={() => setSelectedTooth(null)}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Condition</label>
              <select
                value={condition}
                onChange={e => setCondition(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
              >
                {CONDITIONS.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Treatment Performed</label>
              <input
                type="text"
                placeholder="e.g. Composite filling, scaling"
                value={treatment}
                onChange={e => setTreatment(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Observation / Notes</label>
              <input
                type="text"
                placeholder="Notes about plaque, caries depth..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => handleClearTooth(selectedTooth)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-500 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Trash2 size={13} />
              Reset Tooth
            </button>
            <button
              type="button"
              onClick={handleUpdateTooth}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <ShieldCheck size={14} />
              Save Tooth State
            </button>
          </div>
        </motion.div>
      )}

      {/* Summary Table */}
      {chart.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold">
                <th className="px-4 py-2.5">Tooth</th>
                <th className="px-4 py-2.5">Condition</th>
                <th className="px-4 py-2.5">Treatment</th>
                <th className="px-4 py-2.5">Notes</th>
              </tr>
            </thead>
            <tbody>
              {chart.map((t) => (
                <tr key={t.toothNumber} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50">
                  <td className="px-4 py-2 font-black text-slate-950 dark:text-white">#{t.toothNumber}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      t.condition === 'Decayed' ? 'bg-rose-500/10 text-rose-500' :
                      t.condition === 'Filled' ? 'bg-blue-500/10 text-blue-500' :
                      t.condition === 'Crown' ? 'bg-amber-500/10 text-amber-500' :
                      t.condition === 'Root Canal' ? 'bg-purple-500/10 text-purple-500' :
                      'bg-slate-500/10 text-slate-500'
                    }`}>
                      {t.condition}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium">{t.treatment || '—'}</td>
                  <td className="px-4 py-2 text-slate-500 italic">{t.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
