"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { patientsApi, appointmentsApi, pharmacyApi, laboratoryApi, billingApi } from "@/lib/api"
import { PatientProfile } from "@/components/patients/patient-profile"
import { Loader2 } from "lucide-react"

function PatientDetailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = searchParams.get("id")

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) {
      router.push("/patients")
      return
    }

    Promise.all([
      patientsApi.getById(id).catch(() => null),
      appointmentsApi.getAll().catch(() => []),
      pharmacyApi.getPrescriptions().catch(() => []),
      laboratoryApi.getAll().catch(() => []),
      billingApi.getAll().catch(() => []),
      billingApi.getPatientFinancialHistory(id).catch(() => null)
    ]).then(([patient, allAppts, allPrescs, allLabs, allInvoices, financialHistory]) => {
      if (!patient) {
        router.push("/patients")
        return
      }

      const patientAppts = allAppts.filter((a: any) => a.patientId === patient.patientId || a.patientId === id)
      const patientPrescs = allPrescs.filter((p: any) => p.patientId === patient.patientId || p.patientId === id)
      const patientLabs = allLabs.filter((l: any) => l.patientId === patient.patientId || l.patientId === id)
      const patientInvoices = allInvoices.filter((i: any) => i.patientId === patient.patientId || i.patientId === id)

      setData({
        patient,
        appointments: patientAppts,
        prescriptions: patientPrescs,
        labTests: patientLabs,
        invoices: patientInvoices,
        financialHistory: financialHistory
      })
    }).finally(() => {
      setLoading(false)
    })
  }, [id, router])

  if (loading) return (
    <div className="flex items-center justify-center p-12">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  )
  if (!data?.patient) return (
    <div className="flex items-center justify-center p-12">
      <p className="text-muted-foreground">Patient not found</p>
    </div>
  )

  return (
    <PatientProfile
      patient={data.patient}
      appointments={data.appointments}
      prescriptions={data.prescriptions}
      labTests={data.labTests}
      invoices={data.invoices}
      financialHistory={data.financialHistory}
    />
  )
}

export default function PatientDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center p-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <PatientDetailContent />
    </Suspense>
  )
}
