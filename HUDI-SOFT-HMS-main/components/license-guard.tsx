'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { KeyRound, Loader2, Lock, Shield, Zap } from 'lucide-react';
import {
    licenseApi,
    normalizeLicenseKey,
    setLicenseKey,
    getMachineId,
} from '@/lib/api';

const LICENSE_STORAGE_KEY = 'hms_license_key';
const LICENSE_META_KEY = 'hms_license_meta';

type LicenseMeta = {
    expiryDate?: string;
    companyName?: string;
    isTrial?: boolean;
    activatedAt: string;
};

function readStoredLicense(): { key: string; meta: LicenseMeta } | null {
    if (typeof window === 'undefined') return null;
    const key = localStorage.getItem(LICENSE_STORAGE_KEY);
    if (!key) return null;
    try {
        const meta = JSON.parse(localStorage.getItem(LICENSE_META_KEY) || '{}') as LicenseMeta;
        if (meta.expiryDate && new Date(meta.expiryDate) < new Date()) {
            localStorage.removeItem(LICENSE_STORAGE_KEY);
            localStorage.removeItem(LICENSE_META_KEY);
            return null;
        }
        return { key, meta };
    } catch {
        return { key, meta: { activatedAt: new Date().toISOString() } };
    }
}

function persistLicense(
    key: string,
    result: { expiryDate?: string; companyName?: string; isTrial?: boolean }
) {
    setLicenseKey(key);
    const meta: LicenseMeta = {
        expiryDate: result.expiryDate,
        companyName: result.companyName,
        isTrial: result.isTrial,
        activatedAt: new Date().toISOString(),
    };
    localStorage.setItem(LICENSE_META_KEY, JSON.stringify(meta));
}

export function LicenseGuard({ children }: { children: React.ReactNode }) {
    const searchParams = useSearchParams();
    const [checking, setChecking] = React.useState(true);
    const [activated, setActivated] = React.useState(false);
    const [licenseInput, setLicenseInput] = React.useState('');
    const [activating, setActivating] = React.useState(false);
    const [error, setError] = React.useState('');
    const [activatingMsg, setActivatingMsg] = React.useState('Activating…');

    const runActivation = React.useCallback(async (rawKey: string) => {
        const key = normalizeLicenseKey(rawKey);
        if (!key || key.length < 8) {
            setError('Please enter your full license key from the demo email or request page.');
            setChecking(false);
            setActivating(false);
            return;
        }

        setActivating(true);
        setError('');
        setActivatingMsg('Activating…');

        // After 5 s, update message so users know it's a cold start
        const slowTimer = setTimeout(() => {
            setActivatingMsg('Server waking up, please wait…');
        }, 5000);

        try {
            const result = await licenseApi.validate(key);
            persistLicense(key, result);
            setActivated(true);
            if (typeof window !== 'undefined' && window.location.search.includes('key=')) {
                const url = new URL(window.location.href);
                url.searchParams.delete('key');
                window.history.replaceState({}, '', url.pathname + url.search);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Activation failed';
            console.error('[license-guard]', message);
            setError(message);
        } finally {
            clearTimeout(slowTimer);
            setActivating(false);
            setActivatingMsg('Activating…');
            setChecking(false);
        }
    }, []);

    React.useEffect(() => {
        const stored = readStoredLicense();
        if (stored) {
            setActivated(true);
            setChecking(false);
            return;
        }

        const keyFromUrl =
            searchParams.get('key') || searchParams.get('licenseKey') || searchParams.get('activation');
        if (keyFromUrl) {
            setLicenseInput(normalizeLicenseKey(keyFromUrl));
            void runActivation(keyFromUrl);
            return;
        }

        setChecking(false);
    }, [searchParams, runActivation]);

    if (checking) {
        return (
            <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950 text-slate-300">
                <Loader2 className="size-10 animate-spin text-teal-400" />
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.25em]">Verifying license…</p>
            </div>
        );
    }

    if (activated) {
        return <>{children}</>;
    }

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 p-4">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/90 p-8 shadow-2xl shadow-teal-900/20 backdrop-blur">
                <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-teal-500/20 ring-1 ring-teal-400/40">
                    <Lock className="size-8 text-teal-300" />
                </div>

                <h1 className="text-center text-2xl font-bold text-white">Activation Required</h1>
                <p className="mt-2 text-center text-sm text-slate-400">
                    Please enter your digital license key to unlock the HMS Professional suite.
                </p>

                <form
                    className="mt-8 space-y-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        void runActivation(licenseInput);
                    }}
                >
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-teal-400/90">
                        License key
                    </label>
                    <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            value={licenseInput}
                            onChange={(e) => setLicenseInput(e.target.value)}
                            placeholder="XXXX-XXXX-XXXX-XXXX"
                            className="w-full rounded-xl border border-white/10 bg-slate-950 py-3 pl-10 pr-4 font-mono text-sm uppercase text-white outline-none ring-teal-500/30 focus:ring-2"
                            autoComplete="off"
                            spellCheck={false}
                            disabled={activating}
                        />
                    </div>

                    {error ? (
                        <div className="space-y-2">
                            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                                {error}
                            </p>
                            <button
                                type="button"
                                onClick={() => setError('')}
                                className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors underline"
                            >
                                Dismiss and try again
                            </button>
                        </div>
                    ) : null}

                    <button
                        type="submit"
                        disabled={activating || !licenseInput.trim()}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-500 py-3.5 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-teal-400 disabled:opacity-60"
                    >
                        {activating ? (
                            <Loader2 className="size-5 animate-spin" />
                        ) : (
                            <Zap className="size-5" />
                        )}
                        {activatingMsg}
                    </button>
                    {activating && (
                        <p className="text-center text-[10px] text-slate-500 uppercase tracking-widest">
                            May take up to 15 seconds on first request
                        </p>
                    )}
                </form>

                <div className="mt-8 flex justify-center gap-8 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <span className="flex items-center gap-1.5">
                        <Shield className="size-3.5 text-teal-500" />
                        Enterprise grade
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Shield className="size-3.5 text-teal-500" />
                        Multi-terminal
                    </span>
                </div>

                <p className="mt-4 text-center text-[10px] text-slate-600">
                    Device ID: {typeof window !== 'undefined' ? getMachineId() : '—'}
                </p>
            </div>
        </div>
    );
}
