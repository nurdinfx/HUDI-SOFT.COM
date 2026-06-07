'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import {
    licenseApi,
    normalizeLicenseKey,
    setLicenseKey,
    getLicenseMeta,
    isLicenseExpired,
    clearLicense,
} from '@/lib/api';
import { goToDashboard } from '@/lib/capacitor-nav';
import { ShieldCheck, Zap, Building2, AlertTriangle, Key } from 'lucide-react';
import { motion } from 'framer-motion';
import { HudiLogo } from '@/components/hudi-logo';
import { HmsLoginForm } from '@/components/hms-login-form';

type Phase = 'activate' | 'login' | 'app';

function getKeyFromUrl(): string | null {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const raw =
        params.get('key') || params.get('licenseKey') || params.get('activation');
    return raw ? normalizeLicenseKey(raw) : null;
}

function readStoredLicense(): {
    key: string;
    meta: ReturnType<typeof getLicenseMeta>;
} | null {
    if (typeof window === 'undefined') return null;
    const key = localStorage.getItem('hms_license_key');
    if (!key) return null;
    const meta = getLicenseMeta();
    if (meta?.expiryDate && isLicenseExpired(meta)) {
        clearLicense();
        return null;
    }
    return { key, meta: meta ?? null };
}

function hasAuthToken(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(localStorage.getItem('hms_token'));
}

function resolvePhase(): Phase {
    if (typeof window === 'undefined') return 'activate';
    if (!readStoredLicense()) return 'activate';
    if (hasAuthToken()) return 'app';
    return 'login';
}

function ActivationShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-[10000] min-h-screen bg-slate-950 flex items-center justify-center p-6 overflow-auto">
            {children}
        </div>
    );
}

export function LicenseGuard({ children }: { children: React.ReactNode }) {
    const [phase, setPhase] = useState<Phase>(resolvePhase);
    const [key, setKey] = useState('');
    const [activating, setActivating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [licenseInfo, setLicenseInfo] = useState<{
        expiryDate?: string;
        isTrial?: boolean;
        daysRemaining?: number;
        companyName?: string;
    } | null>(null);

    const applyLicenseMeta = useCallback((meta: ReturnType<typeof getLicenseMeta>) => {
        if (!meta) return;
        setLicenseInfo({
            expiryDate: meta.expiryDate,
            isTrial: meta.isTrial,
            daysRemaining: meta.daysRemaining,
            companyName: meta.companyName,
        });
    }, []);

    const runActivation = useCallback(async (rawKey: string) => {
        const cleanKey = normalizeLicenseKey(rawKey);
        if (!cleanKey || activating) return;

        setActivating(true);
        setError(null);

        const previous = localStorage.getItem('hms_license_key');
        if (previous && normalizeLicenseKey(previous) !== cleanKey) {
            clearLicense();
        }

        try {
            const data = await licenseApi.validate(cleanKey);
            if (!data.valid) {
                setError(data.message || 'Invalid license key');
                return;
            }

            setLicenseInfo({
                expiryDate: data.expiryDate,
                isTrial: data.isTrial,
                daysRemaining: data.daysRemaining,
                companyName: data.companyName,
            });

            setPhase('login');
        } catch (err: unknown) {
            let message = err instanceof Error ? err.message : 'Activation failed';
            if (message.includes('maximum number of devices')) {
                message +=
                    ' Use Admin → Reset Devices, or request a new key at hudisoft.online.';
            }
            setError(message);
        } finally {
            setActivating(false);
        }
    }, [activating]);

    useEffect(() => {
        const stored = readStoredLicense();
        if (stored) {
            applyLicenseMeta(stored.meta);
            setKey(stored.key);
            setPhase(hasAuthToken() ? 'app' : 'login');

            void licenseApi.sync()
                .then((meta) => {
                    if (!meta) return;
                    applyLicenseMeta(meta);
                    setLicenseInfo({
                        expiryDate: meta.expiryDate,
                        isTrial: meta.isTrial,
                        daysRemaining: meta.daysRemaining,
                        companyName: meta.companyName,
                    });
                    if (isLicenseExpired(meta)) {
                        clearLicense();
                        setPhase('activate');
                    }
                })
                .catch(() => {
                    if (!stored.meta) {
                        clearLicense();
                        setPhase('activate');
                    }
                });
            return;
        }

        const urlKey = getKeyFromUrl();
        if (urlKey) {
            setKey(urlKey);
            void runActivation(urlKey);
        }
    }, [applyLicenseMeta, runActivation]);

    const handleActivate = (e: React.FormEvent) => {
        e.preventDefault();
        void runActivation(key);
    };

    const handleLoginSuccess = () => {
        // Navigate first — avoid rendering empty home page (dark screen + trial badge only)
        goToDashboard();
    };

    if (phase === 'login') {
        return <HmsLoginForm onSuccess={handleLoginSuccess} />;
    }

    if (phase === 'activate') {
        return (
            <ActivationShell>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(13,148,136,0.12),transparent)] pointer-events-none" />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-xl w-full bg-slate-900 border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative z-10"
                >
                    <div className="mb-6">
                        <HudiLogo size="xl" showTagline className="mx-auto" />
                    </div>

                    <h2 className="text-3xl font-black text-white text-center mb-2 tracking-tight">
                        Activation Required
                    </h2>
                    <p className="text-slate-400 text-center mb-8 font-medium">
                        Enter your license key — login opens right after activation.
                    </p>

                    <form onSubmit={handleActivate} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-teal-500 ml-1">
                                License Key
                            </label>
                            <div className="relative">
                                <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    value={key}
                                    onChange={(e) => setKey(e.target.value)}
                                    placeholder="XXXX-XXXX-XXXX-XXXX"
                                    className="w-full pl-14 pr-6 py-5 bg-slate-800 border border-white/10 rounded-2xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none font-mono text-white text-lg uppercase tracking-widest"
                                    autoComplete="off"
                                    disabled={activating}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400 text-xs font-bold">
                                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={activating || !key.trim()}
                            className="w-full py-5 bg-teal-600 hover:bg-teal-500 text-white rounded-[1.5rem] font-black uppercase text-sm tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {activating ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Zap size={18} fill="currentColor" />
                                    Activate &amp; Login
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={18} className="text-teal-500 shrink-0" />
                            <p className="text-[9px] text-slate-400 font-bold uppercase">Secure</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Building2 size={18} className="text-teal-500 shrink-0" />
                            <p className="text-[9px] text-slate-400 font-bold uppercase">10 Devices</p>
                        </div>
                    </div>

                    <p className="mt-6 text-center text-[10px] text-slate-500">
                        Demo key: <span className="font-mono text-teal-500">HUDI-DEMO-2025-SUCCESS</span>
                    </p>
                </motion.div>
            </ActivationShell>
        );
    }

    return <>{children}</>;
}
