/** Required for `output: 'export'` — patient IDs load client-side at runtime. */
export function generateStaticParams() {
    return [{ id: '_' }];
}

export default function PatientIdLayout({ children }: { children: React.ReactNode }) {
    return children;
}
