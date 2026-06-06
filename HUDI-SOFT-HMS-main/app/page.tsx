'use client';

import { useEffect } from 'react';
import { goToDashboard } from '@/lib/capacitor-nav';

/** Licensed users with token go straight to dashboard. */
export default function HomePage() {
    useEffect(() => {
        if (localStorage.getItem('hms_token')) {
            goToDashboard();
        }
    }, []);

    return null;
}
