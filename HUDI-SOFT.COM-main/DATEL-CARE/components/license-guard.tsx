'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { licenseApi, setLicenseKey } from '@/lib/api';
import { ShieldCheck, Lock, Zap, Building2, AlertTriangle, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function LicenseGuard({ children }: { children: React.ReactNode }) {
    const [isValid, setIsValid] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);
    const [key, setKey] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [licenseInfo, setLicenseInfo] = useState<any>(null);

    const checkLicense = async () => {
        const storedKey = localStorage.getItem('hms_license_key');
        if (!storedKey) {
            setIsValid(false);
            setLoading(false);
            return;
        }

        try {
            const data = await licenseApi.validate(storedKey);
            if (data.valid) {
                setIsValid(true);
                setLicenseInfo(data);
            } else {
                setIsValid(false);
                setError(data.message);
            }
        } catch (err: any) {
            setIsValid(false);
            setError(err.message || 'Connection failed');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkLicense();
    }, []);

    const handleActivate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!key.trim()) return;

        setLoading(true);
        setError(null);
        try {
            const data = await licenseApi.validate(key);
            if (data.valid) {
                setLicenseKey(key);
                setIsValid(true);
                setLicenseInfo(data);
            } else {
                setError(data.message);
            }
        } catch (err: any) {
            setError(err.message || 'Activation failed');
        } finally {
            setLoading(false);
        }
    };

    if (loading && isValid === null) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-teal-500 font-black text-xs uppercase tracking-[0.2em]">Verifying License...</p>
                </div>
            </div>
        );
    }

    if (isValid === false) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
                {/* Background glow */}
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
                    <p className="text-slate-400 text-center mb-10 font-medium">Please enter your digital license key to unlock the HMS Professional suite.</p>

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
                            disabled={loading}
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
                                <p className="text-[9px] text-slate-500 font-bold uppercase">Up to 2 Devices</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-10 text-center">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                            Need a key? <a href="https://hudisoft.online/request-demo" target="_blank" rel="noopener noreferrer" className="text-teal-500 hover:underline">Request a 5-Day Free Trial</a>
                        </p>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <>
            {children}
            {/* Optional: Small status bar for trial users */}
            {licenseInfo?.isTrial && (
                <div className="fixed bottom-4 right-4 z-[9999] bg-teal-600/90 backdrop-blur-md text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.1em] shadow-xl border border-white/20 pointer-events-none">
                    Trial License: {licenseInfo.daysRemaining} Days Left
                </div>
            )}
        </>
    );
}
