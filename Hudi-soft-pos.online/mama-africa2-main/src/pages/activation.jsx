import React, { useState, useEffect, useRef } from 'react';
import { Shield, Key, Smartphone, CheckCircle, AlertCircle, ArrowRight, RefreshCw, Copy, Check } from 'lucide-react';
import axios from 'axios';
import { API_CONFIG } from '../config/api.config';
import { useLocation, useNavigate } from 'react-router-dom';

const ActivationPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [licenseKey, setLicenseKey] = useState('');
    const [deviceId, setDeviceId] = useState('');
    const [status, setStatus] = useState('checking'); // 'checking', 'unactivated', 'activated'
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [copied, setCopied] = useState(false);
    const [activeLicenseInfo, setActiveLicenseInfo] = useState(null);
    const hasAutoActivatedRef = useRef(false);

    // Check if URL has ?fresh=1 or ?demo=1 — always show activation form, never skip to dashboard
    const isFreshActivation = () => {
        const checkParams = (search) => {
            const p = new URLSearchParams(search);
            return p.get('fresh') === '1' || p.get('demo') === '1' || p.get('force') === '1';
        };
        if (typeof window !== 'undefined') {
            if (window.location.search && checkParams(window.location.search)) return true;
            if (window.location.hash.includes('?')) {
                const hashQuery = window.location.hash.substring(window.location.hash.indexOf('?'));
                if (checkParams(hashQuery)) return true;
            }
        }
        if (location.search && checkParams(location.search)) return true;
        return false;
    };

    // Robust key extractor from URL search, hash query, or router location
    const getUrlKey = () => {
        // 1. From window.location.search (?key=...)
        if (typeof window !== 'undefined' && window.location.search) {
            const p = new URLSearchParams(window.location.search);
            const k = p.get('key') || p.get('license') || p.get('activation');
            if (k) return k.trim().toUpperCase();
        }

        // 2. From hash (?key= inside #/activate?key=...)
        if (typeof window !== 'undefined' && window.location.hash.includes('?')) {
            const queryPart = window.location.hash.substring(window.location.hash.indexOf('?'));
            const p = new URLSearchParams(queryPart);
            const k = p.get('key') || p.get('license') || p.get('activation');
            if (k) return k.trim().toUpperCase();
        }

        // 3. From react-router location.search
        if (location.search) {
            const p = new URLSearchParams(location.search);
            const k = p.get('key') || p.get('license') || p.get('activation');
            if (k) return k.trim().toUpperCase();
        }

        return '';
    };

    const executeActivation = async (keyToActivate, id) => {
        if (!keyToActivate) return;
        setLoading(true);
        setMessage('');

        const machineIdToUse = id || deviceId || localStorage.getItem('pos_device_id') || Math.random().toString(36).substring(2, 10).toUpperCase();

        try {
            const normalizedKey = keyToActivate.trim().toUpperCase();
            console.log('🚀 Activating POS with Key:', normalizedKey, 'MachineID:', machineIdToUse);

            const response = await axios.post(`${API_CONFIG.API_URL}/license/validate`, {
                licenseKey: normalizedKey,
                machineId: machineIdToUse
            });

            if (response.data?.success || response.data?.valid) {
                const licenseData = {
                    valid: true,
                    key: normalizedKey,
                    expiryDate: response.data.expiryDate,
                    startDate: response.data.startDate,
                    activatedAt: response.data.activationDate || new Date().toISOString(),
                    lastCheckedAt: new Date().toISOString()
                };

                localStorage.setItem('pos_license_key', normalizedKey);
                localStorage.setItem('pos_license_data', JSON.stringify(licenseData));
                
                setStatus('activated');
                setLicenseKey(normalizedKey);
                setActiveLicenseInfo(licenseData);
                setMessage(response.data?.message || 'HUDI-SOFT License Activated Successfully!');
            } else {
                setStatus('unactivated');
                setMessage(response.data?.message || 'Activation failed: Invalid key');
            }
        } catch (err) {
            console.error('Activation request error:', err);
            setStatus('unactivated');
            setMessage(err.response?.data?.message || 'Activation failed. Please check key or server connection.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            // Get or create persistent device ID
            let id = localStorage.getItem('pos_device_id');
            if (!id) {
                id = Math.random().toString(36).substring(2, 10).toUpperCase();
                localStorage.setItem('pos_device_id', id);
            }
            setDeviceId(id);

            const cleanKeyFromUrl = getUrlKey();
            const freshMode = isFreshActivation(); // ?fresh=1 or ?demo=1 — always show form

            // 1. If key is in URL, always show it in the form.
            //    If fresh=1, NEVER auto-skip to dashboard — always let user see the activation screen.
            if (cleanKeyFromUrl && cleanKeyFromUrl.length > 5) {
                setLicenseKey(cleanKeyFromUrl);

                // Always clear stored key when a new key arrives via URL
                console.log('🧹 Clearing old stored key to apply new license:', cleanKeyFromUrl);
                localStorage.removeItem('pos_license_key');
                localStorage.removeItem('pos_license_data');

                if (!hasAutoActivatedRef.current) {
                    hasAutoActivatedRef.current = true;
                    await executeActivation(cleanKeyFromUrl, id);
                }
                return;
            }

            // 2. If ?fresh=1 or ?demo=1, skip localStorage and always show the activation form
            //    This ensures demo/trial links ALWAYS prompt for activation, even on used browsers.
            if (freshMode) {
                console.log('🔄 Fresh/demo activation mode — ignoring any cached license');
                localStorage.removeItem('pos_license_key');
                localStorage.removeItem('pos_license_data');
                setStatus('unactivated');
                return;
            }

            // 3. Otherwise, check if an existing valid license is already stored locally
            const storedKey = localStorage.getItem('pos_license_key');
            const storedData = localStorage.getItem('pos_license_data');
            if (storedKey && storedData) {
                try {
                    const parsed = JSON.parse(storedData);
                    setLicenseKey(storedKey);
                    setActiveLicenseInfo(parsed);
                    setStatus('activated');
                } catch (e) {
                    setStatus('unactivated');
                }
            } else {
                setStatus('unactivated');
            }
        };

        init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.search, location.hash]);

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        await executeActivation(licenseKey, deviceId);
    };

    const handleSwitchKey = () => {
        localStorage.removeItem('pos_license_key');
        localStorage.removeItem('pos_license_data');
        setStatus('unactivated');
        setLicenseKey('');
        setActiveLicenseInfo(null);
        setMessage('');
    };

    const handleCopy = () => {
        if (!licenseKey) return;
        navigator.clipboard.writeText(licenseKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleLaunchLogin = () => {
        // Use hash-based navigation to ensure HashRouter handles the route correctly
        window.location.replace('/#/login');
    };

    if (status === 'checking') {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-[#0f172a] text-white">
                <RefreshCw className="animate-spin text-blue-500 mb-4" size={40} />
                <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Verifying License...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0f1d] flex flex-col items-center justify-center p-6 font-sans">
            <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
                {/* Glow accent */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl shadow-lg shadow-blue-500/5">
                        <Shield className="text-blue-400" size={42} />
                    </div>
                </div>

                <h1 className="text-2xl font-black text-center text-white tracking-tight mb-1">
                    HUDI-SOFT Cloud POS
                </h1>
                <p className="text-slate-400 text-center mb-6 text-xs uppercase tracking-[0.2em]">
                    Enterprise License Gateway
                </p>

                {status === 'activated' ? (
                    <div className="text-center space-y-6 animate-fadeIn">
                        <div className="flex justify-center">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                                <CheckCircle size={36} />
                            </div>
                        </div>

                        <div>
                            <p className="text-emerald-400 font-black text-lg tracking-wide uppercase">System Activated</p>
                            <p className="text-slate-400 text-xs mt-1">Your POS license is live and bound to this terminal.</p>
                        </div>

                        {/* License Key Card */}
                        <div className="bg-black/40 border border-white/10 rounded-2xl p-4 text-left">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Active Security Key</span>
                                <button 
                                    onClick={handleCopy}
                                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer font-bold"
                                >
                                    {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                    <span>{copied ? 'Copied' : 'Copy'}</span>
                                </button>
                            </div>
                            <p className="text-white font-mono text-sm font-bold tracking-wider select-all break-all">
                                {licenseKey}
                            </p>
                            {activeLicenseInfo?.expiryDate && (
                                <p className="text-[10px] text-slate-400 mt-2">
                                    Expires: {new Date(activeLicenseInfo.expiryDate).toLocaleDateString()}
                                </p>
                            )}
                        </div>

                        {/* Demo Access Info */}
                        <div className="bg-blue-950/40 border border-blue-500/20 rounded-2xl p-4 text-left space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-wider text-blue-400">Terminal Access Credentials</p>
                            <div className="text-xs space-y-1 font-medium text-slate-300">
                                <p>Username / Email: <span className="text-white font-bold select-all">admin@demo.com</span></p>
                                <p>Password: <span className="text-white font-bold select-all">admin123</span></p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-3 pt-2">
                            <button
                                onClick={handleLaunchLogin}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl transition-all shadow-xl shadow-blue-600/25 flex items-center justify-center gap-2 text-xs uppercase tracking-[0.15em] cursor-pointer"
                            >
                                <span>Launch POS Terminal</span>
                                <ArrowRight size={16} />
                            </button>

                            <button
                                onClick={handleSwitchKey}
                                className="w-full bg-transparent border border-white/10 hover:bg-white/5 text-slate-400 hover:text-white font-bold py-3 rounded-xl transition-all text-xs tracking-wider cursor-pointer"
                            >
                                Switch / Activate Different Key
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleFormSubmit} className="space-y-5 animate-fadeIn">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                Terminal Device ID
                            </label>
                            <div className="flex items-center space-x-2 bg-black/40 border border-white/5 p-3 rounded-xl">
                                <Smartphone size={16} className="text-slate-500 shrink-0" />
                                <span className="text-slate-300 font-mono text-xs truncate">{deviceId}</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                License Security Key
                            </label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                <input
                                    type="text"
                                    required
                                    placeholder="XXXX-XXXX-XXXX-XXXX"
                                    value={licenseKey}
                                    onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                                    className="w-full bg-black/40 border border-white/10 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10 outline-none text-white pl-10 pr-4 py-3 rounded-xl text-sm font-mono tracking-wider transition-all placeholder:text-slate-600"
                                />
                            </div>
                        </div>

                        {message && (
                            <div className={`p-4 rounded-xl flex items-start space-x-3 text-xs ${
                                message.toLowerCase().includes('success') 
                                    ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/30' 
                                    : 'bg-rose-500/15 text-rose-200 border border-rose-500/30'
                            }`}>
                                {message.toLowerCase().includes('success') ? (
                                    <CheckCircle size={16} className="mt-0.5 shrink-0" />
                                ) : (
                                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                )}
                                <span>{message}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !licenseKey.trim()}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black py-4 rounded-xl transition-all shadow-xl shadow-blue-600/25 text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {loading ? (
                                <>
                                    <RefreshCw className="animate-spin" size={16} />
                                    <span>Activating Terminal...</span>
                                </>
                            ) : (
                                <>
                                    <Key size={16} />
                                    <span>Activate License Key</span>
                                </>
                            )}
                        </button>
                    </form>
                )}

                <div className="mt-8 text-center border-t border-white/5 pt-5">
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                        © 2026 HUDI-SOFT • MULTI-TENANT CLOUD ENGINE
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ActivationPage;
