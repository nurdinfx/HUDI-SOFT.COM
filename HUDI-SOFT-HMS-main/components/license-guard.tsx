'use client';

import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
    licenseApi,
    normalizeLicenseKey,
    setLicenseKey,
    getLicenseMeta,
    isLicenseExpired,
} from '@/lib/api';
import { navigateTo } from '@/lib/capacitor-nav';
import { ShieldCheck, Lock, Zap, Building2, AlertTriangle, Key } from 'lucide-react';
import { motion } from 'framer-motion';

const REVALIDATE_MS = 6 * 60 * 60 * 1000; // 6 hours

function getKeyFromUrl(): string | null {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const raw =
        params.get('key') || params.get('licenseKey') || params.get('activation');
    return raw ? normalizeLicenseKey(raw) : null;
}

function isOnLoginPage(): boolean {
    if (typeof window === 'undefined') return false;
    return window.location.pathname.includes('/login');
}

function canTrustCachedLicense(storedKey: string, meta: ReturnType<typeof getLicenseMeta>): boolean {
    if (!storedKey || !meta?.expiryDate || isLicenseExpired(meta)) return false;
    if (!meta.activatedAt) return false;
    const age = Date.now() - new Date(meta.activatedAt).getTime();
    return age < REVALIDATE_MS;
}

export function LicenseGuard({ children }: { children: React.ReactNode }) {
    const [isValid, setIsValid] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);
    const [key, setKey] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [licenseInfo, setLicenseInfo] = useState<{
        expiryDate?: string;
        isTrial?: boolean;
        daysRemaining?: number;
        companyName?: string;
    } | null>(null);
    const validatingRef = useRef(false);

    const applyValidLicense = useCallback(
        (data: {
            expiryDate?: string;
            isTrial?: boolean;
            daysRemaining?: number;
            companyName?: string;
        }) => {
            setIsValid(true);
            setLicenseInfo(data);
            setError(null);
        },
        []
    );

    const activateKey = useCallback(
        async (rawKey: string, options?: { silent?: boolean; skipRedirect?: boolean }) => {
            const cleanKey = normalizeLicenseKey(rawKey);
            if (!cleanKey || validatingRef.current) return;

            validatingRef.current = true;
            if (!options?.silent) {
                setLoading(true);
            }
            setError(null);

            try {
                const data = await licenseApi.validate(cleanKey);
                if (data.valid) {
                    setLicenseKey(cleanKey);
                    applyValidLicense(data);

                    const hasSession =
                        typeof window !== 'undefined' && Boolean(localStorage.getItem('hms_token'));

                    if (
                        !options?.skipRedirect &&
                        !hasSession &&
                        !isOnLoginPage()
                    ) {
                        navigateTo('/login?redirect=/dashboard');
                        return;
                    }
                } else {
                    setIsValid(false);
                    setError(data.message || 'Invalid license key');
                }
            } catch (err: unknown) {
                setIsValid(false);
                let message = err instanceof Error ? err.message : 'Activation failed';
                if (message.includes('Failed to fetch') || message.includes('Network')) {
                    message =
                        'Cannot reach license server. Enable Wi‑Fi/mobile data — keys from hudisoft.online need internet.';
                }
                setError(message);
            } finally {
                validatingRef.current = false;
                setLoading(false);
            }
        },
        [applyValidLicense]
    );

    useEffect(() => {
        const urlKey = getKeyFromUrl();
        if (urlKey) {
            setKey(urlKey);
            void activateKey(urlKey);
            return;
        }

        const storedKey = localStorage.getItem('hms_license_key');
        const meta = getLicenseMeta();

        if (!storedKey) {
            setIsValid(false);
            setLoading(false);
            return;
        }

        if (isLicenseExpired(meta)) {
            localStorage.removeItem('hms_license_key');
            setError('Your trial license has expired. Request a new key at hudisoft.online.');
            setIsValid(false);
            setLoading(false);
            return;
        }

        if (meta?.expiryDate) {
            setLicenseInfo({
                expiryDate: meta.expiryDate,
                isTrial: meta.isTrial,
                daysRemaining: meta.daysRemaining,
                companyName: meta.companyName,
            });
        }

        // Trust recent validation — unlock immediately (fixes infinite reload spinner)
        if (canTrustCachedLicense(storedKey, meta)) {
            applyValidLicense({
                expiryDate: meta!.expiryDate,
                isTrial: meta!.isTrial,
                daysRemaining: meta!.daysRemaining,
                companyName: meta!.companyName,
            });
            setLoading(false);

            // Refresh in background without blocking UI or redirecting
            void activateKey(storedKey, { silent: true, skipRedirect: true });
            return;
        }

        void activateKey(storedKey, { skipRedirect: isOnLoginPage() });
    }, [activateKey, applyValidLicense]);

    const handleActivate = (e: React.FormEvent) => {
        e.preventDefault();
        void activateKey(key);
    };

    if (loading && isValid === null) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-teal-500 font-black text-xs uppercase tracking-[0.2em]">Verifying License...</p>
                    <p className="text-slate-500 text-[10px] max-w-xs text-center">
                        Connecting to license server… (max 20 seconds)
                    </p>
                </div>
            </div>
        );
    }

    if (isValid === false) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(13,148,136,0.1),transparent)] pointer-events-none" />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-xl w-full bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative z-10"
                >
                    <div className="w-20 h-20 bg-teal-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-teal-500/20 -rotate-6">
                        <Lock className="text-white" size={40} />
                    </div>

                    <h2 className="text-3xl font-black text-white text-center mb-2 tracking-tight">Activation Required</h2>
                    <p className="text-slate-400 text-center mb-10 font-medium">
                        Enter the license key from your hudisoft.online demo email to unlock HMS.
                    </p>

                    <form onSubmit={handleActivate} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-teal-500 ml-1">License Key</label>
                            <div className="relative">
                                <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    value={key}
                                    onChange={(e) => setKey(e.target.value)}
                                    placeholder="XXXX-XXXX-XXXX-XXXX"
                                    className="w-full pl-14 pr-6 py-5 bg-slate-800/50 border border-white/5 rounded-2xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all outline-none font-mono text-white text-lg placeholder:opacity-20 uppercase tracking-widest"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-bold"
                            >
                                <AlertTriangle size={16} />
                                {error}
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !key.trim()}
                            className="w-full py-5 bg-teal-600 hover:bg-teal-500 text-white rounded-[1.5rem] font-black uppercase text-sm tracking-[0.2em] transition-all shadow-xl shadow-teal-900/20 flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Zap size={18} fill="currentColor" />
                                    Activate System
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-10 pt-10 border-t border-white/5 grid grid-cols-2 gap-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-teal-500">
                                <ShieldCheck size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-white uppercase tracking-wider">Enterprise Grade</p>
                                <p className="text-[9px] text-slate-500 font-bold uppercase">Secure & Encrypted</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-teal-500">
                                <Building2 size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-white uppercase tracking-wider">Multi-Terminal</p>
                                <p className="text-[9px] text-slate-500 font-bold uppercase">Up to 10 Devices</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-10 text-center">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                            Need a key?{' '}
                            <a
                                href="https://hudisoft.online/request-demo"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-teal-500 hover:underline"
                            >
                                Request a 5-Day Free Trial
                            </a>
                        </p>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <>
            {children}
            {licenseInfo?.isTrial && (
                <div className="fixed bottom-4 right-4 z-[9999] bg-teal-600/90 backdrop-blur-md text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.1em] shadow-xl border border-white/20 pointer-events-none">
                    Trial: {licenseInfo.daysRemaining ?? 0} days left
                    {licenseInfo.expiryDate
                        ? ` · expires ${new Date(licenseInfo.expiryDate).toLocaleDateString()}`
                        : ''}
                </div>
            )}
        </>
    );
}
