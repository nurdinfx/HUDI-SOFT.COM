import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Key, AlertCircle, Loader2, LogOut } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { API_CONFIG } from '../../config/api.config';

/**
 * LicenseGate — guards the POS/admin section behind license key verification.
 *
 * ⚠️  IMPORTANT: Public customer routes (/menu, /order, /login, /activate,
 *     /customer-view) must be defined OUTSIDE this component in App.jsx so
 *     customers scanning QR codes are never asked for a license key.
 *
 * This component is only rendered for staff/admin routes (the /* catch-all).
 * The isQrMenu check below is a belt-and-suspenders safeguard only.
 */
const LicenseGate = ({ children }) => {
    // ─── All hooks MUST be declared unconditionally at the top ───────────────
    const { logout } = useAuth();

    const [isActivated, setIsActivated]   = useState(false);
    const [checking,    setChecking]      = useState(true);
    const [showPopup,   setShowPopup]     = useState(false);
    const [licenseKey,  setLicenseKey]    = useState('');
    const [loading,     setLoading]       = useState(false);
    const [error,       setError]         = useState('');

    // Belt-and-suspenders: if somehow a public path reaches this component,
    // don't run the license check at all.
    const isPublicRoute =
        window.location.hash.includes('/menu')       || window.location.pathname.includes('/menu')       ||
        window.location.hash.includes('/order')      || window.location.pathname.includes('/order')      ||
        window.location.hash.includes('/attendance') || window.location.pathname.includes('/attendance') ||
        window.location.hash.includes('/activate')   || window.location.pathname.includes('/activate')   ||
        window.location.hash.includes('/login')      || window.location.pathname.includes('/login');

    useEffect(() => {
        // Skip license check for public customer pages (should not reach here
        // after the App.jsx restructuring, but kept as a safety net).
        if (isPublicRoute) {
            setChecking(false);
            setIsActivated(true);
            return;
        }

        const checkLicense = async () => {
            // Helper to read URL params from both regular path and hash path
            const getParam = (name) => {
                const search = window.location.search;
                const hashSearch = window.location.hash.includes('?')
                    ? window.location.hash.split('?')[1]
                    : '';
                const params = new URLSearchParams(search || hashSearch);
                return params.get(name);
            };

            const keyFromUrl = getParam('key') || getParam('activation');
            const cleanKeyFromUrl = keyFromUrl
                ? keyFromUrl.split('#')[0].split('/')[0].trim().toUpperCase()
                : '';

            // 1. Prioritize URL key if present
            if (cleanKeyFromUrl && cleanKeyFromUrl.length > 5) {
                console.log('🗝️ Found activation key in URL:', cleanKeyFromUrl);

                const stored = localStorage.getItem('pos_license_data');
                if (stored) {
                    try {
                        const parsed = JSON.parse(stored);
                        if (parsed.key !== cleanKeyFromUrl) {
                            console.log('🧹 Clearing old stored license data for different key');
                            localStorage.removeItem('pos_license_data');
                        }
                    } catch (e) {}
                }

                setLicenseKey(cleanKeyFromUrl);
                setShowPopup(true);
                setChecking(false);
                return;
            }

            // 2. Check stored license data
            const stored = localStorage.getItem('pos_license_data');
            if (stored) {
                try {
                    const data = JSON.parse(stored);
                    if (data.valid && data.key) {
                        const lastCheck = data.lastCheckedAt || data.activatedAt;
                        const daysSinceLastCheck =
                            (new Date() - new Date(lastCheck)) / (1000 * 60 * 60 * 24);

                        if (daysSinceLastCheck < 5) {
                            setIsActivated(true);
                            setChecking(false);
                            return;
                        }

                        // Re-validate after 5 days
                        console.log('🔄 License re-verification required (5-day check)');
                        setLicenseKey(data.key);
                        await performActivation(data.key);
                        return;
                    }
                } catch (e) {}
            }

            // 3. No valid license found — show activation form
            setShowPopup(true);
            setChecking(false);
        };

        checkLicense();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ─── performActivation is defined after hooks ─────────────────────────────
    const performActivation = async (key) => {
        setLoading(true);
        setError('');
        try {
            const machineId =
                localStorage.getItem('pos_online_mid') ||
                Math.random().toString(36).substring(7).toUpperCase();
            localStorage.setItem('pos_online_mid', machineId);

            const normalizedKey = key.trim().toUpperCase();
            const response = await axios.post(
                `${API_CONFIG.API_URL}/license/validate`,
                { licenseKey: normalizedKey, machineId },
                { timeout: 15000, headers: { 'Content-Type': 'application/json' } }
            );

            if (response.data?.success || response.data?.valid) {
                const existing = localStorage.getItem('pos_license_data');
                let originalActivatedAt = new Date().toISOString();
                try {
                    if (existing) {
                        const parsed = JSON.parse(existing);
                        if (parsed.activatedAt) originalActivatedAt = parsed.activatedAt;
                    }
                } catch (e) {}

                const licenseData = {
                    valid: true,
                    key: normalizedKey,
                    companyName: response.data.companyName,
                    expiryDate:  response.data.expiryDate,
                    activatedAt: response.data.activationDate || originalActivatedAt,
                    lastCheckedAt: new Date().toISOString(),
                };
                localStorage.setItem('pos_license_data', JSON.stringify(licenseData));
                localStorage.setItem('pos_license_key', normalizedKey);
                setLicenseKey(normalizedKey);
                setIsActivated(true);
                setShowPopup(false);
                window.location.href = window.location.pathname;
            } else {
                setError(response.data?.message || 'Invalid license key. Please check your key and try again.');
                setShowPopup(true);
            }
        } catch (err) {
            if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
                setError('Request timed out. Please wait a moment and try again.');
            } else if (err.response?.status === 503) {
                setError('Activation service is temporarily unavailable. Please try again in a moment.');
            } else if (err.response?.status === 404) {
                setError('Invalid license key. Key not found in the system.');
            } else if (err.response?.status === 403) {
                setError(err.response?.data?.message || 'License is suspended or expired. Please contact support.');
            } else if (!navigator.onLine) {
                setError('No internet connection. Please check your network and try again.');
            } else {
                setError(err.response?.data?.message || 'Could not complete activation. Please try again.');
            }
            setShowPopup(true);
        } finally {
            setLoading(false);
            setChecking(false);
        }
    };

    const handleActivate = (e) => {
        e.preventDefault();
        performActivation(licenseKey);
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    // Safety net: public routes that somehow reach this component
    if (isPublicRoute) return <>{children}</>;

    if (checking) return (
        <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="text-blue-500 animate-spin" size={48} />
            <p className="text-slate-400 font-bold animate-pulse uppercase tracking-[0.2em] text-xs">
                Verifying License Node...
            </p>
        </div>
    );

    if (isActivated && !showPopup) {
        return <>{children}</>;
    }

    return (
        <AnimatePresence>
            {showPopup && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-blue-500/10 overflow-hidden border border-white/20 dark:border-white/5"
                    >
                        <div className="p-8 sm:p-10">
                            <div className="flex justify-center mb-8">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 animate-pulse"></div>
                                    <div className="relative p-5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl">
                                        <Shield className="text-white" size={40} />
                                    </div>
                                </div>
                            </div>

                            <div className="text-center mb-10">
                                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
                                    License Activation
                                </h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed">
                                    Please enter your HUDI-SOFT license key to access your POS Online suite.
                                </p>
                            </div>

                            <form onSubmit={handleActivate} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] ml-1">
                                        Authentication Key
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                            <Key size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            autoFocus
                                            placeholder="XXXX-XXXX-XXXX-XXXX"
                                            value={licenseKey}
                                            onChange={(e) => setLicenseKey(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 outline-none rounded-2xl pl-12 pr-4 py-4 text-slate-900 dark:text-white font-mono tracking-widest transition-all"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl text-red-600 dark:text-red-400 text-sm font-semibold"
                                    >
                                        <AlertCircle size={18} />
                                        <span>{error}</span>
                                    </motion.div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading || !licenseKey}
                                    className="w-full group relative flex items-center justify-center p-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold text-lg overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 shadow-xl shadow-slate-900/10 dark:shadow-white/5"
                                >
                                    {loading ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 className="animate-spin" size={20} />
                                            Verifying...
                                        </span>
                                    ) : (
                                        <>
                                            Activate System
                                            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-400 to-indigo-500 scale-x-0 group-hover:scale-x-100 transition-transform"></div>
                                        </>
                                    )}
                                </button>

                                {error && (
                                    <button
                                        type="button"
                                        onClick={() => performActivation(licenseKey)}
                                        disabled={loading || !licenseKey}
                                        className="w-full text-blue-500 hover:text-blue-400 text-sm font-bold py-2 transition-colors disabled:opacity-50"
                                    >
                                        🔄 Retry Connection
                                    </button>
                                )}
                            </form>

                            <div className="mt-8 flex flex-col gap-4">
                                <button
                                    onClick={logout}
                                    className="flex items-center justify-center gap-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold transition-colors"
                                >
                                    <LogOut size={16} /> Sign out
                                </button>

                                <div className="border-t border-slate-100 dark:border-slate-800 pt-6 text-center">
                                    <p className="text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-[0.2em]">
                                        Secure Licensing Node • HUDI-SOFT v2
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default LicenseGate;
