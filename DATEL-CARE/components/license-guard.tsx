'use client';

import * as React from 'react';

export function LicenseGuard({ children }: { children: React.ReactNode }) {
    // License check disabled - always allow access
    return <>{children}</>;
}
