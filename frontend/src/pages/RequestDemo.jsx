import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ShieldCheck, Zap, Globe, Building, ArrowLeft } from 'lucide-react';
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
        try {
            const { data } = await API.post('/leads', formData);
            if (data.trial) {
                setTrialInfo(data.trial);
            }
            setSubmitted(true);
        } catch (error) {
            console.error('Error submitting demo request:', error);
            setError(error.response?.data?.message || 'Could not connect to the server. Please ensure the backend is running.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6 py-20">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-2xl w-full bg-white rounded-[3rem] p-12 shadow-2xl border border-slate-100"
                >
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8">
                        <ShieldCheck size={40} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-4 text-center">Your Trial is Ready!</h2>
                    
                    {trialInfo ? (
                        <div className="space-y-6 text-left mb-8">
                            <p className="text-slate-600 text-center font-light">
                                We've generated a 3-day free trial license for your {formData.systemType.split(' ')[2]}. 
                                Download the system below and use this key to activate it.
                            </p>
                            
                            <div className="bg-slate-50 p-6 rounded-3xl border border-dashed border-blue-200">
                                <label className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-2 block">Your Trial License Key</label>
                                <div className="text-2xl font-black text-slate-900 tracking-wider break-all bg-white p-4 rounded-xl border border-slate-100 select-all">
                                    {trialInfo.licenseKey}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2 font-bold italic">Valid until: {new Date(trialInfo.expiryDate).toLocaleDateString()}</p>
                            </div>

                            <div className="flex flex-col gap-4">
                                <a 
                                    href={trialInfo.downloadUrl}
                                    className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-center hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20"
                                >
                                    Download System Installer
                                </a>
                                <p className="text-xs text-slate-400 text-center italic">
                                    Need help? Our team will still reach out to {formData.phone} shortly.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center">
                            <p className="text-slate-600 mb-8 font-light">
                                Thank you for your interest in HUDI SOFT. Our support team will reach out to <strong>{formData.phone}</strong> within 24 hours to schedule your demo.
                            </p>
                        </div>
                    )}
                    
                    <Link to="/" className="text-blue-600 font-black hover:underline block text-center">
                        Back to Home
                    </Link>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-20 px-6">
            <Link to="/" className="fixed top-10 left-10 p-3 bg-white rounded-full shadow-lg hover:bg-slate-50 transition-colors z-50">
                <ArrowLeft size={20} className="text-slate-900" />
            </Link>

            <div className="max-w-[700px] mx-auto bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100">
                <div className="p-12 md:p-16">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Schedule Your Free Demo</h1>
                        <p className="text-slate-500 font-light leading-relaxed">
                            Experience the power of HUDI SOFT. We'll reach out within 24 hours to schedule your personalized session.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Full Name</label>
                                <input
                                    name="name" required value={formData.name} onChange={handleChange}
                                    placeholder="John Doe"
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold placeholder:font-light"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Email Address</label>
                                <input
                                    name="email" type="email" required value={formData.email} onChange={handleChange}
                                    placeholder="john@company.com"
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold placeholder:font-light"
                                />
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Phone Number</label>
                                <input
                                    name="phone" required value={formData.phone} onChange={handleChange}
                                    placeholder="+252 ..."
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold placeholder:font-light"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Business Name</label>
                                <input
                                    name="companyName" required value={formData.companyName} onChange={handleChange}
                                    placeholder="My Enterprise"
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold placeholder:font-light"
                                />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Tell us about yourself.</label>
                            <div className="space-y-3">
                                {[
                                    { value: 'POS Online', label: 'I\'d like a POS Online consultation (Cloud App)' },
                                    { value: 'POS Desktop', label: 'I\'d like a POS Offline consultation (Desktop App)' },
                                    { value: 'Inventory System', label: 'I\'d like a Hospital System consultation' },
                                    { value: 'Existing Customer', label: 'I\'m an existing customer' },
                                    { value: 'Other', label: 'Other' }
                                ].map((option) => (
                                    <label key={option.value} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
                                        <input
                                            type="radio" name="systemType" value={option.value}
                                            checked={formData.systemType === option.value} onChange={handleChange}
                                            className="w-5 h-5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                        <span className="font-bold text-slate-700">{option.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Zip / Region Code</label>
                            <input
                                name="zipCode" value={formData.zipCode} onChange={handleChange}
                                placeholder="e.g. 252"
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold placeholder:font-light"
                            />
                        </div>

                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-bold text-center"
                            >
                                {error}
                            </motion.div>
                        )}

                        <div className="pt-6">
                            <button
                                type="submit" disabled={loading}
                                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-[0_20px_50px_rgba(37,99,235,0.2)] disabled:opacity-50"
                            >
                                {loading ? 'Submitting...' : 'Get a Demo'}
                            </button>
                            <p className="text-center text-[10px] text-slate-400 mt-6 uppercase font-black tracking-widest">
                                Are you an HUDI SOFT customer? <Link to="/admin/login" className="text-blue-600 hover:underline">Log in to HUDI SOFT</Link>.
                            </p>
                        </div>
                    </form>
                </div>
            </div>

            <div className="text-center mt-12 mb-20 opacity-30 grayscale pointer-events-none">
                <div className="text-3xl font-black tracking-tighter text-slate-900 mb-2">HUDI<span className="font-light text-blue-600">SOFT</span></div>
            </div>
        </div>
    );
};

export default RequestDemo;
