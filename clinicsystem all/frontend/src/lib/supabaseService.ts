/**
 * supabaseService.ts
 * Centralised data-access layer for the Datel Clinic System.
 * All queries go through the Express backend API (which uses service_role key server-side),
 * falling back to direct Supabase calls for lightweight reads when available.
 *
 * In production the app calls: NEXT_PUBLIC_API_URL (Express + pg pool)
 * This service wraps axios calls to remain compatible with the existing backend
 * while enabling TanStack Query integration.
 */

import api from './api'

// ── Patients ──────────────────────────────────────────────────────────────────
export const patientService = {
  getAll: async (params?: { search?: string; page?: number; limit?: number }) => {
    const { data } = await api.get('/patients', { params })
    return data
  },
  getById: async (id: string) => {
    const { data } = await api.get(`/patients/${id}`)
    return data
  },
  create: async (payload: Record<string, unknown>) => {
    const { data } = await api.post('/patients', payload)
    return data
  },
  update: async (id: string, payload: Record<string, unknown>) => {
    const { data } = await api.put(`/patients/${id}`, payload)
    return data
  },
  delete: async (id: string) => {
    const { data } = await api.delete(`/patients/${id}`)
    return data
  },
}

// ── Appointments ──────────────────────────────────────────────────────────────
export const appointmentService = {
  getAll: async (params?: { date?: string; doctorId?: string; status?: string; page?: number }) => {
    const { data } = await api.get('/appointments', { params })
    return data
  },
  getToday: async () => {
    const { data } = await api.get('/appointments/today')
    return data
  },
  getById: async (id: string) => {
    const { data } = await api.get(`/appointments/${id}`)
    return data
  },
  create: async (payload: Record<string, unknown>) => {
    const { data } = await api.post('/appointments', payload)
    return data
  },
  update: async (id: string, payload: Record<string, unknown>) => {
    const { data } = await api.put(`/appointments/${id}`, payload)
    return data
  },
  cancel: async (id: string, reason?: string) => {
    const { data } = await api.put(`/appointments/${id}`, { status: 'Cancelled', cancelReason: reason })
    return data
  },
}

// ── Consultations ─────────────────────────────────────────────────────────────
export const consultationService = {
  getAll: async (params?: { patientId?: string; doctorId?: string; page?: number }) => {
    const { data } = await api.get('/consultations', { params })
    return data
  },
  getById: async (id: string) => {
    const { data } = await api.get(`/consultations/${id}`)
    return data
  },
  create: async (payload: Record<string, unknown>) => {
    const { data } = await api.post('/consultations', payload)
    return data
  },
  update: async (id: string, payload: Record<string, unknown>) => {
    const { data } = await api.put(`/consultations/${id}`, payload)
    return data
  },
  sign: async (id: string) => {
    const { data } = await api.put(`/consultations/${id}/sign`, {})
    return data
  },
}

// ── Dental Records ────────────────────────────────────────────────────────────
export const dentalService = {
  getByPatient: async (patientId: string) => {
    const { data } = await api.get(`/dental`, { params: { patientId } })
    return data
  },
  getById: async (id: string) => {
    const { data } = await api.get(`/dental/${id}`)
    return data
  },
  create: async (payload: Record<string, unknown>) => {
    const { data } = await api.post('/dental', payload)
    return data
  },
  update: async (id: string, payload: Record<string, unknown>) => {
    const { data } = await api.put(`/dental/${id}`, payload)
    return data
  },
}

// ── Pharmacy ──────────────────────────────────────────────────────────────────
export const pharmacyService = {
  getMedications: async (params?: { search?: string; lowStock?: boolean }) => {
    const { data } = await api.get('/pharmacy/medications', { params })
    return data
  },
  getMedicationById: async (id: string) => {
    const { data } = await api.get(`/pharmacy/medications/${id}`)
    return data
  },
  createMedication: async (payload: Record<string, unknown>) => {
    const { data } = await api.post('/pharmacy/medications', payload)
    return data
  },
  updateMedication: async (id: string, payload: Record<string, unknown>) => {
    const { data } = await api.put(`/pharmacy/medications/${id}`, payload)
    return data
  },
  getSales: async (params?: { page?: number; date?: string }) => {
    const { data } = await api.get('/pharmacy/sales', { params })
    return data
  },
  createSale: async (payload: Record<string, unknown>) => {
    const { data } = await api.post('/pharmacy/sales', payload)
    return data
  },
}

// ── Laboratory ────────────────────────────────────────────────────────────────
export const labService = {
  getRequests: async (params?: { status?: string; patientId?: string; page?: number }) => {
    const { data } = await api.get('/lab/requests', { params })
    return data
  },
  getRequestById: async (id: string) => {
    const { data } = await api.get(`/lab/requests/${id}`)
    return data
  },
  createRequest: async (payload: Record<string, unknown>) => {
    const { data } = await api.post('/lab/requests', payload)
    return data
  },
  updateRequest: async (id: string, payload: Record<string, unknown>) => {
    const { data } = await api.put(`/lab/requests/${id}`, payload)
    return data
  },
  addResult: async (requestId: string, payload: Record<string, unknown>) => {
    const { data } = await api.post(`/lab/requests/${requestId}/results`, payload)
    return data
  },
}

// ── Billing ───────────────────────────────────────────────────────────────────
export const billingService = {
  getInvoices: async (params?: { status?: string; patientId?: string; page?: number }) => {
    const { data } = await api.get('/invoices', { params })
    return data
  },
  getInvoiceById: async (id: string) => {
    const { data } = await api.get(`/invoices/${id}`)
    return data
  },
  create: async (payload: Record<string, unknown>) => {
    const { data } = await api.post('/invoices', payload)
    return data
  },
  update: async (id: string, payload: Record<string, unknown>) => {
    const { data } = await api.put(`/invoices/${id}`, payload)
    return data
  },
  markPaid: async (id: string, paidAmount: number, paymentMethod: string) => {
    const { data } = await api.put(`/invoices/${id}`, {
      paymentStatus: 'Paid',
      paidAmount,
      paymentMethod,
    })
    return data
  },
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardService = {
  getStats: async () => {
    const { data } = await api.get('/dashboard/stats')
    return data
  },
  getRecentAppointments: async () => {
    const { data } = await api.get('/dashboard/recent-appointments')
    return data
  },
  getMonthlyChart: async () => {
    const { data } = await api.get('/dashboard/monthly-chart')
    return data
  },
}

// ── Clinic ────────────────────────────────────────────────────────────────────
export const clinicService = {
  get: async () => {
    const { data } = await api.get('/clinic')
    return data
  },
  update: async (payload: Record<string, unknown>) => {
    const { data } = await api.put('/clinic', payload)
    return data
  },
  getSubscription: async () => {
    const { data } = await api.get('/clinic/subscription')
    return data
  },
  getStaff: async () => {
    const { data } = await api.get('/clinic/staff')
    return data
  },
  createStaff: async (payload: Record<string, unknown>) => {
    const { data } = await api.post('/clinic/staff', payload)
    return data
  },
  updateStaff: async (id: string, payload: Record<string, unknown>) => {
    const { data } = await api.put(`/clinic/staff/${id}`, payload)
    return data
  },
  deleteStaff: async (id: string) => {
    const { data } = await api.delete(`/clinic/staff/${id}`)
    return data
  },
}

// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationService = {
  getAll: async () => {
    const { data } = await api.get('/notifications')
    return data
  },
  markRead: async (id: string) => {
    const { data } = await api.put(`/notifications/${id}/read`, {})
    return data
  },
  markAllRead: async () => {
    const { data } = await api.put('/notifications/read-all', {})
    return data
  },
}
