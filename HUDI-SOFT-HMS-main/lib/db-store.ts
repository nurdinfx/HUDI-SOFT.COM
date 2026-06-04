"use client"

// Simulated database using localStorage for client-side persistence and state sync

export interface User {
  id: string; name: string; email: string; password?: string; role: string; status: "Active" | "Inactive";
}

export interface Patient {
  id: string; name: string; age: number; gender: string;
  phone: string; bloodType: string; lastVisit: string;
}

export interface Appointment {
  id: string; patientId: string; patientName: string; doctorName: string;
  date: string; time: string; reason: string;
  status: "Scheduled" | "Waiting" | "In Consultation" | "Completed" | "Cancelled";
  urgent?: boolean;
}

export interface EHRRecord {
  id: string; patientId: string; date: string; doctor: string;
  type: string; diagnosis: string; notes: string; attachments?: string[];
}

export interface Medication {
  id: string; name: string; category: string; stock: number;
  minStock: number; price: number;
  status: "In Stock" | "Low Stock" | "Out of Stock";
}

export interface Invoice {
  id: string; patientName: string; date: string; amount: number;
  status: "Paid" | "Pending" | "Refunded"; method: string;
}

export interface LabTest {
  id: string; patientName: string; testName: string;
  status: "Pending" | "Processing" | "Completed"; date: string; resultUrl?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  type: "Individual" | "Corporate" | "Insurance";
  totalBilled: number;
  totalPaid: number;
  creditBalance: number;   // outstanding loan/credit
  preferredPayment: string;
  joinDate: string;
  status: "Active" | "Suspended";
}

export interface Loan {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  paid: number;
  remaining: number;
  dueDate: string;
  method: string;
  status: "Active" | "Settled" | "Overdue";
  notes: string;
  date: string;
}

// ─── Seed Data ───────────────────────────────────────────────────────────────

const initialUsers: User[] = [
  { id: "USR-001", name: "Dr. Sarah Jenkins",  email: "sarah@detailcare.com",    password: "password123", role: "Chief Medical Officer (Doctor)", status: "Active" },
  { id: "USR-002", name: "Ahmed Farah",         email: "ahmed.farah@detailcare.com", password: "password123", role: "System Administrator",       status: "Active" },
  { id: "USR-003", name: "Hassan Ali",          email: "hassan.ali@detailcare.com",  password: "password123", role: "Clinical Pharmacist",        status: "Active" },
  { id: "USR-004", name: "Fartun Mohamed",      email: "fartun.m@detailcare.com",    password: "password123", role: "Lab Technician",             status: "Active" },
  { id: "USR-005", name: "Mohamud Omar",        email: "mohamud.o@detailcare.com",   password: "password123", role: "Financial Accountant",       status: "Active" },
]

const initialPatients: Patient[] = [
  { id: "PT-092", name: "Ahmed Ali",    age: 34, gender: "Male",   phone: "+252 61 1234567", bloodType: "O+", lastVisit: "2026-05-24" },
  { id: "PT-144", name: "Fatima Noor", age: 28, gender: "Female", phone: "+252 61 7654321", bloodType: "A-", lastVisit: "2026-05-22" },
  { id: "PT-021", name: "Omar Jamal",  age: 45, gender: "Male",   phone: "+252 61 9876543", bloodType: "B+", lastVisit: "2026-04-15" },
  { id: "PT-305", name: "Aisha Hassan",age: 62, gender: "Female", phone: "+252 61 1122334", bloodType: "O-", lastVisit: "2026-05-24" },
]

const initialAppointments: Appointment[] = [
  { id: "APT-101", patientId: "PT-092", patientName: "Ahmed Ali",    doctorName: "Dr. Sarah Jenkins", date: "2026-05-24", time: "10:30 AM", reason: "Fever and cold checkup",    status: "Waiting",         urgent: true },
  { id: "APT-102", patientId: "PT-144", patientName: "Fatima Noor", doctorName: "Dr. Sarah Jenkins", date: "2026-05-24", time: "10:45 AM", reason: "Consultation follow up",    status: "In Consultation" },
  { id: "APT-103", patientId: "PT-021", patientName: "Omar Jamal",  doctorName: "Dr. Sarah Jenkins", date: "2026-05-24", time: "11:00 AM", reason: "Blood pressure review",     status: "Scheduled" },
]

const initialEHR: EHRRecord[] = [
  { id: "EHR-001", patientId: "PT-092", date: "2026-05-24", doctor: "Dr. Sarah Jenkins", type: "Consultation",    diagnosis: "Acute Bronchitis",             notes: "Patient presents with persistent cough and mild fever for 3 days. Prescribed antibiotics." },
  { id: "EHR-002", patientId: "PT-144", date: "2026-05-20", doctor: "Lab Department",    type: "Laboratory Result", diagnosis: "Complete Blood Count (CBC)", notes: "WBC slightly elevated. All other parameters normal.", attachments: ["Lab_Result.pdf"] },
]

const initialMedications: Medication[] = [
  { id: "MED-001", name: "Amoxicillin 500mg", category: "Antibiotics",    stock: 1240, minStock: 200, price: 12.00, status: "In Stock"     },
  { id: "MED-002", name: "Ibuprofen 400mg",   category: "Painkillers",    stock: 85,   minStock: 100, price: 8.50,  status: "Low Stock"    },
  { id: "MED-003", name: "Lisinopril 10mg",   category: "Cardiovascular", stock: 450,  minStock: 150, price: 24.00, status: "In Stock"     },
  { id: "MED-004", name: "Metformin 500mg",   category: "Antidiabetic",   stock: 0,    minStock: 300, price: 15.00, status: "Out of Stock" },
]

const initialInvoices: Invoice[] = [
  { id: "INV-2026-089", patientName: "Ahmed Ali",    date: "2026-05-24", amount: 145.00, status: "Paid",    method: "Zaad"   },
  { id: "INV-2026-088", patientName: "Fatima Noor",  date: "2026-05-24", amount: 85.00,  status: "Pending", method: "Credit" },
  { id: "INV-2026-087", patientName: "Omar Jamal",   date: "2026-05-23", amount: 210.00, status: "Paid",    method: "Sahal"  },
  { id: "INV-2026-086", patientName: "Aisha Hassan", date: "2026-05-22", amount: 320.00, status: "Paid",    method: "Edahab" },
]

const initialLabs: LabTest[] = [
  { id: "LAB-1042", patientName: "Ahmed Ali",   testName: "Complete Blood Count (CBC)", status: "Completed",  date: "2026-05-24", resultUrl: "Lab_Result.pdf" },
  { id: "LAB-1043", patientName: "Fatima Noor", testName: "Lipid Profile",              status: "Pending",    date: "2026-05-24" },
  { id: "LAB-1044", patientName: "Omar Jamal",  testName: "Urinalysis",                 status: "Processing", date: "2026-05-24" },
]

const initialCustomers: Customer[] = [
  { id: "CUS-001", name: "Ahmed Ali",       phone: "+252 61 1234567", email: "ahmed@gmail.com",  address: "Hodan, Mogadishu", type: "Individual", totalBilled: 1450, totalPaid: 1305, creditBalance: 145, preferredPayment: "Zaad",   joinDate: "2025-01-10", status: "Active" },
  { id: "CUS-002", name: "Fatima Noor",     phone: "+252 61 7654321", email: "fatima@gmail.com", address: "Wadajir, Mogadishu", type: "Individual", totalBilled: 850, totalPaid: 765, creditBalance: 85, preferredPayment: "Sahal",  joinDate: "2025-03-22", status: "Active" },
  { id: "CUS-003", name: "Daljir Hospital", phone: "+252 61 9999990", email: "billing@daljir.com",address: "KM4, Mogadishu",  type: "Corporate",  totalBilled: 12000, totalPaid: 12000, creditBalance: 0, preferredPayment: "Edahab", joinDate: "2024-06-01", status: "Active" },
  { id: "CUS-004", name: "Aisha Hassan",    phone: "+252 61 1122334", email: "",                  address: "Xamar Weyne",     type: "Individual", totalBilled: 320, totalPaid: 320, creditBalance: 0,   preferredPayment: "MyCash", joinDate: "2026-02-14", status: "Active" },
]

const initialLoans: Loan[] = [
  { id: "LN-001", customerId: "CUS-001", customerName: "Ahmed Ali",   amount: 145, paid: 0,   remaining: 145, dueDate: "2026-06-10", method: "Zaad",  status: "Active",  notes: "Balance from INV-2026-089", date: "2026-05-24" },
  { id: "LN-002", customerId: "CUS-002", customerName: "Fatima Noor", amount: 85,  paid: 40,  remaining: 45,  dueDate: "2026-06-05", method: "Sahal", status: "Active",  notes: "Partial payment received",  date: "2026-05-22" },
]

// ─── Store Helpers ────────────────────────────────────────────────────────────

function getStore<T>(key: string, initialData: T[]): T[] {
  if (typeof window === "undefined") return initialData
  const stored = localStorage.getItem(key)
  if (!stored) { localStorage.setItem(key, JSON.stringify(initialData)); return initialData }
  return JSON.parse(stored)
}

function setStore<T>(key: string, data: T[]): void {
  if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(data))
}

export const db = {
  getUsers:       () => getStore<User>      ("dc_users",       initialUsers),
  saveUsers:      (d: User[])       => setStore("dc_users",       d),

  getPatients:    () => getStore<Patient>   ("dc_patients",    initialPatients),
  savePatients:   (d: Patient[])    => setStore("dc_patients",    d),

  getAppointments:  () => getStore<Appointment>("dc_appointments", initialAppointments),
  saveAppointments: (d: Appointment[]) => setStore("dc_appointments", d),

  getEHR:         () => getStore<EHRRecord> ("dc_ehr",         initialEHR),
  saveEHR:        (d: EHRRecord[])  => setStore("dc_ehr",         d),

  getMedications: () => getStore<Medication>("dc_medications", initialMedications),
  saveMedications:(d: Medication[]) => setStore("dc_medications", d),

  getInvoices:    () => getStore<Invoice>   ("dc_invoices",    initialInvoices),
  saveInvoices:   (d: Invoice[])    => setStore("dc_invoices",    d),

  getLabs:        () => getStore<LabTest>   ("dc_labs",        initialLabs),
  saveLabs:       (d: LabTest[])    => setStore("dc_labs",        d),

  getCustomers:   () => getStore<Customer>  ("dc_customers",   initialCustomers),
  saveCustomers:  (d: Customer[])   => setStore("dc_customers",   d),

  getLoans:       () => getStore<Loan>      ("dc_loans",       initialLoans),
  saveLoans:      (d: Loan[])       => setStore("dc_loans",       d),
}
