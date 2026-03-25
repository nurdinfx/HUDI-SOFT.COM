import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import API from '../api';
import { Lock, Mail, ArrowLeft, ShieldCheck, Globe, Building } from 'lucide-react';

const AuthPage = () => {
    const [step, setStep] = useState(1); // 1: Email, 2: Password
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleNext = (e) => {
        e.preventDefault();
        if (formData.email) {
            setStep(2);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            console.log('AuthPage: Targeting API at', API.defaults.baseURL);
            console.log('AuthPage: Attempting login for', formData.email);
            const { data } = await API.post(`/auth/login`, formData);
            console.log('AuthPage: Login successful, received data:', data);
            
            localStorage.setItem('adminInfo', JSON.stringify(data));
            
            if (data.role === 'admin') {
                console.log('AuthPage: Redirecting to dashboard...');
                navigate('/');
            } else {
                console.log('AuthPage: Access denied, role is', data.role);
                setError('Access denied. Admin privileges required.');
            }
        } catch (err) {
            console.error('AuthPage: Login failed:', err);
            setError(err.response?.data?.message || 'Authentication failed');
            setStep(1); // Go back to start on error if needed
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-2xl shadow-slate-200 border border-slate-100 p-10">
                {/* HUDI Logo */}
                <div className="flex flex-col items-center mb-10 text-center">
                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black mb-4 shadow-lg shadow-indigo-200">
                        H
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter mb-2">
                        HUDI<span className="text-indigo-600">ADMIN</span>
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">
                        Management Portal • Secure Access Only
                    </p>
                </div>

                <AnimatePresence mode="wait">
                    {step === 1 ? (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            <form onSubmit={handleNext} className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Admin Identity</label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600">
                                            <Mail size={18} />
                                        </div>
                                        <input
                                            type="email"
                                            name="email"
                                            required
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            placeholder="admin email"
                                            className="w-full bg-slate-50 border border-slate-200 pl-12 pr-4 py-3.5 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-[0.98]"
                                >
                                    Verify Identity
                                </button>
                            </form>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            <button
                                onClick={() => setStep(1)}
                                className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors"
                            >
                                <ArrowLeft size={14} /> Back
                            </button>
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Security Key</label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600">
                                            <Lock size={18} />
                                        </div>
                                        <input
                                            type="password"
                                            name="password"
                                            required
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            placeholder="••••••••"
                                            autoFocus
                                            className="w-full bg-slate-50 border border-slate-200 pl-12 pr-4 py-3.5 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold"
                                        />
                                    </div>
                                </div>
                                {error && (
                                    <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-600 text-xs font-bold">
                                        <span>{error}</span>
                                    </div>
                                )}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-[0.98] disabled:opacity-50"
                                >
                                    {loading ? 'Authorizing...' : 'Authorize Access'}
                                </button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="mt-10 pt-8 border-t border-slate-100 flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-slate-400">
                    <span>HUDI SOFT ADMIN v1.0</span>
                    <span className="flex items-center gap-1"><Globe size={10} /> GLOBAL</span>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
