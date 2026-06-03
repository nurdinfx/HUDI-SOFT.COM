export function generateStaticParams() {
  return [{ id: '_' }]
}

export default function PatientDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
