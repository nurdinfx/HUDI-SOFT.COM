export interface User {
  id: string
  fullName: string
  email: string
  role: UserRole
  clinicId: string
  clinicName: string
  clinicLogo?: string
  specialization?: string
  subscriptionStatus: SubscriptionStatus
  subscriptionPlan: SubscriptionPlan
  subscriptionExpiry: string
  daysRemaining: number
  token: string
}

export type UserRole =
  | 'super_admin'
  | 'clinic_manager'
  | 'doctor'
  | 'receptionist'
  | 'pharmacist'
  | 'lab_staff'
  | 'accountant'

export type SubscriptionStatus = 'Active' | 'Trial' | 'Expired' | 'Suspended'
export type SubscriptionPlan = 'Trial' | 'Monthly' | 'Quarterly' | 'SemiAnnual' | 'Annual' | 'Lifetime'

export interface Patient {
  id: string
  clinicId: string
  patientNumber: string
  fullName: string
  dateOfBirth?: string
  gender: 'Male' | 'Female' | 'Other'
  phone?: string
  email?: string
  address?: string
  city?: string
  nationalId?: string
  bloodType?: string
  emergencyName?: string
  emergencyPhone?: string
  emergencyRelation?: string
  allergies?: string[]
  chronicConditions?: string[]
  insuranceProvider?: string
  insurancePolicyNo?: string
  notes?: string
  isActive: boolean
  registeredByName?: string
  createdAt: string
}

export interface Appointment {
  id: string
  clinicId: string
  patientId: string
  doctorId: string
  appointmentNumber: string
  appointmentDate: string
  timeSlot: string
  durationMinutes: number
  type: AppointmentType
  status: AppointmentStatus
  chiefComplaint?: string
  notes?: string
  cancelReason?: string
  patientName?: string
  patientNumber?: string
  patientPhone?: string
  gender?: string
  doctorName?: string
  specialization?: string
  createdAt: string
}

export type AppointmentType = 'Consultation' | 'Follow-Up' | 'Check-Up' | 'Procedure' | 'Emergency' | 'Vaccination'
export type AppointmentStatus = 'Scheduled' | 'Confirmed' | 'Checked-In' | 'In Progress' | 'Completed' | 'Cancelled' | 'No Show'

export interface TodaySummary {
  total: number
  scheduled: number
  confirmed: number
  checkedIn: number
  inProgress: number
  completed: number
  cancelled: number
  noShow: number
  appointments: Appointment[]
}

export interface ConsultationNote {
  id: string
  clinicId: string
  appointmentId?: string
  patientId: string
  doctorId: string
  recordNumber: string
  visitDate: string
  chiefComplaint?: string
  historyOfIllness?: string
  physicalExamination?: string
  bpSystolic?: number
  bpDiastolic?: number
  heartRate?: number
  temperature?: number
  respiratoryRate?: number
  oxygenSaturation?: number
  weightKg?: number
  heightCm?: number
  bmi?: number
  bloodSugar?: number
  diagnosis?: string[]
  diagnosisNotes?: string
  treatmentPlan?: string
  followUpDate?: string
  followUpNotes?: string
  referredTo?: string
  referralReason?: string
  notes?: string
  isSigned: boolean
  signedAt?: string
  patientName?: string
  patientNumber?: string
  doctorName?: string
  specialization?: string
  prescriptions?: Prescription[]
}

export interface Prescription {
  id: string
  consultationId: string
  patientId: string
  doctorId: string
  medicationName: string
  dosage?: string
  frequency?: string
  duration?: string
  instructions?: string
  isDispensed: boolean
}

export interface Medication {
  id: string
  clinicId: string
  name: string
  genericName?: string
  category?: string
  dosageForm?: string
  strength?: string
  barcode?: string
  stockQuantity: number
  reorderLevel: number
  unitPrice: number
  sellingPrice: number
  expiryDate?: string
  manufacturer?: string
  supplier?: string
  storageLocation?: string
  isActive: boolean
}

export interface Invoice {
  id: string
  clinicId: string
  patientId: string
  invoiceNumber: string
  invoiceDate: string
  dueDate?: string
  subtotal: number
  discountPercent: number
  discountAmount: number
  taxPercent: number
  taxAmount: number
  totalAmount: number
  paidAmount: number
  balanceDue: number
  paymentMethod: string
  paymentStatus: PaymentStatus
  paidAt?: string
  notes?: string
  patientName?: string
  patientNumber?: string
  items?: InvoiceItem[]
}

export type PaymentStatus = 'Unpaid' | 'Partial' | 'Paid' | 'Refunded' | 'Waived'

export interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface LabRequest {
  id: string
  clinicId: string
  patientId: string
  doctorId: string
  requestNumber: string
  testName: string
  testCategory?: string
  priority: 'Routine' | 'Urgent' | 'STAT'
  status: string
  requestedDate: string
  sampleCollected?: string
  notes?: string
  patientName?: string
  patientNumber?: string
  doctorName?: string
}

export interface DashboardStats {
  totalPatients: number
  newPatientsThisMonth: number
  todayAppointments: number
  completedTodayAppointments: number
  monthlyRevenue: number
  dailyRevenue: number
  unpaidInvoices: number
  pendingLabRequests: number
  lowStockMedications: number
  pharmacySalesThisMonth: number
}

export interface ClinicUser {
  id: string
  clinicId: string
  fullName: string
  email: string
  role: UserRole
  phone?: string
  specialization?: string
  avatarUrl?: string
  isActive: boolean
  lastLogin?: string
  createdAt: string
}

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pages: number
}
