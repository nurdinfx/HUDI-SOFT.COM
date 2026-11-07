'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, Check, ChevronDown, ChevronUp, Copy, Eye, FileSpreadsheet, FileText,
  HeartPulse, Info, Layers, Palette, Plus, Printer, RefreshCw, Save,
  ShieldCheck, Trash2, X, ZoomIn, Download
} from 'lucide-react'

export interface ToothSurfaceState {
  M?: boolean // Mesial
  D?: boolean // Distal
  O?: boolean // Occlusal / Incisal
  B?: boolean // Buccal / Facial
  L?: boolean // Lingual / Palatal
}

export interface ToothData {
  fdi: number | string
  universal: number | string
  name: string
  condition: string
  surfaces: ToothSurfaceState
  diagnosis?: string
  treatment?: string
  notes?: string
  updatedAt?: string
  dentistName?: string
}

export const DENTAL_CONDITIONS = [
  { value: 'Healthy', label: 'Healthy', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 ring-emerald-500/20', fill: '#10b981' },
  { value: 'Caries', label: 'Caries / Decayed', color: 'bg-rose-500/10 text-rose-500 border-rose-500/30 ring-rose-500/20', fill: '#f43f5e' },
  { value: 'Filled', label: 'Filled / Restored', color: 'bg-blue-500/10 text-blue-500 border-blue-500/30 ring-blue-500/20', fill: '#3b82f6' },
  { value: 'Crown', label: 'Dental Crown', color: 'bg-amber-500/10 text-amber-500 border-amber-500/30 ring-amber-500/20', fill: '#f59e0b' },
  { value: 'Root Canal', label: 'Root Canal (Endo)', color: 'bg-purple-500/10 text-purple-500 border-purple-500/30 ring-purple-500/20', fill: '#a855f7' },
  { value: 'Missing', label: 'Missing Tooth', color: 'bg-slate-500/10 text-slate-400 border-slate-500/30 ring-slate-500/20', fill: '#64748b' },
  { value: 'Extracted', label: 'Extracted', color: 'bg-red-900/20 text-red-400 border-red-800/40', fill: '#991b1b' },
  { value: 'Implant', label: 'Dental Implant', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 ring-indigo-500/20', fill: '#6366f1' },
  { value: 'Bridge', label: 'Bridge Abutment/Pontic', color: 'bg-teal-500/10 text-teal-400 border-teal-500/30 ring-teal-500/20', fill: '#14b8a6' },
  { value: 'Fractured', label: 'Fractured Tooth', color: 'bg-orange-500/10 text-orange-400 border-orange-500/30 ring-orange-500/20', fill: '#f97316' },
  { value: 'Impacted', label: 'Impacted Molar', color: 'bg-pink-500/10 text-pink-400 border-pink-500/30 ring-pink-500/20', fill: '#ec4899' },
  { value: 'Mobility', label: 'Periodontal Mobility', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30 ring-yellow-500/20', fill: '#eab308' },
  { value: 'Planned', label: 'Planned Treatment', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 ring-cyan-500/20', fill: '#06b6d4' },
  { value: 'Completed', label: 'Treatment Completed', color: 'bg-green-500/10 text-green-500 border-green-500/30 ring-green-500/20', fill: '#22c55e' },
]

// 32 Permanent Teeth (FDI System)
export const ADULT_TEETH_UPPER = [
  // Upper Right (Quad 1): 18 down to 11
  { fdi: 18, universal: 1, name: 'Upper Right 3rd Molar (Wisdom)' },
  { fdi: 17, universal: 2, name: 'Upper Right 2nd Molar' },
  { fdi: 16, universal: 3, name: 'Upper Right 1st Molar' },
  { fdi: 15, universal: 4, name: 'Upper Right 2nd Premolar' },
  { fdi: 14, universal: 5, name: 'Upper Right 1st Premolar' },
  { fdi: 13, universal: 6, name: 'Upper Right Canine' },
  { fdi: 12, universal: 7, name: 'Upper Right Lateral Incisor' },
  { fdi: 11, universal: 8, name: 'Upper Right Central Incisor' },
  // Upper Left (Quad 2): 21 up to 28
  { fdi: 21, universal: 9, name: 'Upper Left Central Incisor' },
  { fdi: 22, universal: 10, name: 'Upper Left Lateral Incisor' },
  { fdi: 23, universal: 11, name: 'Upper Left Canine' },
  { fdi: 24, universal: 12, name: 'Upper Left 1st Premolar' },
  { fdi: 25, universal: 13, name: 'Upper Left 2nd Premolar' },
  { fdi: 26, universal: 14, name: 'Upper Left 1st Molar' },
  { fdi: 27, universal: 15, name: 'Upper Left 2nd Molar' },
  { fdi: 28, universal: 16, name: 'Upper Left 3rd Molar (Wisdom)' },
]

export const ADULT_TEETH_LOWER = [
  // Lower Right (Quad 4): 48 down to 41
  { fdi: 48, universal: 32, name: 'Lower Right 3rd Molar (Wisdom)' },
  { fdi: 47, universal: 31, name: 'Lower Right 2nd Molar' },
  { fdi: 46, universal: 30, name: 'Lower Right 1st Molar' },
  { fdi: 45, universal: 29, name: 'Lower Right 2nd Premolar' },
  { fdi: 44, universal: 28, name: 'Lower Right 1st Premolar' },
  { fdi: 43, universal: 27, name: 'Lower Right Canine' },
  { fdi: 42, universal: 26, name: 'Lower Right Lateral Incisor' },
  { fdi: 41, universal: 25, name: 'Lower Right Central Incisor' },
  // Lower Left (Quad 3): 31 up to 38
  { fdi: 31, universal: 24, name: 'Lower Left Central Incisor' },
  { fdi: 32, universal: 23, name: 'Lower Left Lateral Incisor' },
  { fdi: 33, universal: 22, name: 'Lower Left Canine' },
  { fdi: 34, universal: 21, name: 'Lower Left 1st Premolar' },
  { fdi: 35, universal: 20, name: 'Lower Left 2nd Premolar' },
  { fdi: 36, universal: 19, name: 'Lower Left 1st Molar' },
  { fdi: 37, universal: 18, name: 'Lower Left 2nd Molar' },
  { fdi: 38, universal: 17, name: 'Lower Left 3rd Molar (Wisdom)' },
]

// 20 Primary Teeth (Pediatric)
export const PEDIATRIC_TEETH_UPPER = [
  { fdi: 55, universal: 'A', name: 'Upper Right 2nd Primary Molar' },
  { fdi: 54, universal: 'B', name: 'Upper Right 1st Primary Molar' },
  { fdi: 53, universal: 'C', name: 'Upper Right Primary Canine' },
  { fdi: 52, universal: 'D', name: 'Upper Right Primary Lateral' },
  { fdi: 51, universal: 'E', name: 'Upper Right Primary Central' },
  { fdi: 61, universal: 'F', name: 'Upper Left Primary Central' },
  { fdi: 62, universal: 'G', name: 'Upper Left Primary Lateral' },
  { fdi: 63, universal: 'H', name: 'Upper Left Primary Canine' },
  { fdi: 64, universal: 'I', name: 'Upper Left 1st Primary Molar' },
  { fdi: 65, universal: 'J', name: 'Upper Left 2nd Primary Molar' },
]

export const PEDIATRIC_TEETH_LOWER = [
  { fdi: 85, universal: 'T', name: 'Lower Right 2nd Primary Molar' },
  { fdi: 84, universal: 'S', name: 'Lower Right 1st Primary Molar' },
  { fdi: 83, universal: 'R', name: 'Lower Right Primary Canine' },
  { fdi: 82, universal: 'Q', name: 'Lower Right Primary Lateral' },
  { fdi: 81, universal: 'P', name: 'Lower Right Primary Central' },
  { fdi: 71, universal: 'O', name: 'Lower Left Primary Central' },
  { fdi: 72, universal: 'N', name: 'Lower Left Primary Lateral' },
  { fdi: 73, universal: 'M', name: 'Lower Left Primary Canine' },
  { fdi: 74, universal: 'L', name: 'Lower Left 1st Primary Molar' },
  { fdi: 75, universal: 'K', name: 'Lower Left 2nd Primary Molar' },
]

interface OdontogramChartProps {
  initialData?: ToothData[]
  patientName?: string
  patientNumber?: string
  patientPhone?: string
  patientGender?: string
  readOnly?: boolean
  onSave?: (teeth: ToothData[], notes?: string) => Promise<void> | void
}

export default function OdontogramChart({
  initialData = [],
  patientName,
  patientNumber,
  patientPhone,
  patientGender,
  readOnly = false,
  onSave
}: OdontogramChartProps) {
  const [dentitionType, setDentitionType] = useState<'adult' | 'pediatric'>('adult')
  const [numberingSystem, setNumberingSystem] = useState<'FDI' | 'Universal'>('FDI')
  const [teethRecords, setTeethRecords] = useState<ToothData[]>(initialData)
  const [selectedTooth, setSelectedTooth] = useState<ToothData | null>(null)
  const [activeCondition, setActiveCondition] = useState<string>('Healthy')
  const [surfaces, setSurfaces] = useState<ToothSurfaceState>({})
  const [diagnosis, setDiagnosis] = useState('')
  const [treatment, setTreatment] = useState('')
  const [clinicalNotes, setClinicalNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  const upperTeeth = dentitionType === 'adult' ? ADULT_TEETH_UPPER : PEDIATRIC_TEETH_UPPER
  const lowerTeeth = dentitionType === 'adult' ? ADULT_TEETH_LOWER : PEDIATRIC_TEETH_LOWER

  const getRecord = (fdi: number | string): ToothData => {
    const existing = teethRecords.find(t => String(t.fdi) === String(fdi))
    if (existing) return existing

    const all = dentitionType === 'adult' ? [...ADULT_TEETH_UPPER, ...ADULT_TEETH_LOWER] : [...PEDIATRIC_TEETH_UPPER, ...PEDIATRIC_TEETH_LOWER]
    const base = all.find(t => String(t.fdi) === String(fdi))
    return {
      fdi,
      universal: base?.universal || fdi,
      name: base?.name || `Tooth ${fdi}`,
      condition: 'Healthy',
      surfaces: {}
    }
  }

  const handleSelectTooth = (fdi: number | string) => {
    const rec = getRecord(fdi)
    setSelectedTooth(rec)
    setActiveCondition(rec.condition || 'Healthy')
    setSurfaces(rec.surfaces || {})
    setDiagnosis(rec.diagnosis || '')
    setTreatment(rec.treatment || '')
    setClinicalNotes(rec.notes || '')
  }

  const toggleSurface = (s: keyof ToothSurfaceState) => {
    if (readOnly) return
    setSurfaces(prev => ({ ...prev, [s]: !prev[s] }))
  }

  const handleApplyToothRecord = () => {
    if (!selectedTooth) return

    const updated: ToothData = {
      ...selectedTooth,
      condition: activeCondition,
      surfaces,
      diagnosis: diagnosis.trim() || undefined,
      treatment: treatment.trim() || undefined,
      notes: clinicalNotes.trim() || undefined,
      updatedAt: new Date().toISOString()
    }

    setTeethRecords(prev => {
      const filtered = prev.filter(t => String(t.fdi) !== String(selectedTooth.fdi))
      return [...filtered, updated]
    })

    setSelectedTooth(null)
  }

  const handleSaveWholeChart = async () => {
    if (!onSave) return
    setSaving(true)
    try {
      await onSave(teethRecords)
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExportExcel = () => {
    const patient = patientName || 'Patient'
    const pId = patientNumber || 'P-0000'
    const now = new Date()
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

    const allTeeth = dentitionType === 'adult'
      ? [...ADULT_TEETH_UPPER, ...ADULT_TEETH_LOWER]
      : [...PEDIATRIC_TEETH_UPPER, ...PEDIATRIC_TEETH_LOWER]

    const records = allTeeth.map(t => {
      const rec = getRecord(t.fdi)
      const s = rec.surfaces || {}
      const surfArr: string[] = []
      if (s.M) surfArr.push('Mesial (M)')
      if (s.D) surfArr.push('Distal (D)')
      if (s.O) surfArr.push('Occlusal/Incisal (O/I)')
      if (s.B) surfArr.push('Buccal/Facial (B)')
      if (s.L) surfArr.push('Lingual/Palatal (L)')

      let quadrant = ''
      let jaw = ''
      const fdiNum = Number(t.fdi)
      if (fdiNum >= 11 && fdiNum <= 18) {
        quadrant = 'Quadrant 1 (Upper Right)'
        jaw = 'Upper Jaw (Maxilla)'
      } else if (fdiNum >= 21 && fdiNum <= 28) {
        quadrant = 'Quadrant 2 (Upper Left)'
        jaw = 'Upper Jaw (Maxilla)'
      } else if (fdiNum >= 31 && fdiNum <= 38) {
        quadrant = 'Quadrant 3 (Lower Left)'
        jaw = 'Lower Jaw (Mandible)'
      } else if (fdiNum >= 41 && fdiNum <= 48) {
        quadrant = 'Quadrant 4 (Lower Right)'
        jaw = 'Lower Jaw (Mandible)'
      } else if (fdiNum >= 51 && fdiNum <= 55) {
        quadrant = 'Quadrant 5 (Upper Right Primary)'
        jaw = 'Upper Jaw (Maxilla)'
      } else if (fdiNum >= 61 && fdiNum <= 65) {
        quadrant = 'Quadrant 6 (Upper Left Primary)'
        jaw = 'Upper Jaw (Maxilla)'
      } else if (fdiNum >= 71 && fdiNum <= 75) {
        quadrant = 'Quadrant 7 (Lower Left Primary)'
        jaw = 'Lower Jaw (Mandible)'
      } else if (fdiNum >= 81 && fdiNum <= 85) {
        quadrant = 'Quadrant 8 (Lower Right Primary)'
        jaw = 'Lower Jaw (Mandible)'
      }

      return {
        fdi: t.fdi,
        universal: t.universal,
        name: t.name,
        jaw,
        quadrant,
        condition: rec.condition || 'Healthy',
        surfaces: surfArr.length > 0 ? surfArr.join('; ') : 'Whole Tooth / Sound',
        diagnosis: rec.diagnosis || '-',
        treatment: rec.treatment || '-',
        notes: rec.notes || '-',
        updatedAt: rec.updatedAt ? new Date(rec.updatedAt).toLocaleDateString() : dateStr
      }
    })

    const totalTeeth = records.length
    const healthyTeeth = records.filter(r => r.condition === 'Healthy').length
    const findingsTeeth = records.filter(r => r.condition !== 'Healthy').length
    const cariesCount = records.filter(r => r.condition === 'Caries').length
    const filledCount = records.filter(r => r.condition === 'Filled').length
    const rctCount = records.filter(r => r.condition === 'Root Canal').length
    const missingCount = records.filter(r => ['Missing', 'Extracted'].includes(r.condition)).length
    const crownCount = records.filter(r => ['Crown', 'Bridge', 'Implant'].includes(r.condition)).length

    const rows: string[][] = [
      ['HUDI DENTAL CARE - CLINICAL ODONTOGRAM & DENTAL EXAMINATION REPORT'],
      ['Healthcare SaaS:', 'HUDI Dental Care Practice System (https://dental.hudisoft.online)'],
      ['Report Generated:', `${dateStr} at ${timeStr}`],
      [],
      ['PATIENT DEMOGRAPHICS & DETAILS'],
      ['Patient Name:', patient],
      ['Patient ID / File #:', pId],
      ['Gender:', patientGender || 'N/A'],
      ['Contact Phone:', patientPhone || 'N/A'],
      ['Dentition Mode:', dentitionType === 'adult' ? 'Adult Permanent (32 Teeth)' : 'Pediatric Primary (20 Teeth)'],
      ['Numbering Notation:', numberingSystem === 'FDI' ? 'FDI Two-Digit World Dental Federation' : 'Universal Numbering System (1-32 / A-T)'],
      [],
      ['CLINICAL SUMMARY & FINDINGS'],
      ['Total Teeth Evaluated', String(totalTeeth)],
      ['Sound / Healthy Teeth', String(healthyTeeth)],
      ['Teeth Requiring Intervention / Care', String(findingsTeeth)],
      ['Caries / Active Decay', String(cariesCount)],
      ['Filled / Restorations', String(filledCount)],
      ['Endodontic (Root Canal)', String(rctCount)],
      ['Missing / Extracted Units', String(missingCount)],
      ['Prosthetics (Crown / Implant / Bridge)', String(crownCount)],
      [],
      [
        'Tooth # (FDI)',
        'Tooth # (Universal)',
        'Tooth Name',
        'Jaw / Arch',
        'Quadrant',
        'Condition',
        'Affected Surfaces',
        'Clinical Diagnosis',
        'Proposed Treatment Procedure',
        'Dentist Notes',
        'Record Date'
      ]
    ]

    records.forEach(r => {
      rows.push([
        String(r.fdi),
        String(r.universal),
        r.name,
        r.jaw,
        r.quadrant,
        r.condition,
        r.surfaces,
        r.diagnosis,
        r.treatment,
        r.notes,
        r.updatedAt
      ])
    })

    const csvContent = '\uFEFF' + rows.map(row => 
      row.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')
    ).join('\r\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const safePatient = patient.replace(/[^a-zA-Z0-9_-]/g, '_')
    link.download = `Odontogram_${safePatient}_${pId}_${now.toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Visual Surface Diamond Renderer
  const renderToothDiamond = (rec: ToothData, isSelected: boolean) => {
    const condMeta = DENTAL_CONDITIONS.find(c => c.value === rec.condition) || DENTAL_CONDITIONS[0]
    const s = rec.surfaces || {}
    const hasAnySurface = s.M || s.D || s.O || s.B || s.L

    return (
      <div className={`relative w-11 h-11 rounded-lg flex items-center justify-center p-0.5 transition-all ${isSelected ? 'ring-2 ring-blue-500 scale-105 shadow-md shadow-blue-500/20' : 'hover:border-blue-400'}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs">
          {/* Top - Buccal (B) */}
          <polygon
            points="0,0 100,0 75,25 25,25"
            fill={s.B ? condMeta.fill : '#e2e8f0'}
            className="transition-colors cursor-pointer dark:fill-slate-700"
            style={s.B ? { fill: condMeta.fill } : {}}
          />
          {/* Bottom - Lingual (L) */}
          <polygon
            points="25,75 75,75 100,100 0,100"
            fill={s.L ? condMeta.fill : '#e2e8f0'}
            className="transition-colors cursor-pointer dark:fill-slate-700"
            style={s.L ? { fill: condMeta.fill } : {}}
          />
          {/* Left - Mesial (M) */}
          <polygon
            points="0,0 25,25 25,75 0,100"
            fill={s.M ? condMeta.fill : '#cbd5e1'}
            className="transition-colors cursor-pointer dark:fill-slate-600"
            style={s.M ? { fill: condMeta.fill } : {}}
          />
          {/* Right - Distal (D) */}
          <polygon
            points="100,0 100,100 75,75 75,25"
            fill={s.D ? condMeta.fill : '#cbd5e1'}
            className="transition-colors cursor-pointer dark:fill-slate-600"
            style={s.D ? { fill: condMeta.fill } : {}}
          />
          {/* Center - Occlusal / Incisal (O) */}
          <rect
            x="25" y="25" width="50" height="50"
            fill={s.O || !hasAnySurface && rec.condition !== 'Healthy' ? condMeta.fill : '#f8fafc'}
            className="transition-colors cursor-pointer dark:fill-slate-800"
            style={(s.O || (!hasAnySurface && rec.condition !== 'Healthy')) ? { fill: condMeta.fill } : {}}
          />
        </svg>

        {/* Missing / Extracted cross overlay */}
        {rec.condition === 'Missing' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-slate-500 font-black text-xl">✕</span>
          </div>
        )}
        {rec.condition === 'Extracted' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-red-600 font-black text-xl">✘</span>
          </div>
        )}
        {rec.condition === 'Crown' && (
          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-[8px] font-black text-white flex items-center justify-center">
            C
          </div>
        )}
        {rec.condition === 'Root Canal' && (
          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-purple-600 text-[8px] font-black text-white flex items-center justify-center">
            R
          </div>
        )}
        {rec.condition === 'Implant' && (
          <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-indigo-600 text-[8px] font-black text-white flex items-center justify-center">
            I
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6 print:m-0 print:p-0">
      {/* Top Header / Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-xs print:hidden">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <HeartPulse className="text-blue-600" size={24} />
            Digital Odontogram & Clinical Dental Chart
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {patientName ? `Patient: ${patientName} • ` : ''}
            Interactive 5-surface tooth mapping (FDI & Universal)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Dentition Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => { setDentitionType('adult'); setSelectedTooth(null); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${dentitionType === 'adult' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-500'}`}
            >
              Adult (32 Teeth)
            </button>
            <button
              type="button"
              onClick={() => { setDentitionType('pediatric'); setSelectedTooth(null); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${dentitionType === 'pediatric' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-500'}`}
            >
              Pediatric (20 Teeth)
            </button>
          </div>

          {/* Numbering System Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setNumberingSystem('FDI')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${numberingSystem === 'FDI' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500'}`}
              title="FDI World Dental Federation Two-Digit System"
            >
              FDI
            </button>
            <button
              type="button"
              onClick={() => setNumberingSystem('Universal')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${numberingSystem === 'Universal' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500'}`}
              title="Universal Numbering System (1-32, A-T)"
            >
              Universal
            </button>
          </div>

          {/* Action Buttons */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            title="Daji Shaxda Excel (.csv) / Export to Excel"
          >
            <FileSpreadsheet size={15} />
            <span>Excel Export</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
            title="Daabac ama PDF Document ka dhigo / Print & Download PDF"
          >
            <Printer size={15} />
            <span>Print / PDF</span>
          </button>

          {!readOnly && onSave && (
            <button
              type="button"
              onClick={handleSaveWholeChart}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
              {savedSuccess ? 'Chart Saved!' : 'Save Odontogram'}
            </button>
          )}
        </div>
      </div>

      {/* Main Arch Graphic Display */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xs overflow-x-auto print:hidden">
        <div className="min-w-[780px] flex flex-col items-center gap-10">
          
          {/* Upper Maxillary Arch */}
          <div className="w-full flex flex-col items-center gap-2">
            <div className="w-full flex justify-between px-6 text-[11px] font-black uppercase tracking-widest text-slate-400">
              <span>Patient Right (Maxillary Quadrant 1)</span>
              <span className="text-blue-600 font-bold">Upper Jaw (Maxilla)</span>
              <span>Patient Left (Maxillary Quadrant 2)</span>
            </div>

            <div className="flex items-center gap-2.5 bg-slate-50/80 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-100 dark:border-slate-800/80">
              {upperTeeth.map((tooth) => {
                const rec = getRecord(tooth.fdi)
                const isSelected = selectedTooth?.fdi === tooth.fdi
                const displayNum = numberingSystem === 'FDI' ? tooth.fdi : tooth.universal

                return (
                  <div key={tooth.fdi} className="flex flex-col items-center gap-1.5 group">
                    <span className="text-[10px] font-black text-slate-500 group-hover:text-blue-600 transition-colors">
                      {displayNum}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectTooth(tooth.fdi)}
                      className="cursor-pointer focus:outline-hidden"
                      title={`${tooth.name} (FDI: ${tooth.fdi}, Uni: ${tooth.universal})`}
                    >
                      {renderToothDiamond(rec, isSelected)}
                    </button>
                    {rec.condition !== 'Healthy' && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 truncate max-w-[44px]">
                        {rec.condition.slice(0, 4)}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Occlusal Median Plane Divider */}
          <div className="w-full max-w-2xl flex items-center justify-center gap-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent" />
            <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
              Occlusal Bite Plane
            </span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent" />
          </div>

          {/* Lower Mandibular Arch */}
          <div className="w-full flex flex-col items-center gap-2">
            <div className="flex items-center gap-2.5 bg-slate-50/80 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-100 dark:border-slate-800/80">
              {lowerTeeth.map((tooth) => {
                const rec = getRecord(tooth.fdi)
                const isSelected = selectedTooth?.fdi === tooth.fdi
                const displayNum = numberingSystem === 'FDI' ? tooth.fdi : tooth.universal

                return (
                  <div key={tooth.fdi} className="flex flex-col items-center gap-1.5 group">
                    {rec.condition !== 'Healthy' && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 truncate max-w-[44px]">
                        {rec.condition.slice(0, 4)}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSelectTooth(tooth.fdi)}
                      className="cursor-pointer focus:outline-hidden"
                      title={`${tooth.name} (FDI: ${tooth.fdi}, Uni: ${tooth.universal})`}
                    >
                      {renderToothDiamond(rec, isSelected)}
                    </button>
                    <span className="text-[10px] font-black text-slate-500 group-hover:text-blue-600 transition-colors">
                      {displayNum}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="w-full flex justify-between px-6 text-[11px] font-black uppercase tracking-widest text-slate-400">
              <span>Patient Right (Mandibular Quadrant 4)</span>
              <span className="text-blue-600 font-bold">Lower Jaw (Mandible)</span>
              <span>Patient Left (Mandibular Quadrant 3)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Inspection & Surface Editor Modal / Drawer */}
      <AnimatePresence>
        {selectedTooth && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-6"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-black text-lg">
                  {numberingSystem === 'FDI' ? selectedTooth.fdi : selectedTooth.universal}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">
                    {selectedTooth.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    FDI: {selectedTooth.fdi} • Universal: {selectedTooth.universal}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTooth(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            {/* Condition Selector */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                Tooth Clinical Condition
              </label>
              <div className="flex flex-wrap gap-2">
                {DENTAL_CONDITIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    disabled={readOnly}
                    onClick={() => setActiveCondition(c.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      activeCondition === c.value
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                        : `${c.color} hover:opacity-80`
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Anatomical 5-Surfaces Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Anatomical Surfaces Involved (Click to Toggle)
                </label>
                <span className="text-[10px] text-slate-400">
                  Selected: {[surfaces.M && 'M', surfaces.D && 'D', surfaces.O && 'O', surfaces.B && 'B', surfaces.L && 'L'].filter(Boolean).join(', ') || 'Whole Tooth'}
                </span>
              </div>

              <div className="flex items-center justify-center py-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="relative w-36 h-36">
                  {/* Buccal (B) - Top */}
                  <button
                    type="button"
                    onClick={() => toggleSurface('B')}
                    className={`absolute top-0 inset-x-9 h-9 rounded-t-xl font-bold text-xs flex items-center justify-center transition-all ${
                      surfaces.B ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
                    }`}
                  >
                    Buccal (B)
                  </button>

                  {/* Lingual (L) - Bottom */}
                  <button
                    type="button"
                    onClick={() => toggleSurface('L')}
                    className={`absolute bottom-0 inset-x-9 h-9 rounded-b-xl font-bold text-xs flex items-center justify-center transition-all ${
                      surfaces.L ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
                    }`}
                  >
                    Lingual (L)
                  </button>

                  {/* Mesial (M) - Left */}
                  <button
                    type="button"
                    onClick={() => toggleSurface('M')}
                    className={`absolute left-0 inset-y-9 w-9 rounded-l-xl font-bold text-xs flex items-center justify-center transition-all ${
                      surfaces.M ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
                    }`}
                  >
                    M
                  </button>

                  {/* Distal (D) - Right */}
                  <button
                    type="button"
                    onClick={() => toggleSurface('D')}
                    className={`absolute right-0 inset-y-9 w-9 rounded-r-xl font-bold text-xs flex items-center justify-center transition-all ${
                      surfaces.D ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
                    }`}
                  >
                    D
                  </button>

                  {/* Occlusal / Incisal (O) - Center */}
                  <button
                    type="button"
                    onClick={() => toggleSurface('O')}
                    className={`absolute inset-9 rounded-md font-bold text-xs flex items-center justify-center transition-all ${
                      surfaces.O ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-400'
                    }`}
                  >
                    O / I
                  </button>
                </div>
              </div>
            </div>

            {/* Diagnosis & Proposed Treatment Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5 block">
                  Clinical Diagnosis
                </label>
                <input
                  type="text"
                  value={diagnosis}
                  onChange={e => setDiagnosis(e.target.value)}
                  placeholder="e.g. Deep occlusal caries approaching pulp"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5 block">
                  Recommended Treatment Procedure
                </label>
                <input
                  type="text"
                  value={treatment}
                  onChange={e => setTreatment(e.target.value)}
                  placeholder="e.g. Composite Restoration (MOD) or Root Canal"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5 block">
                Dentist Clinical Notes
              </label>
              <textarea
                rows={2}
                value={clinicalNotes}
                onChange={e => setClinicalNotes(e.target.value)}
                placeholder="Specific anatomical notes, pulp vitality findings, patient sensitivity..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedTooth(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyToothRecord}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-600/20"
              >
                Apply to Odontogram
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend Card */}
      <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 print:hidden">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
          <Palette size={14} /> Clinical Odontogram Legend
        </h4>
        <div className="flex flex-wrap gap-2.5 text-[10px]">
          {DENTAL_CONDITIONS.map(c => (
            <div key={c.value} className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-100 dark:border-slate-700">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.fill }} />
              <span className="font-bold text-slate-700 dark:text-slate-300">{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================== */}
      {/* PRINT-ONLY CLINICAL DENTAL EXAMINATION REPORT (PDF / PAPER)   */}
      {/* ============================================================== */}
      {(() => {
        const allTeethList = dentitionType === 'adult'
          ? [...ADULT_TEETH_UPPER, ...ADULT_TEETH_LOWER]
          : [...PEDIATRIC_TEETH_UPPER, ...PEDIATRIC_TEETH_LOWER]

        const activeFindings = allTeethList.map(t => {
          const rec = getRecord(t.fdi)
          return { ...t, ...rec }
        }).filter(t => t.condition !== 'Healthy' || (t.surfaces && Object.values(t.surfaces).some(Boolean)) || t.diagnosis || t.treatment)

        const printHealthyCount = allTeethList.length - activeFindings.length
        const printCariesCount = activeFindings.filter(t => t.condition === 'Caries').length
        const printFilledCount = activeFindings.filter(t => t.condition === 'Filled').length
        const printRctMissingCount = activeFindings.filter(t => ['Root Canal', 'Missing', 'Extracted', 'Crown', 'Implant'].includes(t.condition)).length

        return (
          <div className="hidden print:block font-sans text-slate-900 bg-white p-6 max-w-4xl mx-auto space-y-6">
            {/* Official Clinic Header */}
            <div className="border-b-2 border-blue-600 pb-4 flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black text-blue-900 tracking-wide">HUDI DENTAL CARE</h1>
                <p className="text-xs font-bold text-slate-600 tracking-wider uppercase">Advanced Oral Surgery & Comprehensive Dental Practice</p>
                <p className="text-[11px] text-slate-500">Mogadishu, Somalia • Web: dental.hudisoft.online</p>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 font-black text-xs uppercase tracking-widest rounded-md">
                  Clinical Odontogram Report
                </span>
                <p className="text-xs text-slate-500 mt-1">Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
              </div>
            </div>

            {/* Patient Demographics Card */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs">
              <div>
                <p className="text-slate-500 font-bold uppercase text-[10px]">Patient Name</p>
                <p className="text-base font-black text-slate-900">{patientName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-500 font-bold uppercase text-[10px]">Patient ID / File #</p>
                <p className="text-base font-black text-slate-900">{patientNumber || 'P-0000'}</p>
              </div>
              <div>
                <p className="text-slate-500 font-bold uppercase text-[10px]">Gender & Contact</p>
                <p className="font-bold text-slate-800">{patientGender || 'Not Specified'} • {patientPhone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-500 font-bold uppercase text-[10px]">Dentition & Chart System</p>
                <p className="font-bold text-slate-800">{dentitionType === 'adult' ? 'Adult Permanent (32 Teeth)' : 'Pediatric Primary (20 Teeth)'} • {numberingSystem} System</p>
              </div>
            </div>

            {/* Clinical KPI Summary */}
            <div className="grid grid-cols-4 gap-3 text-center text-xs">
              <div className="border border-emerald-200 bg-emerald-50/60 p-3 rounded-xl">
                <p className="text-[10px] uppercase font-bold text-emerald-700">Sound / Healthy Teeth</p>
                <p className="text-2xl font-black text-emerald-800">{printHealthyCount}</p>
              </div>
              <div className="border border-rose-200 bg-rose-50/60 p-3 rounded-xl">
                <p className="text-[10px] uppercase font-bold text-rose-700">Caries / Decayed</p>
                <p className="text-2xl font-black text-rose-800">{printCariesCount}</p>
              </div>
              <div className="border border-blue-200 bg-blue-50/60 p-3 rounded-xl">
                <p className="text-[10px] uppercase font-bold text-blue-700">Filled / Restored</p>
                <p className="text-2xl font-black text-blue-800">{printFilledCount}</p>
              </div>
              <div className="border border-purple-200 bg-purple-50/60 p-3 rounded-xl">
                <p className="text-[10px] uppercase font-bold text-purple-700">Root Canal / Missing / Crowns</p>
                <p className="text-2xl font-black text-purple-800">{printRctMissingCount}</p>
              </div>
            </div>

            {/* Itemized Table of Clinical Findings */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                Detailed Teeth Findings & Treatment Plan ({activeFindings.length} affected units)
              </h3>
              {activeFindings.length === 0 ? (
                <div className="p-4 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                  All teeth evaluated as Healthy & Sound with no active clinical pathology detected.
                </div>
              ) : (
                <table className="w-full text-left text-xs border border-slate-200 border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-black border-b border-slate-200">
                      <th className="p-2 border-r border-slate-200 w-16">Tooth #</th>
                      <th className="p-2 border-r border-slate-200">Tooth Name</th>
                      <th className="p-2 border-r border-slate-200 w-28">Condition</th>
                      <th className="p-2 border-r border-slate-200 w-32">Surfaces</th>
                      <th className="p-2 border-r border-slate-200">Diagnosis</th>
                      <th className="p-2">Proposed Treatment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeFindings.map((t) => {
                      const s = t.surfaces || {}
                      const surfArr: string[] = []
                      if (s.M) surfArr.push('M')
                      if (s.D) surfArr.push('D')
                      if (s.O) surfArr.push('O/I')
                      if (s.B) surfArr.push('B')
                      if (s.L) surfArr.push('L')

                      return (
                        <tr key={t.fdi} className="border-b border-slate-200">
                          <td className="p-2 border-r border-slate-200 font-black">
                            {numberingSystem === 'FDI' ? t.fdi : t.universal}
                          </td>
                          <td className="p-2 border-r border-slate-200 font-medium">
                            {t.name}
                          </td>
                          <td className="p-2 border-r border-slate-200 font-bold">
                            {t.condition}
                          </td>
                          <td className="p-2 border-r border-slate-200 font-mono text-[11px]">
                            {surfArr.length > 0 ? surfArr.join(', ') : 'Whole Tooth'}
                          </td>
                          <td className="p-2 border-r border-slate-200">
                            {t.diagnosis || '-'}
                          </td>
                          <td className="p-2">
                            {t.treatment || '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Official Sign-off Section */}
            <div className="pt-8 border-t border-slate-200 flex justify-between items-end text-xs">
              <div>
                <p className="text-slate-600 font-bold">HUDI Dental Care Practice SaaS</p>
                <p className="text-slate-400 text-[10px]">Confidential clinical chart report • Valid with official stamp</p>
              </div>
              <div className="flex gap-10">
                <div className="text-center">
                  <div className="w-40 border-b border-slate-400 h-10 mb-1" />
                  <p className="text-[11px] font-bold text-slate-700">Attending Dentist Signature</p>
                </div>
                <div className="text-center">
                  <div className="w-28 h-14 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-[10px] text-slate-400 mb-1">
                    Clinic Official Stamp
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

