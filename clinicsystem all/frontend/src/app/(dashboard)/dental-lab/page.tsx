'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FlaskConical, Plus, CheckCircle2, Clock, Truck, ShieldCheck,
  Search, Filter, ChevronRight, X, DollarSign, Calendar, Eye
} from 'lucide-react'
import api from '@/lib/api'

interface LabOrder {
  id: string
  lab_name: string
  patient_name: string
  doctor_name: string
  order_type: string
  tooth_numbers?: string
  shade_guide?: string
  status: string
  sent_date?: string
  due_date?: string
  delivered_date?: string
  lab_cost: number
  payment_status: string
  instructions?: string
  created_at: string
}

const LAB_STATUSES = [
  'Pending',
  'Sent to Laboratory',
  'In Production',
  'Quality Check',
  'Ready',
  'Delivered',
  'Rejected'
]

const SHADE_GUIDE_OPTIONS = ['A1', 'A2', 'A3', 'A3.5', 'A4', 'B1', 'B2', 'B3', 'B4', 'C1', 'C2', 'C3', 'C4', 'D2', 'D3', 'D4', 'BL1 (Bleach)', 'BL2', 'BL3', 'BL4']

const ORDER_TYPES = [
  'Zirconia Crown',
  'PFM Crown (Porcelain Fused to Metal)',
  'Emax Aesthetic Crown',
  'Full Dental Bridge',
  'Complete Upper Denture',
  'Complete Lower Denture',
  'Flexible Partial Denture',
  'Cast Metal Partial Denture',
  'Custom Implant Abutment + Crown',
  'Orthodontic Hawley Retainer',
  'Clear Essix Retainer',
  'Nightguard / Occlusal Splint',
  'Space Maintainer'
]

export default function DentalLabPage() {
  const [orders, setOrders] = useState<LabOrder[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [showModal, setShowModal] = useState(false)

  // Form states
  const [patientId, setPatientId] = useState('')
  const [labName, setLabName] = useState('Apex Dental Ceramics Laboratory')
  const [orderType, setOrderType] = useState(ORDER_TYPES[0])
  const [toothNumbers, setToothNumbers] = useState('16, 26')
  const [shadeGuide, setShadeGuide] = useState('A2')
  const [dueDate, setDueDate] = useState('')
  const [labCost, setLabCost] = useState('65')
  const [instructions, setInstructions] = useState('')

  const loadOrders = async () => {
    setLoading(true)
    try {
      const [ordRes, patRes] = await Promise.all([
        api.get('/dental/lab-orders'),
        api.get('/patients', { params: { limit: 100 } })
      ])
      setOrders(ordRes.data || [])
      setPatients(patRes.data?.patients || [])
    } catch (err) {
      console.error('Failed to load lab orders:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadOrders() }, [])

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientId || !labName || !orderType) {
      alert('Please fill all required fields')
      return
    }

    try {
      await api.post('/dental/lab-orders', {
        patientId,
        labName,
        orderType,
        toothNumbers,
        shadeGuide,
        dueDate,
        labCost: Number(labCost) || 0,
        instructions
      })
      setShowModal(false)
      loadOrders()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit lab order')
    }
  }

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      await api.put(`/dental/lab-orders/${orderId}`, {
        status,
        deliveredDate: status === 'Delivered' ? new Date().toISOString().split('T')[0] : null
      })
      loadOrders()
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  const filteredOrders = filterStatus === 'ALL' ? orders : orders.filter(o => o.status === filterStatus)

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FlaskConical className="text-blue-600" size={24} />
            Dental Laboratory & Prosthetics Management
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Crown, bridge, denture, and implant tracking with external dental technicians
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-600/20 transition-all"
        >
          <Plus size={16} /> New Lab Order
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {['ALL', ...LAB_STATUSES].map(status => (
          <button
            key={status}
            type="button"
            onClick={() => setFilterStatus(status)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterStatus === status
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
            }`}
          >
            {status} ({status === 'ALL' ? orders.length : orders.filter(o => o.status === status).length})
          </button>
        ))}
      </div>

      {/* Lab Orders Table / Cards */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-16 text-center text-xs text-slate-400">Loading lab cases...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <FlaskConical className="mx-auto text-slate-300 dark:text-slate-700" size={40} />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No laboratory orders found</p>
            <p className="text-xs text-slate-400">Click "New Lab Order" to submit a crown, bridge, or denture request.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="p-4">Case # / Date</th>
                  <th className="p-4">Patient</th>
                  <th className="p-4">Laboratory</th>
                  <th className="p-4">Prosthetic Unit</th>
                  <th className="p-4">Tooth & Shade</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4">Cost</th>
                  <th className="p-4">Status & Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                      #{order.id.slice(0, 8)}
                      <p className="text-[10px] text-slate-400 font-normal">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="p-4 font-bold text-slate-800 dark:text-slate-200">
                      {order.patient_name}
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300">
                      {order.lab_name}
                    </td>
                    <td className="p-4 font-black text-blue-600">
                      {order.order_type}
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-slate-700 dark:text-slate-300">#{order.tooth_numbers || 'N/A'}</span>
                      {order.shade_guide && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold text-[10px]">
                          Shade {order.shade_guide}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">
                      {order.due_date ? new Date(order.due_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                      ${Number(order.lab_cost).toFixed(2)}
                    </td>
                    <td className="p-4">
                      <select
                        value={order.status}
                        onChange={e => handleUpdateStatus(order.id, e.target.value)}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-800 dark:text-slate-200"
                      >
                        {LAB_STATUSES.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Lab Order Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FlaskConical className="text-blue-600" size={18} /> Submit Dental Lab Prescription
                </h3>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateOrder} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1 block">Patient</label>
                    <select
                      required
                      value={patientId}
                      onChange={e => setPatientId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                    >
                      <option value="">Select Patient...</option>
                      {patients.map(p => (
                        <option key={p.id} value={p.id}>{p.fullName || p.full_name} ({p.patientNumber || p.patient_number})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1 block">Laboratory Name</label>
                    <input
                      type="text"
                      required
                      value={labName}
                      onChange={e => setLabName(e.target.value)}
                      placeholder="e.g. Apex Dental Lab"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1 block">Prosthetic Order Type</label>
                    <select
                      value={orderType}
                      onChange={e => setOrderType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                    >
                      {ORDER_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1 block">Tooth Units (FDI)</label>
                    <input
                      type="text"
                      placeholder="e.g. 11, 21, 22"
                      value={toothNumbers}
                      onChange={e => setToothNumbers(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1 block">VITA Shade Guide</label>
                    <select
                      value={shadeGuide}
                      onChange={e => setShadeGuide(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                    >
                      {SHADE_GUIDE_OPTIONS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1 block">Delivery Due Date</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1 block">Estimated Lab Cost $</label>
                    <input
                      type="number"
                      value={labCost}
                      onChange={e => setLabCost(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1 block">Technician Prescription Instructions</label>
                  <textarea
                    rows={2}
                    value={instructions}
                    onChange={e => setInstructions(e.target.value)}
                    placeholder="Specific margin design (chamfer), occlusal clearance, characterization..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
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
                    Dispatch Lab Order
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

