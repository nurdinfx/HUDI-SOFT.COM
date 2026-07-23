"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getOrCreateMachineId, setTenantId } from '@/lib/api';
import {
  Key, ShieldAlert, CheckCircle, Loader2,
  Building, Calendar, ArrowRight, ShieldCheck,
  Clock, Smartphone, RefreshCw, Wifi, WifiOff
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────
const ACTIVATION_KEY = 'hms_activation_info';

interface StoredActivation {
  licenseKey: string;
  companyName: string;
  startDate: string;
  expiryDate: string;
  activatedAt: string;
  tenantId?: string;
  productType?: string;
  adminEmail?: string;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────
function saveActivation(data: StoredActivation) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVATION_KEY, JSON.stringify(data));
}

export function getStoredActivation(): StoredActivation | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ACTIVATION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredActivation;
  } catch {
    return null;
  }
}

export function clearActivation() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACTIVATION_KEY);
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch { return iso; }
}

function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

// ─── API base URL ─────────────────────────────────────────────────────────────
function getApiBase(): string {
  const base = (process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/$/, '');
  return base ? `${base}/api` : '/api';
}

// Main licensing server — called DIRECTLY to validate keys
const MAIN_LICENSE_URL = 'https://hudi-soft-com.onrender.com/api/settings/activate-license';

// ─── Activation fetch — calls MAIN server directly ───────────────────────────
async function callActivate(licenseKey: string, machineId: string): Promise<StoredActivation> {
  const attempts = [
    { url: MAIN_LICENSE_URL, label: 'Main License Server' },
    { url: `${getApiBase()}/license/activate`, label: 'HMS Backend' },
  ];

  let lastError = '';

  for (const attempt of attempts) {
    try {
      const res = await fetch(attempt.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Machine-ID': machineId,
          'Accept': 'application/json',
        },
        body: JSON.stringify({ licenseKey, machineId }),
        // No AbortSignal.timeout — let it wait as long as needed on mobile
      });

      let body: any;
      try { body = await res.json(); } catch {
        lastError = `Server error (HTTP ${res.status})`;
        continue;
      }

      // Normalize: main server uses valid/success, HMS backend uses success/license
      const isSuccess =
        (body.success === true && (body.valid === true || body.license)) ||
        (body.valid === true);

      if (isSuccess) {
        const now = new Date().toISOString();
        // Normalize response shape from either server
        const lic = body.license || body;
        return {
          licenseKey,
          companyName: lic.companyName || body.companyName || 'Unknown',
          startDate:   lic.startDate   || body.startDate   || now,
          expiryDate:  lic.expiryDate  || body.expiryDate  || now,
          activatedAt: now,
          tenantId:    body.tenantId   || lic.tenantId,
          productType: lic.productType || body.productType,
          adminEmail:  body.adminEmail || 'admin@hospital.com',
        };
      }

      // Server responded but key is invalid — don't retry, show the error
      const errMsg = body.message || body.error || 'Invalid license key';
      throw new Error(errMsg);

    } catch (err: any) {
      if (
        err.name === 'AbortError' ||
        err.message?.toLowerCase().includes('network') ||
        err.message?.toLowerCase().includes('failed to fetch') ||
        err.message?.toLowerCase().includes('unreachable')
      ) {
        lastError = `${attempt.label} unreachable`;
        continue; // try next server
      }
      // Real error (invalid key, expired, etc.) — surface immediately
      throw err;
    }
  }

  // Both servers failed
  throw new Error(
    'Cannot reach the license server. Both servers are offline or unreachable.\n' +
    'Please check your internet connection and try again.'
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
function ActivateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [keyInput, setKeyInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error' | 'already'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [licenseInfo, setLicenseInfo] = useState<StoredActivation | null>(null);
  const [machineId, setMachineId] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const [verifyMsg, setVerifyMsg] = useState('Contacting HUDI-SOFT license server…');

  useEffect(() => {
    const mid = getOrCreateMachineId();
    setMachineId(mid);
    setDebugInfo(getApiBase());

    const urlKey = searchParams.get('key')?.toUpperCase().trim() || '';
    if (urlKey) {
      setKeyInput(urlKey);
      setStatus('idle'); // Always show the input/activation screen when key is passed in URL
      return;
    }

    const stored = getStoredActivation();
    if (stored) {
      setLicenseInfo(stored);
      setStatus('already');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ── Activate ────────────────────────────────────────────────────────────────
  const handleActivation = async (keyToActivate: string) => {
    const trimmed = keyToActivate.trim().toUpperCase().replace(/\s+/g, '');
    if (!trimmed) {
      toast.error('Please enter your license key');
      return;
    }
    if (trimmed.length < 8) {
      toast.error('License key is too short. Please check and try again.');
      return;
    }

    setStatus('verifying');
    setErrorMessage('');
    setVerifyMsg('Contacting HUDI-SOFT license server…');

    // Show "waking up" message after 5s (Render cold start can take 30-60s)
    const wakeTimer = setTimeout(() => {
      setVerifyMsg('Server is waking up, please wait… (first request can take 30s)');
    }, 5000);

    try {
      const activation = await callActivate(trimmed, machineId);
      clearTimeout(wakeTimer);

      saveActivation(activation);
      if (activation.tenantId) setTenantId(activation.tenantId);

      setLicenseInfo(activation);
      setStatus('success');
      toast.success('System activated successfully!');

      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      clearTimeout(wakeTimer);
      const msg = err.message || 'Activation failed. Please try again.';
      setStatus('error');
      setErrorMessage(msg);
      toast.error(msg);
    }
  };

  const handleReactivate = () => {
    clearActivation();
    setLicenseInfo(null);
    setKeyInput('');
    setStatus('idle');
  };

  const handleContinue = () => {
    if (licenseInfo?.tenantId) setTenantId(licenseInfo.tenantId);
    router.push('/login');
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-15%] left-[-15%] w-[55%] h-[55%] rounded-full bg-blue-700/10 blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-15%] w-[55%] h-[55%] rounded-full bg-blue-500/8 blur-[160px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-full bg-white shadow-2xl shadow-blue-500/30 flex items-center justify-center mb-4 overflow-hidden border-4 border-blue-200/20">
            <img src="/logo.png" alt="HUDI SOFT" className="w-20 h-20 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
          <span className="text-2xl font-black text-white tracking-tight">
            HUDI<span className="text-blue-400">SOFT</span>
          </span>
          <span className="text-[11px] uppercase font-semibold tracking-[0.2em] text-blue-300/60 mt-1">
            Hospital Management System
          </span>
        </div>

        {/* Card */}
        <div className="bg-slate-900/60 border border-white/5 backdrop-blur-2xl rounded-3xl p-7 shadow-2xl">

          {/* IDLE */}
          {status === 'idle' && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-2">
                  <Key size={22} className="text-blue-400" />
                </div>
                <h2 className="text-xl font-black text-white">Activate HMS</h2>
                <p className="text-slate-400 text-xs leading-relaxed px-2">
                  Enter the license key received from HUDI-SOFT. The same key can be used on
                  multiple devices — all will share the same activation date.
                </p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleActivation(keyInput); }} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                    License Key
                  </label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={15} />
                    <input
                      type="text"
                      value={keyInput}
                      onChange={(e) => setKeyInput(e.target.value.toUpperCase().replace(/[^A-Z0-9\-]/g, ''))}
                      className="w-full bg-slate-950/70 border border-slate-700/50 rounded-xl pl-11 pr-4 py-3.5 text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 text-xs font-mono tracking-[0.15em] uppercase transition-all"
                      placeholder="XXXX-XXXX-XXXX-XXXX"
                      autoCapitalize="characters"
                      spellCheck={false}
                      autoCorrect="off"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 group"
                >
                  <span>Activate Software</span>
                  <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </form>

              <div className="border-t border-white/5 pt-4 space-y-2">
                <div className="flex gap-2.5 text-[10px] text-slate-500">
                  <ShieldCheck size={15} className="shrink-0 text-slate-600 mt-0.5" />
                  <span className="leading-relaxed">
                    Device ID: <code className="text-slate-400 font-mono">{machineId ? machineId.slice(0, 16) + '…' : '…'}</code>
                  </span>
                </div>
                <div className="flex gap-2.5 text-[10px] text-slate-600">
                  <Wifi size={13} className="shrink-0 mt-0.5" />
                  <span className="leading-relaxed truncate">Server: {debugInfo}</span>
                </div>
              </div>
            </div>
          )}

          {/* VERIFYING */}
          {status === 'verifying' && (
            <div className="py-10 flex flex-col items-center space-y-6">
              <div className="relative">
                <div className="absolute inset-[-8px] border border-blue-500/20 rounded-full animate-ping" />
                <div className="w-20 h-20 border-4 border-blue-500/15 border-t-blue-500 rounded-full animate-spin" />
                <Key className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-400 animate-pulse" size={22} />
              </div>
              <div className="text-center space-y-2 px-2">
                <h3 className="text-lg font-black text-white">Verifying License</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{verifyMsg}</p>
                <p className="text-slate-600 text-[10px]">Do not close the app</p>
              </div>
            </div>
          )}

          {/* SUCCESS */}
          {status === 'success' && licenseInfo && (
            <div className="py-2 space-y-5 text-center">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/25 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle size={34} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Activated!</h3>
                <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Device Authorized</p>
              </div>
              <ActivationInfoCard info={licenseInfo} />
              {/* Login credentials box */}
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 text-left space-y-2">
                <p className="text-[10px] font-black uppercase text-emerald-400/70 tracking-widest">Your Login Credentials</p>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-xs">Email</span>
                  <code className="text-emerald-300 text-xs font-mono">{licenseInfo.adminEmail || 'admin@hospital.com'}</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-xs">Password</span>
                  <code className="text-emerald-300 text-xs font-mono">admin123</code>
                </div>
              </div>
              <p className="text-slate-500 text-[10px] animate-pulse">Redirecting to login…</p>
            </div>
          )}

          {/* ALREADY ACTIVATED */}
          {status === 'already' && licenseInfo && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto text-blue-400 mb-3">
                  <ShieldCheck size={32} />
                </div>
                <h3 className="text-xl font-black text-white">Already Activated</h3>
                <p className="text-blue-300/70 text-[10px] font-bold uppercase tracking-widest mt-0.5">This device is licensed</p>
              </div>
              <ActivationInfoCard info={licenseInfo} />
              <div className="space-y-2.5">
                <button onClick={handleContinue}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                  <ArrowRight size={14} /> Continue to App
                </button>
                <button onClick={handleReactivate}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-2">
                  <RefreshCw size={13} /> Use a Different Key
                </button>
              </div>
            </div>
          )}

          {/* ERROR */}
          {status === 'error' && (
            <div className="py-4 space-y-5 text-center">
              <div className="w-16 h-16 bg-red-500/10 border border-red-500/25 rounded-full flex items-center justify-center mx-auto text-red-400">
                <ShieldAlert size={34} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-white">Activation Failed</h3>
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                  <p className="text-red-400 text-xs leading-relaxed">{errorMessage}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStatus('idle')}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors">
                  Try Again
                </button>
                <a href="https://hudi-soft.com" target="_blank" rel="noopener noreferrer"
                  className="flex-1 py-3 bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 border border-blue-500/20 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center">
                  Contact Support
                </a>
              </div>
              {/* Debug info for support */}
              <p className="text-slate-700 text-[9px]">API: {debugInfo} · Device: {machineId?.slice(0, 12)}…</p>
            </div>
          )}
        </div>

        <p className="text-center text-slate-600 text-[10px] mt-5">
          © {new Date().getFullYear()} HUDI-SOFT · Hospital Management System
        </p>
      </div>
    </div>
  );
}

// ─── Info card ────────────────────────────────────────────────────────────────
function ActivationInfoCard({ info }: { info: StoredActivation }) {
  return (
    <div className="bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-left space-y-3">
      <InfoRow icon={<Building size={15} className="text-slate-500" />} label="Licensed To" value={info.companyName} />
      <InfoRow icon={<Key size={15} className="text-slate-500" />} label="License Key" value={info.licenseKey} mono />
      <InfoRow icon={<Clock size={15} className="text-slate-500" />} label="Activation Date" value={fmtDate(info.startDate)} highlight="green" />
      <InfoRow icon={<Calendar size={15} className="text-slate-500" />} label="Expires On" value={fmtDate(info.expiryDate)}
        highlight={new Date(info.expiryDate) < new Date() ? 'red' : undefined} />
      <InfoRow icon={<Smartphone size={15} className="text-slate-500" />} label="Device Registered" value={fmtDateTime(info.activatedAt)} />
    </div>
  );
}

function InfoRow({ icon, label, value, mono = false, highlight }:
  { icon: React.ReactNode; label: string; value: string; mono?: boolean; highlight?: 'green' | 'red' }) {
  const valClass = highlight === 'green' ? 'text-emerald-400 font-bold'
    : highlight === 'red' ? 'text-red-400 font-bold'
    : 'text-white font-semibold';
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest leading-none mb-0.5">{label}</p>
        <p className={`text-xs truncate ${valClass} ${mono ? 'font-mono tracking-wider' : ''}`}>{value}</p>
      </div>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function ActivatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-blue-400" />
      </div>
    }>
      <ActivateContent />
    </Suspense>
  );
}
