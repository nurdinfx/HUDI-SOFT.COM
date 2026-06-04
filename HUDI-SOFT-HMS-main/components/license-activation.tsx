'use client';

import * as React from 'react';
import { useState } from 'react';
import { Shield, Key, Loader2, CheckCircle2, AlertCircle, Zap } from 'lucide-react';
import { licenseApi, getMachineId, setLicenseKey } from '@/lib/api';

interface LicenseActivationProps {
  onSuccess: (key: string) => void;
}

// ─── Static License Definitions (Fallback for Offline/APK) ──────────────────────
const STATIC_LICENSES: Record<string, any> = {
  'HUDI-DEMO-2025-SUCCESS': {
    valid: true,
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    isTrial: true,
    message: 'Demo license activated successfully!',
  },
  'HUDI-PRO-ENTERPRISE-2025': {
    valid: true,
    expiryDate: new Date(Date.now() + 365 * 5 * 24 * 60 * 60 * 1000).toISOString(),
    isTrial: false,
    message: 'Enterprise license activated successfully!',
  },
  'HUDI-STD-2025-LICENSE': {
    valid: true,
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    isTrial: false,
    message: 'Standard license activated successfully!',
  },
};

export function LicenseActivation({ onSuccess }: LicenseActivationProps) {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = key.trim().toUpperCase();
    if (!cleanKey) return;

    setLoading(true);
    setError('');

    try {
      // 1. Check Static Fallback first (for offline/APK)
      if (STATIC_LICENSES[cleanKey]) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSuccess(true);
        setLicenseKey(cleanKey);
        setTimeout(() => onSuccess(cleanKey), 1000);
        return;
      }

      // 2. Check valid pattern keys (UUID or HUDI-XXX)
      const UUID_PATTERN = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i;
      const HUDI_PATTERN = /^HUDI-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+$/i;

      if (UUID_PATTERN.test(cleanKey) || HUDI_PATTERN.test(cleanKey)) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSuccess(true);
        setLicenseKey(cleanKey);
        setTimeout(() => onSuccess(cleanKey), 1000);
        return;
      }

      // 3. Try real API validation
      await licenseApi.validate(cleanKey);
      setSuccess(true);
      setLicenseKey(cleanKey);
      setTimeout(() => onSuccess(cleanKey), 1000);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Activation failed. Please check your key and internet connection.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020817] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10">
        <div className="p-8 sm:p-10">
          <div className="flex justify-center mb-8">
            <div className="relative p-5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl shadow-xl shadow-emerald-500/20">
              <Shield className="text-white" size={42} />
            </div>
          </div>

          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-white mb-3 tracking-tight">Activation Required</h2>
            <p className="text-slate-400 text-sm font-medium leading-relaxed">
              Please enter your digital license key to unlock the HMS Professional suite.
            </p>
          </div>

          <form onSubmit={handleActivate} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">
                License Key
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors">
                  <Key size={20} />
                </div>
                <input
                  type="text"
                  required
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="w-full bg-slate-950/50 border border-white/10 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 outline-none rounded-2xl pl-12 pr-4 py-4 text-white font-mono tracking-widest transition-all"
                  disabled={loading || success}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm font-semibold">
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-sm font-semibold">
                <CheckCircle2 size={18} className="shrink-0" />
                <span>System Activated! Unlocking...</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || success || !key}
              className="w-full relative flex items-center justify-center p-4 bg-emerald-500 hover:bg-emerald-400 text-[#020817] rounded-2xl font-black text-lg shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={24} />
              ) : success ? (
                <CheckCircle2 size={24} />
              ) : (
                <span className="flex items-center gap-2">
                  <Zap size={20} fill="currentColor" />
                  ACTIVATE SYSTEM
                </span>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">
              Need a key? <a href="https://hudisoft.online/request-demo" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline">Request a 5-day free trial</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
