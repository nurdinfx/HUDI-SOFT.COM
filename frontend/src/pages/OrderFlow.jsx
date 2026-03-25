import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Building2,
    CreditCard,
    Upload,
    Smartphone,
    PackageCheck
} from 'lucide-react';
import API from '../api';

const steps = [
    { id: 1, title: 'Product', icon: PackageCheck },
    { id: 2, title: 'Details', icon: Building2 },
    { id: 3, title: 'Payment', icon: CreditCard },
    { id: 4, title: 'Verify', icon: Upload }
];

const OrderFlow = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        productType: 'POS',
        subscriptionType: location.state?.type || 'Monthly',
        companyName: '',
        email: '',
        paymentMethod: 'EVC Plus',
        screenshot: null
    });

    const [previewUrl, setPreviewUrl] = useState(null);

    const products = [
        { id: 'POS', name: 'POS System', description: 'Advanced Point of Sale for retail' },
        { id: 'HMS', name: 'Hospital Management', description: 'Complete clinical management' }
    ];

    const paymentInstructions = {
        'EVC Plus': 'Please send payment to: 61XXXXXXX (Hudi Soft)',
        'ZAAD': 'Please send payment to: 4XXXXXX (Hudi Soft)',
        'Sahal': 'Please send payment to: 90XXXXXX (Hudi Soft)'
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, screenshot: file }));
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 4));
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

    const handleSubmit = async () => {
        setLoading(true);
        setError('');

        const data = new FormData();
        data.append('companyName', formData.companyName);
        data.append('email', formData.email);
        data.append('productType', formData.productType);
        data.append('subscriptionType', formData.subscriptionType);
        data.append('paymentMethod', formData.paymentMethod);
        data.append('screenshot', formData.screenshot);

        try {
            await API.post('/orders', data);
            setSuccess(true);
            setCurrentStep(5);
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <h2 className="text-2xl font-bold mb-4">Select Software Product</h2>
                        <div className="grid grid-cols-1 gap-4 font-normal">
                            {products.map(product => (
                                <div
                                    key={product.id}
                                    onClick={() => setFormData({ ...formData, productType: product.id })}
                                    className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${formData.productType === product.id
                                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                                            : 'border-slate-200 dark:border-slate-800 hover:border-blue-300'
                                        }`}
                                >
                                    <p className="font-bold text-lg">{product.name}</p>
                                    <p className="text-slate-500 text-sm">{product.description}</p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                );
            case 2:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <h2 className="text-2xl font-bold mb-4">Company Details</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Company Name</label>
                                <input
                                    type="text"
                                    name="companyName"
                                    value={formData.companyName}
                                    onChange={handleInputChange}
                                    className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    placeholder="Enter your business name"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Contact Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    placeholder="your@email.com"
                                    required
                                />
                            </div>
                        </div>
                    </motion.div>
                );
            case 3:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <h2 className="text-2xl font-bold mb-4">Payment Instructions</h2>
                        <div className="grid grid-cols-3 gap-3 mb-6">
                            {['EVC Plus', 'ZAAD', 'Sahal'].map(method => (
                                <button
                                    key={method}
                                    onClick={() => setFormData({ ...formData, paymentMethod: method })}
                                    className={`py-3 rounded-xl border-2 transition ${formData.paymentMethod === method
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 font-bold'
                                            : 'border-slate-200 dark:border-slate-800'
                                        }`}
                                >
                                    {method}
                                </button>
                            ))}
                        </div>
                        <div className="p-6 bg-slate-100 dark:bg-slate-800 rounded-2xl border-l-4 border-blue-500">
                            <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400 mb-2">
                                <Smartphone size={20} />
                                <span className="font-bold">Follow these steps:</span>
                            </div>
                            <p className="text-lg mb-4">{paymentInstructions[formData.paymentMethod]}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                1. Dial international code or use app<br />
                                2. Enter the amount: <span className="font-bold text-slate-900 dark:text-white">${formData.subscriptionType === 'FiveYear' ? '400' : '15'}</span><br />
                                3. Take a screenshot of the confirmation message.
                            </p>
                        </div>
                    </motion.div>
                );
            case 4:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <h2 className="text-2xl font-bold mb-4">Verify Payment</h2>
                        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl relative">
                            {previewUrl ? (
                                <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-4">
                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-contain bg-black" />
                                    <button
                                        onClick={() => setPreviewUrl(null)}
                                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-lg"
                                    >
                                        ×
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-full text-blue-500 mb-4">
                                        <Upload size={32} />
                                    </div>
                                    <p className="font-medium">Upload Receipt Screenshot</p>
                                    <p className="text-sm text-slate-500 mt-1">JPG or PNG (max. 5MB)</p>
                                    <input
                                        type="file"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        accept="image/*"
                                    />
                                </div>
                            )}
                        </div>
                        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                    </motion.div>
                );
            case 5:
                return (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center text-center space-y-6 py-10"
                    >
                        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-500 rounded-full flex items-center justify-center shadow-lg">
                            <CheckCircle2 size={48} />
                        </div>
                        <h2 className="text-3xl font-black">Order Received!</h2>
                        <p className="text-slate-600 dark:text-slate-400 max-w-md">
                            Thank you for choosing HUDI SOFT. Our team will verify your payment and activate your license within 24 hours.
                        </p>
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-left w-full max-w-sm">
                            <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-1 uppercase tracking-wider">Next Step</p>
                            <p className="text-sm text-slate-700 dark:text-slate-300">Keep an eye on your email <b>{formData.email}</b> for license credentials once approved.</p>
                        </div>
                        <button
                            onClick={() => navigate('/')}
                            className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold transition"
                        >
                            Back to Home
                        </button>
                    </motion.div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 flex justify-center items-start">
            <div className="max-w-xl w-full">
                <button
                    onClick={() => currentStep === 1 ? navigate('/') : prevStep()}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 mb-8 transition"
                >
                    <ArrowLeft size={18} /> Back
                </button>

                <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-3xl p-8 shadow-2xl">
                    {/* Progress Bar */}
                    {currentStep < 5 && (
                        <div className="flex justify-between mb-12 relative">
                            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 dark:bg-slate-700 -translate-y-1/2 z-0"></div>
                            {steps.map(step => {
                                const Icon = step.icon;
                                return (
                                    <div key={step.id} className="relative z-10 flex flex-col items-center">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${currentStep >= step.id
                                                ? 'bg-blue-600 text-white scale-110 shadow-lg shadow-blue-500/30'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                                            }`}>
                                            <Icon size={18} />
                                        </div>
                                        <span className={`text-xs mt-2 font-bold uppercase tracking-widest ${currentStep >= step.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
                                            }`}>
                                            {step.title}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        {renderStep()}
                    </AnimatePresence>

                    {/* Controls */}
                    {currentStep < 5 && (
                        <div className="mt-12 flex justify-end">
                            <button
                                onClick={currentStep === 4 ? handleSubmit : nextStep}
                                disabled={loading || (currentStep === 2 && (!formData.companyName || !formData.email)) || (currentStep === 4 && !formData.screenshot)}
                                className={`flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-bold shadow-xl shadow-blue-600/20 transition ${loading ? 'animate-pulse' : ''}`}
                            >
                                {loading ? 'Submitting...' : currentStep === 4 ? 'Complete Order' : 'Next'}
                                {!loading && currentStep < 4 && <ArrowRight size={18} />}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrderFlow;
