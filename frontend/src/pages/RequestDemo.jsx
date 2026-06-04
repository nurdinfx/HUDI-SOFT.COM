import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ShieldCheck, Zap, Globe, Building, ArrowLeft, CheckCircle2, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import API from '../api';

const RequestDemo = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        companyName: '',
        systemType: 'POS Online',
        zipCode: '',
        agreeToTerms: false
    });
    const [error, setError] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [trialInfo, setTrialInfo] = useState(null);
    const [loadingMsg, setLoadingMsg] = useState('Authorizing...');

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setLoadingMsg('Authorizing...');

        // After 5 s, update the label so users know it's a cold start, not a freeze
        const wakeTimer = setTimeout(() => {
            setLoadingMsg('Waking up server, please wait...');
        }, 5000);

        try {
            const { data } = await API.post('/leads', formData);
            if (data.trial) {
                setTrialInfo(data.trial);
            }
            setSubmitted(true);
        } catch (err) {
            const msg = err.response?.data?.message
                || 'Could not connect to the server. Please try again in a moment.';
            setError(msg);
        } finally {
            clearTimeout(wakeTimer);
            setLoading(false);
            setLoadingMsg('Authorizing...');
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center px-6 py-20 relative overflow-hidden">
                {/* Background effects */}
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.1),transparent)] pointer-events-none" />
                
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 120 }}
                    className="max-w-2xl w-full bg-white dark:bg-slate-800 rounded-[3rem] p-12 shadow-[0_50px_100px_rgba(0,0,0,0.3)] border border-white/10 relative z-10"
                >
                    <div className="w-24 h-24 bg-blue-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-10 shadow-xl shadow-blue-500/20 transform -rotate-6">
                        <ShieldCheck size={48} />
                    </div>
                    
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-6 text-center tracking-tight">
                        Your Professional <br /> <span className="text-blue-600">3-Day Trial is Live!</span>
                    </h2>
                    
                    {trialInfo ? (
                        <div className="space-y-8">
                            <p className="text-slate-500 text-center font-medium text-lg leading-relaxed">
                                {formData.systemType === 'POS Online' 
                                    ? "Launch your cloud environment immediately. Your security key is generated and ready."
                                    : formData.systemType === 'Detail Care'
                                    ? "Launch your specialized Detail Care PWA sandbox immediately. Your security key and secure credentials are ready."
                                    : `Download your ${formData.systemType} package below. Use your unique security key to activate.`}
                            </p>
                            
                            <motion.div 
                                initial={{ scale: 0.95 }}
                                animate={{ scale: 1 }}
                                className="bg-slate-50 dark:bg-slate-900 p-8 rounded-[2rem] border-2 border-dashed border-blue-200 dark:border-blue-800 relative group overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Clock size={80} className="text-blue-600" />
                                </div>
                                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600 mb-3 block">Digital Security Key</label>
                                <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-widest break-all bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 select-all shadow-inner">
                                    {trialInfo.licenseKey}
                                </div>
                                <div className="flex items-center gap-2 mt-4 text-slate-400 font-bold text-xs">
                                    <Clock size={14} /> 
                                    <span>EXPIRES ON: {new Date(trialInfo.expiryDate).toLocaleDateString()}</span>
                                </div>
                            </motion.div>

                            {formData.systemType === 'Detail Care' && (
                                <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 space-y-3">
                                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600">Secure Access Credentials</h4>
                                    <div className="text-sm font-bold text-slate-700 dark:text-slate-300 space-y-1">
                                        <p>Email: <span className="text-slate-900 dark:text-white select-all">detailcare@demo.com</span></p>
                                        <p>Password: <span className="text-slate-900 dark:text-white select-all">detailcare123</span></p>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium">Use these to log into your clinic dashboard once launched.</p>
                                </div>
                            )}

                            <div className="flex flex-col gap-4">
                                <motion.a 
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    href={formData.systemType === 'POS Online' 
                                        ? `https://hudi-pos-online.onrender.com/activation?key=${trialInfo.licenseKey}` 
                                        : formData.systemType === 'Hospital Management System (HMS)'
                                        ? `https://hudi-soft-com-sz9e.vercel.app/?key=${trialInfo.licenseKey}`
                                        : formData.systemType === 'Detail Care'
                                        ? `https://hudi-soft-com-2g8v.vercel.app/login?key=${trialInfo.licenseKey}`
                                        : trialInfo.downloadUrl}
                                    target={formData.systemType === 'POS Online' || formData.systemType === 'Hospital Management System (HMS)' || formData.systemType === 'Detail Care' ? "_blank" : "_self"}
                                    rel="noopener noreferrer"
                                    className="w-full py-6 bg-blue-600 text-white rounded-2xl font-black text-center text-lg hover:bg-blue-700 transition-all shadow-2xl shadow-blue-500/30 flex items-center justify-center gap-3"
                                >
                                    <Zap size={20} fill="currentColor" />
                                    {formData.systemType === 'POS Online' ? 'Launch Cloud Environment' : formData.systemType === 'Detail Care' ? 'Launch Detail Care PWA' : 'Download Professional Installer'}
                                </motion.a>
                                <p className="text-[11px] text-slate-400 text-center font-bold uppercase tracking-widest leading-relaxed">
                                    {formData.systemType === 'POS Online' || formData.systemType === 'Detail Care'
                                        ? "Install as a native app by clicking 'Install' in your browser address bar."
                                        : "Our technical team will reach out shortly for setup assistance."}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center">
                            <p className="text-slate-600 dark:text-slate-300 mb-8 text-lg font-medium">
                                We've received your request. Our enterprise advisors will contact you at <strong>{formData.phone}</strong> shortly.
                            </p>
                        </div>
                    )}
                    
                    <Link to="/" className="mt-8 text-slate-400 font-bold hover:text-blue-600 transition-colors block text-center uppercase text-xs tracking-widest">
                        Return to Headquarters
                    </Link>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-700 relative overflow-hidden flex flex-col">
            {/* Animated Background Elements */}
            <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-blue-600/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-purple-600/5 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2" />

            <header className="relative z-20 max-w-7xl mx-auto w-full px-6 py-10 flex justify-between items-center">
                <Link to="/" className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black">H</div>
                    <span className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">HUDI<span className="text-blue-600">SOFT</span></span>
                </Link>
                <Link to="/" className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-all">
                    <ArrowLeft size={16} /> Back
                </Link>
            </header>

            <main className="flex-1 relative z-10 max-w-7xl mx-auto w-full px-6 pb-20 flex flex-col lg:flex-row gap-20 items-center justify-center">
                <motion.div 
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:w-1/2 space-y-10"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
                        <Zap size={14} fill="currentColor" /> Enterprise Access
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white leading-[0.9] tracking-tighter">
                        Power your <br /> business with <br /> <span className="text-blue-600">HUDI SOFT.</span>
                    </h1>
                    <div className="space-y-6">
                        {[
                            { icon: <Clock />, text: "Instant 3-Day Full-Access Trial" },
                            { icon: <ShieldCheck />, text: "Secure Machine-ID Binding" },
                            { icon: <Globe />, text: "24/7 Digital Operations Support" }
                        ].map((item, i) => (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 + (i * 0.1) }}
                                key={i} 
                                className="flex items-center gap-4 text-slate-600 dark:text-slate-400 font-bold"
                            >
                                <div className="text-blue-600">{item.icon}</div>
                                <span>{item.text}</span>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="lg:w-1/2 w-full max-w-[580px] bg-white dark:bg-slate-900 rounded-[3rem] p-10 md:p-14 shadow-[0_50px_100px_rgba(0,0,0,0.1)] border border-slate-100 dark:border-slate-800"
                >
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">Full Identity</label>
                                    <input
                                        name="name" required value={formData.name} onChange={handleChange}
                                        placeholder="Name"
                                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold placeholder:opacity-50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">Business Email</label>
                                    <input
                                        name="email" type="email" required value={formData.email} onChange={handleChange}
                                        placeholder="Email"
                                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold placeholder:opacity-50"
                                    />
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">Secure Phone</label>
                                    <input
                                        name="phone" required value={formData.phone} onChange={handleChange}
                                        placeholder="+252"
                                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold placeholder:opacity-50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">Company Name</label>
                                    <input
                                        name="companyName" required value={formData.companyName} onChange={handleChange}
                                        placeholder="Enterprise"
                                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold placeholder:opacity-50"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4 pt-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">Selected Solution</label>
                                <div className="grid grid-cols-1 gap-3">
                                    {[
                                        { value: 'POS Online', label: 'Cloud POS Solution' },
                                        { value: 'POS Desktop', label: 'Desktop Enterprise' },
                                        { value: 'Hospital Management System (HMS)', label: 'HMS PWA Demo' },
                                        { value: 'Detail Care', label: 'Detail Care Clinic PWA' }
                                    ].map((option) => (
                                        <label 
                                            key={option.value} 
                                            className={`flex items-center gap-4 p-5 rounded-2xl border transition-all cursor-pointer ${
                                                formData.systemType === option.value 
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' 
                                                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-500'
                                            }`}
                                        >
                                            <input
                                                type="radio" name="systemType" value={option.value}
                                                checked={formData.systemType === option.value} onChange={handleChange}
                                                className="hidden"
                                            />
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.systemType === option.value ? 'border-white' : 'border-slate-300'}`}>
                                                {formData.systemType === option.value && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                                            </div>
                                            <span className="font-bold uppercase text-[11px] tracking-widest">{option.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {error && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center space-y-2"
                            >
                                <p>{error}</p>
                                <button
                                    type="button"
                                    onClick={() => setError(null)}
                                    className="underline text-red-400 hover:text-red-600 transition-colors normal-case tracking-normal text-xs font-bold"
                                >
                                    Dismiss and try again
                                </button>
                            </motion.div>
                        )}

                        <div className="pt-6">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit" disabled={loading}
                                className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.3em] hover:bg-blue-700 transition-all shadow-[0_20px_50px_rgba(37,99,235,0.2)] disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                                {loading && (
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                                    </svg>
                                )}
                                {loading ? loadingMsg : 'Claim Free 3-Day Trial'}
                            </motion.button>
                            {loading && (
                                <p className="text-center text-[10px] text-slate-400 font-bold mt-3 uppercase tracking-widest">
                                    This may take up to 20 seconds on first request
                                </p>
                            )}
                        </div>
                    </form>
                </motion.div>
            </main>

            <footer className="relative z-10 max-w-7xl mx-auto w-full px-6 py-10 flex justify-center opacity-30 grayscale pointer-events-none">
                <p className="text-[9px] uppercase tracking-[0.5em] font-black text-slate-900 dark:text-white">© 2026 HUDI SOFT SYSTEMS • MOGADISHU HQ</p>
            </footer>
        </div>
    );
};

export default RequestDemo;
