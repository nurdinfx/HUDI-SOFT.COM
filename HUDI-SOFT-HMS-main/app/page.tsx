'use client';

import { useEffect } from 'react';
import { goToDashboard } from '@/lib/capacitor-nav';

/** Licensed users with token go to dashboard; login is handled inside LicenseGuard. */
export default function HomePage() {
    useEffect(() => {
        if (localStorage.getItem('hms_token')) {
            goToDashboard();
        }
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
        </div>
    );
}
