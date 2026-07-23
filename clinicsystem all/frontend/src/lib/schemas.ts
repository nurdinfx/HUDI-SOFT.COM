import { z } from 'zod'

// ── Patient Schema ─────────────────────────────────────────────────────────────
export const patientSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['Male', 'Female', 'Other']),
  phone: z.string().min(7, 'Enter a valid phone number').optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  nationalId: z.string().optional(),
  bloodType: z.enum(['A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown']).optional(),
  emergencyName: z.string().optional(),
  emergencyPhone: z.string().optional(),
  emergencyRelation: z.string().optional(),
  allergies: z.string().optional(), // comma-separated
  chronicConditions: z.string().optional(), // comma-separated
  insuranceProvider: z.string().optional(),
  insurancePolicyNo: z.string().optional(),
  notes: z.string().optional(),
})

export type PatientFormData = z.infer<typeof patientSchema>

// ── Appointment Schema ─────────────────────────────────────────────────────────
export const appointmentSchema = z.object({
  patientId: z.string().uuid('Select a patient'),
  doctorId: z.string().uuid('Select a doctor'),
  appointmentDate: z.string().min(1, 'Select a date'),
  timeSlot: z.string().min(1, 'Select a time'),
  durationMinutes: z.coerce.number().min(5).max(480).default(30),
  type: z.enum(['Consultation','Follow-Up','Check-Up','Procedure','Emergency','Vaccination','Dental']),
  chiefComplaint: z.string().optional(),
  notes: z.string().optional(),
})

export type AppointmentFormData = z.infer<typeof appointmentSchema>

// ── Consultation Note Schema ────────────────────────────────────────────────────
export const consultationSchema = z.object({
  patientId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  visitDate: z.string().min(1, 'Select a visit date'),
  chiefComplaint: z.string().optional(),
  historyOfIllness: z.string().optional(),
  bpSystolic: z.coerce.number().min(40).max(300).optional(),
  bpDiastolic: z.coerce.number().min(20).max(200).optional(),
  heartRate: z.coerce.number().min(20).max(300).optional(),
  temperature: z.coerce.number().min(30).max(45).optional(),
  weightKg: z.coerce.number().min(0).max(500).optional(),
  heightCm: z.coerce.number().min(0).max(300).optional(),
  oxygenSaturation: z.coerce.number().min(0).max(100).optional(),
  bloodSugar: z.coerce.number().min(0).max(1000).optional(),
  physicalExamination: z.string().optional(),
  diagnosis: z.string().optional(), // comma-separated ICD
  diagnosisNotes: z.string().optional(),
  treatmentPlan: z.string().optional(),
  followUpDate: z.string().optional(),
  followUpNotes: z.string().optional(),
  referredTo: z.string().optional(),
  referralReason: z.string().optional(),
  notes: z.string().optional(),
})

export type ConsultationFormData = z.infer<typeof consultationSchema>

// ── Dental Record Schema ────────────────────────────────────────────────────────
export const dentalRecordSchema = z.object({
  patientId: z.string().uuid(),
  consultationId: z.string().uuid().optional(),
  recordDate: z.string().min(1, 'Select a date'),
  chiefComplaint: z.string().optional(),
  oralHygiene: z.enum(['Excellent','Good','Fair','Poor']).default('Fair'),
  toothChart: z.array(z.object({
    toothNumber: z.number().min(1).max(52),
    condition: z.string(),
    treatment: z.string().optional(),
    notes: z.string().optional(),
  })).default([]),
  radiographNotes: z.string().optional(),
  treatmentPerformed: z.string().optional(),
  nextVisitDate: z.string().optional(),
  nextVisitNotes: z.string().optional(),
})

export type DentalRecordFormData = z.infer<typeof dentalRecordSchema>

// ── Medication Schema ─────────────────────────────────────────────────────────
export const medicationSchema = z.object({
  name: z.string().min(1, 'Medication name is required'),
  genericName: z.string().optional(),
  category: z.string().optional(),
  dosageForm: z.string().optional(),
  strength: z.string().optional(),
  barcode: z.string().optional(),
  stockQuantity: z.coerce.number().min(0).default(0),
  reorderLevel: z.coerce.number().min(0).default(10),
  unitPrice: z.coerce.number().min(0).default(0),
  sellingPrice: z.coerce.number().min(0).default(0),
  expiryDate: z.string().optional(),
  manufacturer: z.string().optional(),
  supplier: z.string().optional(),
  storageLocation: z.string().optional(),
})

export type MedicationFormData = z.infer<typeof medicationSchema>

// ── Invoice Schema ─────────────────────────────────────────────────────────────
export const invoiceSchema = z.object({
  patientId: z.string().uuid('Select a patient'),
  appointmentId: z.string().uuid().optional(),
  consultationId: z.string().uuid().optional(),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  dueDate: z.string().optional(),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  taxPercent: z.coerce.number().min(0).max(100).default(0),
  paymentMethod: z.enum(['Cash','EVC Plus','Zaad','Sahal','Card','Insurance','Other']),
  paymentStatus: z.enum(['Unpaid','Partial','Paid','Refunded','Waived']).default('Unpaid'),
  notes: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1, 'Item description required'),
    quantity: z.coerce.number().min(1).default(1),
    unitPrice: z.coerce.number().min(0),
  })).min(1, 'At least one item is required'),
})

export type InvoiceFormData = z.infer<typeof invoiceSchema>

// ── Staff Schema ───────────────────────────────────────────────────────────────
export const staffSchema = z.object({
  fullName: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  role: z.enum(['super_admin','clinic_manager','doctor','receptionist','pharmacist','lab_staff','accountant']),
  phone: z.string().optional(),
  specialization: z.string().optional(),
})

export type StaffFormData = z.infer<typeof staffSchema>
