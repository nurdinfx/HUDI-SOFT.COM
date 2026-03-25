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
            const { data } = await API.post(`/auth/login`, formData);
            localStorage.setItem('adminInfo', JSON.stringify(data));
            
            if (data.role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Authentication failed');
            setStep(1); // Go back to start on error if needed
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col md:flex-row font-sans overflow-hidden">

            {/* Left Side - News & Immersive Image */}
            <div className="hidden md:flex md:w-[60%] lg:w-[65%] relative bg-slate-900 border-r border-slate-200 overflow-hidden">
                {/* Immersive Background Fallback (High-end CSS Gradient + Patterns) */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900/40 to-slate-900"></div>
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

                {/* Content Overlay */}
                <div className="relative z-10 w-full h-full flex flex-col justify-between p-16 text-white text-left">
                    <div className="flex items-center gap-2 group">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black group-hover:scale-110 transition-transform">H</div>
                        <span className="text-2xl font-black tracking-tighter">HUDI<span className="text-blue-500">SOFT</span></span>
                    </div>

                    <div className="max-w-xl">
                        <div className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-widest inline-block mb-6 border border-white/20">
                            February 25, 2026
                        </div>
                        <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-8">
                            Catch the latest Product Updates <br />
                            on the <span className="text-blue-500">HUDI Community!</span>
                        </h2>
                        <p className="text-lg text-slate-400 font-light leading-relaxed mb-10">
                            Our monthly roundup is back! Read all about our latest updates, along with links to more information and a forum for feedback.
                        </p>
                        <button className="px-8 py-3 bg-white text-slate-900 rounded-full font-black text-sm uppercase hover:bg-slate-100 transition-colors shadow-2xl">
                            See what's new
                        </button>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 pt-10 border-t border-white/10">
                        <div className="flex gap-6">
                            <span>Powered by HUDI SOFT</span>
                            <span>© 2026 HUDI SOFT SYSTEMS</span>
                        </div>
                        <div className="flex gap-6">
                            <span className="hover:text-white cursor-pointer transition-colors">Privacy Statement</span>
                            <span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span>
                        </div>
                    </div>
                </div>

                {/* Aesthetic Blobs */}
                <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute -bottom-20 right-0 w-80 h-80 bg-purple-600/20 rounded-full blur-[100px]"></div>
            </div>

            {/* Right Side - Clean Login Container */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white">
                <div className="w-full max-w-[440px] px-6">
                    {/* HUDI Logo (Toast Style) */}
                    <div className="flex flex-col items-center mb-12">
                        <div className="flex items-center gap-1.5 mb-6 group cursor-pointer" onClick={() => navigate('/')}>
                            <div className="w-10 h-10 bg-[#f4511e] rounded-xl flex items-center justify-center text-white font-black group-hover:rotate-12 transition-transform shadow-xl shadow-orange-500/20">H</div>
                            <span className="text-3xl font-black text-slate-900 tracking-tighter">hudi<span className="text-[#f4511e]">soft</span></span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800">Welcome</h1>
                        <p className="text-sm text-slate-500 mt-2 font-light">Log in to HUDI SOFT to continue to business admin.</p>
                    </div>

                    <AnimatePresence mode="wait">
                        {step === 1 ? (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <form onSubmit={handleNext} className="space-y-4">
                                    <div className="relative group">
                                        <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none transition-colors group-focus-within:text-[#f4511e] text-slate-400">
                                            <Mail size={18} />
                                        </div>
                                        <input
                                            type="email"
                                            name="email"
                                            required
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            placeholder="Email address"
                                            className="w-full bg-white border border-slate-200 pl-14 pr-6 py-4 rounded-xl text-slate-900 outline-none focus:border-[#f4511e] focus:ring-4 focus:ring-orange-500/5 transition-all font-bold placeholder:font-light"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full bg-[#f4511e] text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-[#e64a19] transition-all shadow-xl shadow-orange-500/20 active:scale-[0.98]"
                                    >
                                        Continue
                                    </button>
                                </form>
                                <button className="w-full flex items-center justify-center gap-2 py-4 border border-slate-200 rounded-xl text-sm font-black text-blue-600 uppercase tracking-widest hover:bg-slate-50 transition-colors">
                                    <ShieldCheck size={18} />
                                    Log In with SSO
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <button
                                    onClick={() => setStep(1)}
                                    className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors mb-4"
                                >
                                    <ArrowLeft size={14} /> Back
                                </button>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl mb-4">
                                        <p className="text-xs font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Logging in as</p>
                                        <p className="font-bold text-slate-900">{formData.email}</p>
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none transition-colors group-focus-within:text-[#f4511e] text-slate-400">
                                            <Lock size={18} />
                                        </div>
                                        <input
                                            type="password"
                                            name="password"
                                            required
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            placeholder="Enter password"
                                            autoFocus
                                            className="w-full bg-white border border-slate-200 pl-14 pr-6 py-4 rounded-xl text-slate-900 outline-none focus:border-[#f4511e] focus:ring-4 focus:ring-orange-500/5 transition-all font-bold placeholder:font-light"
                                        />
                                    </div>
                                    {error && <p className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-[#f4511e] text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-[#e64a19] transition-all shadow-xl shadow-orange-500/20 active:scale-[0.98] disabled:opacity-50"
                                    >
                                        {loading ? 'Logging in...' : 'Log In'}
                                    </button>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="mt-12 text-center">
                        <Link to="/request-demo" className="text-sm font-black text-blue-600 hover:underline tracking-tight">
                            Not a Customer? Get Started Today!
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
