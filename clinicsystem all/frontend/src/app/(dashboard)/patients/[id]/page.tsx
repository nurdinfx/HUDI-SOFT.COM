import PatientDetailClient from './PatientDetailClient'

export function generateStaticParams() {
  return [{ id: 'preview' }]
}

export default function PatientDetailPage() {
  return <PatientDetailClient />
}
