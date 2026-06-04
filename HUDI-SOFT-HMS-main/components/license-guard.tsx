'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { LicenseActivation } from '@/components/license-activation';

export default function LicenseGuard({ children }: { children: React.ReactNode }) {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    // Check if we are in Capacitor (native mobile) environment
    const checkNative = () => {
      if (typeof window !== 'undefined') {
        const isCapacitorNative = !!(window as any).Capacitor?.isNative;
        setIsNative(isCapacitorNative);
        if (!isCapacitorNative) {
          // For web mode, we are always valid (no license check)
          setIsValid(true);
          return;
        }

        // For native (Capacitor) mode, check license
        const storedKey = localStorage.getItem('hms_license_key');
        if (storedKey) {
          setIsValid(true);
        } else {
          setIsValid(false);
        }
      }
    };
    checkNative();
  }, []);

  const handleActivationSuccess = (key: string) => {
    localStorage.setItem('hms_license_key', key);
    setIsValid(true);
  };

  // Loading state
  if (isValid === null) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // Web mode or already activated native app
  if (isValid) {
    return <>{children}</>;
  }

  // Native mode, need activation
  return <LicenseActivation onSuccess={handleActivationSuccess} />;
}
