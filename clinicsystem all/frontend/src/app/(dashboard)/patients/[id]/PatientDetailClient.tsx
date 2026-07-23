'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft, User, Phone, Droplets, Calendar, MapPin,
  FileText, Receipt, FlaskConical, Pill, Edit, AlertTriangle, HeartPulse,
} from 'lucide-react'
import api from '@/lib/api'
import { Patient, ConsultationNote, Invoice, Appointment } from '@/types'
import { formatDate, getAgeFromDOB, getInitials, getStatusColor, formatCurrency } from '@/lib/utils'
import DentalRecords from '@/components/dental/DentalRecords'

export default function PatientDetailClient() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [consultations, setConsultations] = useState<ConsultationNote[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [dentalChart, setDentalChart] = useState<any[]>([])
  const [dentalLoading, setDentalLoading] = useState(false)
  const [savingDental, setSavingDental] = useState(false)
  const [tab, setTab] = useState<'overview' | 'consultations' | 'dental' | 'appointments' | 'billing'>('overview')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const [p, c, a, inv] = await Promise.all([
        api.get(`/patients/${id}`),
        api.get('/consultations', { params: { patientId: id, limit: 20 } }),
        api.get('/appointments', { params: { patientId: id, limit: 20 } }),
        api.get('/invoices', { params: { patientId: id, limit: 20 } }),
      ])
      setPatient(p.data)
      setConsultations(c.data.records)
      setAppointments(a.data.appointments)
      setInvoices(inv.data.invoices)
    } catch { router.push('/patients') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    load()
  }, [id])

  const loadDental = async () => {
    setDentalLoading(true)
    try {
      const { data } = await api.get('/dental', { params: { patientId: id } })
      if (data && data.length > 0) {
        setDentalChart(data[0].tooth_chart || [])
      } else {
        setDentalChart([])
      }
    } catch (err) {
      console.error('Error loading dental records:', err)
    } finally {
      setDentalLoading(false)
    }
  }

  useEffect(() => {
    if (tab === 'dental') {
      loadDental()
    }
  }, [tab])

  const handleSaveDental = async (chartData: any[]) => {
    setSavingDental(true)
    try {
      await api.post('/dental', {
        patientId: id,
        toothChart: chartData,
        chiefComplaint: 'Updated from patient dashboard',
        oralHygiene: 'Fair',
        treatmentPerformed: 'Chart updated'
      })
      setDentalChart(chartData)
      alert('Dental chart saved successfully.')
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save dental chart.')
    } finally {
      setSavingDental(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 w-48 bg-slate-100 dark:bg-slate-800 rounded-xl" />
        <div className="h-48 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
      </div>
    )
  }

  if (!patient) return null

  const bloodColors: Record<string, string> = {
    'A+': 'bg-red-100 text-red-600', 'A-': 'bg-red-100 text-red-600',
    'B+': 'bg-orange-100 text-orange-600', 'B-': 'bg-orange-100 text-orange-600',
    'AB+': 'bg-purple-100 text-purple-600', 'AB-': 'bg-purple-100 text-purple-600',
    'O+': 'bg-blue-100 text-blue-600', 'O-': 'bg-blue-100 text-blue-600',
    Unknown: 'bg-slate-100 text-slate-500',
  }

  const TABS = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'consultations', label: `Consultations (${consultations.length})`, icon: FileText },
    { id: 'dental', label: 'Dental Chart', icon: HeartPulse },
    { id: 'appointments', label: `Appointments (${appointments.length})`, icon: Calendar },
    { id: 'billing', label: `Billing (${invoices.length})`, icon: Receipt },
  ]

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Back button */}
      <button onClick={() => router.back()} className="btn-ghost text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Patients
      </button>

      {/* Patient header card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center text-white text-2xl font-extrabold shrink-0 shadow-glow-blue">
            {getInitials(patient.fullName)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{patient.fullName}</h1>
              <span className="badge-gray text-sm font-mono">{patient.patientNumber}</span>
              {!patient.isActive && <span className="badge-red">Archived</span>}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3">
              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <User className="w-4 h-4" />
                {patient.gender}
                {patient.dateOfBirth && ` · ${getAgeFromDOB(patient.dateOfBirth)} years`}
              </div>
              {patient.phone && (
                <div className="flex items-center gap-1.5 text-sm text-slate-500">
                  <Phone className="w-4 h-4" /> {patient.phone}
                </div>
              )}
              {(patient.city || patient.address) && (
                <div className="flex items-center gap-1.5 text-sm text-slate-500">
                  <MapPin className="w-4 h-4" /> {patient.city || patient.address}
                </div>
              )}
              {patient.bloodType && (
                <span className={`badge text-xs px-2.5 py-1 rounded-full font-bold ${bloodColors[patient.bloodType] || bloodColors.Unknown}`}>
                  <Droplets className="w-3 h-3 inline mr-1" />{patient.bloodType}
                </span>
              )}
            </div>

            {/* Allergies */}
            {patient.allergies && patient.allergies.length > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <div className="flex flex-wrap gap-1.5">
                  {patient.allergies.map((a, i) => (
                    <span key={i} className="badge-red text-xs">{a}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Chronic conditions */}
            {patient.chronicConditions && patient.chronicConditions.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-slate-400 font-medium">Conditions:</span>
                <div className="flex flex-wrap gap-1.5">
                  {patient.chronicConditions.map((c, i) => (
                    <span key={i} className="badge-yellow text-xs">{c}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => router.push(`/patients?edit=${patient.id}`)}
            className="btn-secondary shrink-0"
          >
            <Edit className="w-4 h-4" /> Edit
          </button>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-full overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${tab === t.id ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Personal Info */}
          <div className="glass-card p-5 space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wide">Personal Information</h3>
            <div className="space-y-3">
              {[
                { label: 'Full Name', value: patient.fullName },
                { label: 'Date of Birth', value: patient.dateOfBirth ? `${formatDate(patient.dateOfBirth)} (${getAgeFromDOB(patient.dateOfBirth)} yrs)` : '—' },
                { label: 'Gender', value: patient.gender },
                { label: 'Phone', value: patient.phone || '—' },
                { label: 'Email', value: patient.email || '—' },
                { label: 'National ID', value: patient.nationalId || '—' },
                { label: 'Address', value: patient.address || '—' },
                { label: 'City', value: patient.city || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-4">
                  <span className="text-xs text-slate-400 font-medium w-28 shrink-0">{label}</span>
                  <span className="text-sm text-slate-700 dark:text-slate-300 text-right">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Medical Info */}
          <div className="glass-card p-5 space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wide">Medical Information</h3>
            <div className="space-y-3">
              {[
                { label: 'Blood Type', value: patient.bloodType || 'Unknown' },
                { label: 'Allergies', value: patient.allergies?.join(', ') || '—' },
                { label: 'Chronic Conditions', value: patient.chronicConditions?.join(', ') || '—' },
                { label: 'Insurance', value: patient.insuranceProvider || '—' },
                { label: 'Policy #', value: patient.insurancePolicyNo || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-4">
                  <span className="text-xs text-slate-400 font-medium w-32 shrink-0">{label}</span>
                  <span className="text-sm text-slate-700 dark:text-slate-300 text-right">{value}</span>
                </div>
              ))}
            </div>

            {/* Emergency contact */}
            {patient.emergencyName && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <p className="text-xs text-slate-400 font-medium mb-2">Emergency Contact</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{patient.emergencyName}</p>
                <p className="text-xs text-slate-500">{patient.emergencyRelation} · {patient.emergencyPhone}</p>
              </div>
            )}
          </div>

          {/* Quick stats */}
          <div className="md:col-span-2 grid grid-cols-4 gap-4">
            {[
              { label: 'Total Visits', value: consultations.length, color: 'text-primary' },
              { label: 'Appointments', value: appointments.length, color: 'text-teal-500' },
              { label: 'Total Invoiced', value: formatCurrency(invoices.reduce((s, i) => s + i.totalAmount, 0)), color: 'text-green-500' },
              { label: 'Outstanding', value: formatCurrency(invoices.filter(i => i.paymentStatus !== 'Paid').reduce((s, i) => s + i.balanceDue, 0)), color: 'text-red-500' },
            ].map((s) => (
              <div key={s.label} className="glass-card p-4 text-center">
                <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Consultations Tab */}
      {tab === 'consultations' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {consultations.length === 0 ? (
            <div className="glass-card py-12 text-center text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No consultations on record</p>
            </div>
          ) : consultations.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="glass-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs badge-gray">{c.recordNumber}</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{formatDate(c.visitDate, 'long')}</span>
                    {c.isSigned && <span className="badge-green text-xs">✓ Signed</span>}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">Dr. {c.doctorName}{c.specialization ? ` · ${c.specialization}` : ''}</p>
                  {c.chiefComplaint && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 italic">"{c.chiefComplaint}"</p>
                  )}
                  {c.diagnosis && c.diagnosis.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {c.diagnosis.map((d, idx) => <span key={idx} className="badge-blue text-xs">{d}</span>)}
                    </div>
                  )}
                </div>
                {c.bpSystolic && (
                  <div className="text-right text-xs text-slate-400 shrink-0 space-y-1">
                    <p>BP: <span className="font-semibold text-slate-700 dark:text-slate-300">{c.bpSystolic}/{c.bpDiastolic}</span></p>
                    {c.temperature && <p>Temp: <span className="font-semibold">{c.temperature}°C</span></p>}
                    {c.heartRate && <p>HR: <span className="font-semibold">{c.heartRate} bpm</span></p>}
                  </div>
                )}
              </div>
              {c.prescriptions && c.prescriptions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <p className="text-xs text-slate-400 font-medium mb-2">Prescriptions ({c.prescriptions.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {c.prescriptions.map((p, idx) => (
                      <span key={idx} className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-lg">
                        {p.medicationName} {p.dosage ? `· ${p.dosage}` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Dental Tab */}
      {tab === 'dental' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {dentalLoading ? (
            <div className="glass-card py-12 text-center text-slate-400">
              <p>Loading dental records...</p>
            </div>
          ) : (
            <div className="glass-card p-6">
              <DentalRecords
                initialChart={dentalChart}
                onSave={handleSaveDental}
                readOnly={savingDental}
              />
            </div>
          )}
        </motion.div>
      )}

      {/* Appointments Tab */}
      {tab === 'appointments' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {appointments.length === 0 ? (
            <div className="glass-card py-12 text-center text-slate-400">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No appointments on record</p>
            </div>
          ) : appointments.map((a, i) => (
            <motion.div key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
              className="glass-card p-4 flex items-center gap-4">
              <div className="text-center shrink-0 w-14">
                <p className="text-lg font-bold text-slate-900 dark:text-white">{a.timeSlot}</p>
                <p className="text-xs text-slate-400">{formatDate(a.appointmentDate)}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{a.type}</p>
                <p className="text-xs text-slate-500">{a.doctorName}</p>
                {a.chiefComplaint && <p className="text-xs text-slate-400 italic mt-0.5">"{a.chiefComplaint}"</p>}
              </div>
              <span className={getStatusColor(a.status)}>{a.status}</span>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Billing Tab */}
      {tab === 'billing' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {invoices.length === 0 ? (
            <div className="glass-card py-12 text-center text-slate-400">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No invoices on record</p>
            </div>
          ) : invoices.map((inv, i) => (
            <motion.div key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
              className="glass-card p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300">{inv.invoiceNumber}</span>
                  <span className={getStatusColor(inv.paymentStatus)}>{inv.paymentStatus}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{formatDate(inv.invoiceDate)} · {inv.paymentMethod}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-base font-bold text-slate-900 dark:text-white">{formatCurrency(inv.totalAmount)}</p>
                {inv.balanceDue > 0 && (
                  <p className="text-xs text-red-500 font-medium">Due: {formatCurrency(inv.balanceDue)}</p>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
