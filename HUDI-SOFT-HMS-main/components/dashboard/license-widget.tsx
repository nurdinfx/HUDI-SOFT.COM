"use client";

import { useState, useEffect } from 'react';
import { licenseApi, type LicenseInfo } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Key, Calendar, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

// Get license info from localStorage (stored during activation)
function getStoredLicense(): LicenseInfo | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem('hms_activation_info');
        if (!raw) return null;
        const a = JSON.parse(raw);
        const expiry = new Date(a.expiryDate);
        const now = new Date();
        const daysRemaining = Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        return {
            licenseKey: a.licenseKey || '',
            companyName: a.companyName || 'HUDI-SOFT',
            productType: a.productType || 'HMS',
            startDate: a.startDate || now.toISOString(),
            expiryDate: a.expiryDate || now.toISOString(),
            status: daysRemaining > 0 ? 'Active' : 'Expired',
            isTrial: false,
            daysRemaining,
        };
    } catch {
        return null;
    }
}

function isCapacitorNative(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window as any).Capacitor?.isNativePlatform?.();
}

export default function LicenseWidget() {
    const [license, setLicense] = useState<LicenseInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    const loadLicense = async (forceSync = false) => {
        if (forceSync) setSyncing(true);
        try {
            // In Capacitor: use stored activation data first, sync in background
            if (isCapacitorNative()) {
                const stored = getStoredLicense();
                if (stored) {
                    setLicense(stored);
                    setLoading(false);
                    // Background sync — don't redirect on failure
                    if (forceSync) {
                        try {
                            const res = await licenseApi.status(true);
                            if (res.isLicensed && res.license) {
                                setLicense(res.license);
                                toast.success('License synchronized!');
                            }
                        } catch {
                            toast.error('Could not sync — using cached license data.');
                        }
                        setSyncing(false);
                    }
                    return;
                }
            }

            // Web/PWA: call server
            const res = await licenseApi.status(forceSync);
            if (res.isLicensed && res.license) {
                setLicense(res.license);
                if (forceSync) toast.success('License synchronized successfully!');
            }
            // Don't redirect on isLicensed=false — just show nothing
        } catch (err: any) {
            console.error('Failed to load license:', err);
            // Try stored as fallback
            const stored = getStoredLicense();
            if (stored) setLicense(stored);
            if (forceSync) toast.error('Failed to sync. Using cached data.');
        } finally {
            setLoading(false);
            setSyncing(false);
        }
    };

    useEffect(() => {
        loadLicense();
    }, []);

    if (loading) {
        return (
            <div className="w-full bg-slate-900/40 border border-slate-800 rounded-3xl p-6 animate-pulse flex justify-between items-center">
                <div className="space-y-2">
                    <div className="h-4 w-40 bg-slate-800 rounded" />
                    <div className="h-3 w-60 bg-slate-800 rounded" />
                </div>
                <div className="h-10 w-24 bg-slate-800 rounded-xl" />
            </div>
        );
    }

    if (!license) return null;

    const days = license.daysRemaining;
    const isExpiringSoon = days <= 7;

    return (
        <Card className="w-full bg-slate-900/40 border border-slate-800/80 rounded-3xl overflow-hidden shadow-xl backdrop-blur-xl">
            <CardContent className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-start gap-4">
                    <div className={`p-3.5 rounded-2xl ${isExpiringSoon ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                        {isExpiringSoon ? <AlertTriangle size={24} className="animate-pulse" /> : <ShieldCheck size={24} />}
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h3 className="text-lg font-black text-white">{license.companyName}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${license.isTrial ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                {license.isTrial ? 'Trial Plan' : 'Active Plan'}
                            </span>
                        </div>
                        <p className="text-slate-400 text-xs flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span className="flex items-center gap-1"><Key size={12} /> Key: <code className="font-mono text-[10px] text-slate-300">{license.licenseKey.slice(0, 8)}...</code></span>
                            <span className="flex items-center gap-1"><Calendar size={12} /> Valid until: <strong className="text-slate-200">{new Date(license.expiryDate).toLocaleDateString()}</strong></span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto self-stretch md:self-auto justify-between md:justify-end">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Time Remaining</p>
                        <p className={`text-xl font-black ${isExpiringSoon ? 'text-amber-500' : 'text-emerald-500'}`}>{days} Days Left</p>
                    </div>
                    <button
                        onClick={() => loadLicense(true)}
                        disabled={syncing}
                        className="flex items-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold uppercase transition disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                        <span>{syncing ? 'Syncing...' : 'Sync'}</span>
                    </button>
                </div>
            </CardContent>
        </Card>
    );
}
