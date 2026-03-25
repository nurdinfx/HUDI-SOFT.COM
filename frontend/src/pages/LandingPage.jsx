import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useTheme } from '../components/ThemeProvider';
import { Moon, Sun, ShieldCheck, Zap, Globe, Play, Users, Building, Heart, ChevronDown, Mail } from 'lucide-react';
import SubscriptionSection from '../components/SubscriptionSection';
import FAQSection from '../components/FAQSection';

const Counter = ({ from, to, duration = 2 }) => {
    const [count, setCount] = useState(from);

    useEffect(() => {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
            setCount(Math.floor(progress * (to - from) + from));
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }, [from, to, duration]);

    return <span>{count}</span>;
};

const VideoPlaceholder = ({ title }) => (
    <motion.div
        whileHover={{ scale: 1.02 }}
        className="group relative aspect-video bg-slate-200 dark:bg-slate-800 rounded-3xl overflow-hidden cursor-pointer border border-slate-300 dark:border-slate-700 shadow-xl"
    >
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white scale-90 group-hover:scale-100 transition-transform border border-white/30">
                <Play size={24} fill="currentColor" />
            </div>
        </div>
        <div className="absolute bottom-6 left-6 right-6">
            <h4 className="text-white font-bold text-lg drop-shadow-md">{title}</h4>
            <p className="text-white/70 text-sm">Click to watch demo</p>
        </div>
    </motion.div>
);

const LogoMarquee = () => {
    const logos = [
        "TESLA", "AMAZON", "GOOGLE", "MICROSOFT", "DAHABSHIIL", "TELESOM", "HORMUUD", "HUDI-SOFT"
    ];

    return (
        <div className="py-12 bg-white/30 dark:bg-slate-900/30 overflow-hidden border-y border-slate-200 dark:border-slate-800">
            <div className="flex whitespace-nowrap animate-marquee">
                {[...logos, ...logos].map((logo, i) => (
                    <div key={i} className="mx-12 text-2xl font-black text-slate-300 dark:text-slate-700 tracking-tighter transition-colors hover:text-blue-500">
                        {logo}
                    </div>
                ))}
            </div>
        </div>
    );
};

const MegaMenu = ({ isOpen, content }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute top-full left-0 right-0 w-full bg-white text-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-t border-slate-100 py-12 z-40 overflow-hidden"
                >
                    <div className="max-w-[1400px] mx-auto px-6 grid grid-cols-12 gap-12">
                        {/* Featured Vertical Section */}
                        <div className="col-span-4 space-y-6">
                            {content.featured.map((item, i) => (
                                <Link key={i} to={item.link} className="block group">
                                    <div className="flex gap-6 p-4 rounded-3xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                        <div className="w-32 h-20 bg-slate-100 rounded-2xl overflow-hidden shadow-inner flex-shrink-0">
                                            <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 bg-blue-100 text-[10px] font-black text-blue-600 rounded-full uppercase tracking-tighter">
                                                    {item.badge}
                                                </span>
                                            </div>
                                            <h4 className="font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
                                                {item.title}
                                            </h4>
                                            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                                {item.desc}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {/* Link Columns */}
                        <div className="col-span-8 grid grid-cols-4 gap-8">
                            {content.columns.map((col, i) => (
                                <div key={i} className="space-y-6">
                                    <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] border-b border-slate-50 pb-2">
                                        {col.title}
                                    </h5>
                                    <div className="flex flex-col gap-3">
                                        {col.links.map((link, j) => (
                                            <Link
                                                key={j}
                                                to={link.url}
                                                className="text-sm font-bold text-slate-700 hover:text-blue-600 transition-colors flex items-center group"
                                            >
                                                {link.name}
                                                {link.isNew && (
                                                    <span className="ml-2 px-1.5 py-0.5 bg-orange-100 text-[8px] font-black text-orange-600 rounded-md uppercase tracking-tighter">
                                                        New
                                                    </span>
                                                )}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const LandingPage = () => {
    const { theme, toggleTheme } = useTheme();
    const [scrolled, setScrolled] = useState(false);
    const [activeMenu, setActiveMenu] = useState(null);

    const menuData = {
        'Restaurants': {
            featured: [
                { title: 'Restaurant POS', desc: 'A powerful POS system designed for the guest experience.', badge: 'Featured', image: '/images/management.png', link: '/request-demo' },
                { title: 'Switch to HUDI', desc: 'Outgrow your tech? HUDI makes switching easy.', badge: 'Featured', image: '/images/staff.png', link: '/request-demo' },
                { title: 'New Openings', desc: "We'll handle the tech, so you can focus on what matters most.", badge: 'Featured', image: '/images/office.png', link: '/request-demo' }
            ],
            columns: [
                { title: 'Service Models', links: [{ name: 'Quick service', url: '#' }, { name: 'Full service', url: '#' }, { name: 'Fast casual', url: '#' }] },
                {
                    title: 'Restaurant Concepts', links: [
                        { name: 'Bar and lounge', url: '#' }, { name: 'Cafe and bakery', url: '#' }, { name: 'Casual dining', url: '#' },
                        { name: 'Food truck', url: '#' }, { name: 'Pizza', url: '#' }, { name: 'Fine dining', url: '#' },
                        { name: 'Hotel restaurant', url: '#' }, { name: 'Enterprise', url: '#' }
                    ]
                }
            ]
        },
        'Retail': {
            featured: [
                { title: 'Retail POS', desc: 'Create a seamless customer experience for your retail needs.', badge: 'New', image: '/images/hq.png', link: '/request-demo' }
            ],
            columns: [
                {
                    title: 'Retail Concepts', links: [
                        { name: 'Convenience', url: '#' }, { name: 'Bottle shop', url: '#' }, { name: 'Grocery', url: '#' },
                        { name: 'Butcher shop', url: '#' }, { name: 'Restaurant and retail hybrid', url: '#' }
                    ]
                }
            ]
        },
        'Products': {
            featured: [
                { title: 'HUDI Platform', desc: 'One connected platform to power every part of your business.', badge: 'Featured', image: '/images/branded_hq.png', link: '/request-demo' },
                { title: 'HUDI IQ', desc: 'The AI Assistant that takes action.', badge: 'New', image: '/images/ONE.jpg', link: '/request-demo' }
            ],
            columns: [
                { title: 'Operations Suite', links: [{ name: 'Point of sale', url: '#' }, { name: 'Catering & events', url: '#' }, { name: 'HUDI Mobile Order', url: '#', isNew: true }, { name: 'Payment processing', url: '#' }] },
                { title: 'Digital Storefront', links: [{ name: 'Online ordering', url: '#' }, { name: 'Websites', url: '#' }, { name: 'Branded mobile app', url: '#' }, { name: 'HUDI Delivery Services', url: '#' }] },
                { title: 'Marketing Suite', links: [{ name: 'Advertising', url: '#' }, { name: 'Loyalty', url: '#' }, { name: 'Email marketing', url: '#' }, { name: 'HUDI Tables', url: '#' }] },
                { title: 'Hardware', links: [{ name: 'All hardware', url: '#' }, { name: 'Handheld POS', url: '#' }, { name: 'Self-ordering kiosk', url: '#' }, { name: 'Kitchen display system', url: '#' }] }
            ]
        },
        'Resources': {
            featured: [
                { title: 'HUDI vs. Competitors', desc: 'Learn which POS system is right for you.', badge: 'Featured', image: '/images/management.png', link: '/request-demo' },
                { title: 'Tools & Templates', desc: 'Resources designed to help you run your business better.', badge: 'Free', image: '/images/ceremony.png', link: '/request-demo' }
            ],
            columns: [
                { title: 'Industry Insights', links: [{ name: 'Trends and analysis', url: '#' }, { name: 'Customer stories', url: '#' }] },
                { title: 'Support', links: [{ name: 'HUDI Support', url: '#' }, { name: 'Local partners', url: '#' }] },
                { title: 'Learning', links: [{ name: 'Innovation hub', url: '#' }, { name: 'Video courses', url: '#' }] }
            ]
        }
    };

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen relative overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors duration-500 text-slate-900 dark:text-slate-50">

            {/* Background Animated Gradient */}
            <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 dark:opacity-10 animate-blob"></div>
            <div className="absolute top-0 -right-4 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 dark:opacity-10 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 dark:opacity-10 animate-blob animation-delay-4000"></div>

            {/* Premium Header - Toasted Match */}
            <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-xl border-b border-slate-200' : 'bg-transparent'}`}>
                <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-12">
                        {/* Logo */}
                        <div className="text-2xl font-black tracking-tighter text-slate-900 flex items-center gap-1">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs">H</div>
                            HUDI<span className="text-blue-600">SOFT</span>
                        </div>

                        {/* Navigation links - Match Toast */}
                        <nav className="hidden lg:flex items-center gap-8 h-full">
                            {[
                                { name: 'Restaurants', dropdown: true },
                                { name: 'Retail', dropdown: true },
                                { name: 'Products', dropdown: true },
                                { name: 'Pricing', dropdown: false },
                                { name: 'Resources', dropdown: true }
                            ].map((item) => (
                                <div
                                    key={item.name}
                                    className="h-full flex items-center"
                                    onMouseEnter={() => item.dropdown && setActiveMenu(item.name)}
                                    onMouseLeave={() => setActiveMenu(null)}
                                >
                                    <div className={`group flex items-center gap-1 text-sm font-bold transition-colors cursor-pointer py-8 ${activeMenu === item.name ? 'text-blue-600' : 'text-slate-700 hover:text-blue-600'}`}>
                                        {item.name}
                                        {item.dropdown && <ChevronDown size={14} className={`opacity-50 transition-transform ${activeMenu === item.name ? 'rotate-180' : ''}`} />}
                                    </div>

                                    {item.dropdown && <MegaMenu isOpen={activeMenu === item.name} content={menuData[item.name]} />}
                                </div>
                            ))}
                        </nav>
                    </div>

                    <div className="flex items-center gap-8">
                        {/* Right side utilities */}
                        <div className="hidden xl:flex items-center gap-6">
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-blue-600 cursor-pointer">
                                <Building size={16} className="text-blue-600" />
                                <span>Find Software</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-blue-600 cursor-pointer">
                                <Globe size={16} className="text-blue-600" />
                                <span>SOM</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <Link to="/admin/login" className="px-5 py-2.5 text-sm font-bold text-blue-600 border-2 border-blue-600 rounded-xl hover:bg-blue-50 transition-colors">
                                Login
                            </Link>
                            <Link to="/request-demo" className="px-6 py-2.5 text-sm font-black text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 whitespace-nowrap">
                                Get a Demo
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <main className="relative z-10 max-w-[1400px] mx-auto px-6 pt-32 pb-40">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        className="space-y-10"
                    >
                        {/* Trust Badge */}
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-orange-600 rounded-full flex items-center justify-center text-white">
                                <ShieldCheck size={12} fill="currentColor" />
                            </div>
                            <span className="text-sm font-bold text-slate-600">164,000* locations like yours choose HUDI SOFT</span>
                        </div>

                        <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[0.9] text-slate-900">
                            HUDI Soft powers the <br />
                            <span className="text-blue-600">places people love</span>
                        </h1>

                        <p className="text-xl md:text-2xl text-slate-600 font-light max-w-xl">
                            Find out what a POS built for restaurants and retail can do for you.
                        </p>

                        <div className="max-w-md">
                            <form className="relative group">
                                <div className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                    <Mail size={20} />
                                </div>
                                <input
                                    type="email"
                                    placeholder="Email address*"
                                    className="w-full bg-white border-2 border-slate-200 pl-16 pr-44 py-5 rounded-2xl outline-none focus:border-blue-600 focus:ring-8 focus:ring-blue-600/5 transition-all font-bold text-lg"
                                />
                                <button className="absolute right-2 top-2 bottom-2 px-8 bg-blue-600 text-white rounded-xl font-black uppercase text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]">
                                    Get Started
                                </button>
                            </form>
                            <p className="mt-4 text-sm font-bold text-slate-500">
                                Under 10 employees? <Link to="/request-demo" className="text-blue-600 hover:underline">Shop Now →</Link>
                            </p>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className="relative"
                    >
                        {/* Video Container with Orange Border */}
                        <div className="relative p-3 rounded-[3rem] bg-orange-500 shadow-2xl overflow-hidden group">
                            <div className="relative aspect-[16/10] bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-inner border border-white/20">
                                <img
                                    src="/images/ONE.jpg"
                                    alt="HUDI POS"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                />

                                {/* HUDI Overlay */}
                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/10 transition-colors">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="bg-white px-8 py-4 rounded-full flex items-center gap-4 text-blue-900 font-black shadow-2xl border border-white/50"
                                    >
                                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white">
                                            <Play size={16} fill="currentColor" />
                                        </div>
                                        Meet HUDI in 90 seconds
                                    </motion.button>
                                </div>

                                {/* Video Caption */}
                                <div className="absolute bottom-10 left-10 flex items-center gap-3 text-white">
                                    <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                                    </div>
                                    <span className="text-xs font-black uppercase tracking-widest drop-shadow-md">HUDI Point of Sale</span>
                                </div>
                            </div>
                        </div>

                        {/* Decorative background blobs */}
                        <div className="absolute -z-10 -top-20 -right-20 w-96 h-96 bg-orange-500/10 rounded-full blur-[120px] animate-blob"></div>
                        <div className="absolute -z-10 -bottom-20 -left-20 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] animate-blob animation-delay-4000"></div>
                    </motion.div>
                </div>
            </main>

            {/* Trust Badges */}
            <section className="py-12 bg-white dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 relative z-10">
                <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center gap-8 md:gap-16 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
                    <div className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-slate-200"><ShieldCheck className="text-blue-500" /> Military-grade Security</div>
                    <div className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-slate-200"><Zap className="text-yellow-500" /> Lightning Fast API</div>
                    <div className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-slate-200"><Globe className="text-green-500" /> Somali Mobile Money Supported</div>
                </div>
            </section>

            <LogoMarquee />

            {/* Product Spotlight Section */}
            <section className="relative z-10 py-32 space-y-40">
                {/* POS System */}
                <div id="products" className="max-w-7xl mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-20 items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="space-y-8"
                        >
                            <h2 className="text-5xl md:text-6xl font-black leading-tight">
                                Built for the <br /> <span className="text-blue-600">modern retailer.</span>
                            </h2>
                            <p className="text-xl text-slate-600 dark:text-slate-400 font-light leading-relaxed">
                                Our POS licensing engine powers multi-branch retail stores across East Africa. From inventory sync to offline sales, we've got you covered.
                            </p>
                            <ul className="space-y-4">
                                {[
                                    'Multi-store inventory synchronization',
                                    'Offline-first architecture for unstable networks',
                                    'Comprehensive sales & thermal print reports',
                                    'Automated shift & staff management'
                                ].map((feature, i) => (
                                    <li key={i} className="flex gap-3 items-start">
                                        <div className="mt-1.5 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                                            <ShieldCheck size={12} className="text-white" />
                                        </div>
                                        <span className="font-bold text-slate-700 dark:text-slate-300">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="pt-6">
                                <button className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition-colors shadow-xl shadow-blue-500/20">
                                    Demo Retail POS
                                </button>
                            </div>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="bg-slate-100 dark:bg-slate-800 rounded-[3rem] p-4 p-8 shadow-2xl border border-white dark:border-slate-800 overflow-hidden"
                        >
                            <motion.img
                                whileHover={{ scale: 1.05 }}
                                src="/images/office.png"
                                className="rounded-3xl w-full h-[400px] object-cover shadow-lg"
                            />
                        </motion.div>
                    </div>
                </div>

                {/* Hospital System */}
                <div className="max-w-7xl mx-auto px-6 bg-slate-900 py-32 lg:rounded-[4rem] text-white">
                    <div className="grid lg:grid-cols-2 gap-20 items-center">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="order-2 lg:order-1 bg-white/5 rounded-[3rem] p-8 backdrop-blur-sm border border-white/10 overflow-hidden"
                        >
                            <motion.img
                                whileHover={{ scale: 1.05 }}
                                src="/images/branded_hq.png"
                                className="rounded-3xl w-full h-[400px] object-cover shadow-2xl"
                            />
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="order-1 lg:order-2 space-y-8"
                        >
                            <h2 className="text-5xl md:text-6xl font-black leading-tight">
                                Streamlined <br /> <span className="text-blue-400">clinic workflows.</span>
                            </h2>
                            <p className="text-xl text-slate-300 font-light leading-relaxed">
                                Our HMS engine is designed to handle the complexity of patient records and clinic billing with military-grade precision.
                            </p>
                            <ul className="space-y-4">
                                {[
                                    'Secure electronic medical records (EMR)',
                                    'Automated patient billing & laboratory sync',
                                    'Doctor scheduling & prescription tracking',
                                    'Real-time pharmaceutical inventory'
                                ].map((feature, i) => (
                                    <li key={i} className="flex gap-3 items-start">
                                        <div className="mt-1.5 w-5 h-5 rounded-full bg-blue-400 flex items-center justify-center flex-shrink-0">
                                            <ShieldCheck size={12} className="text-slate-900" />
                                        </div>
                                        <span className="font-bold text-slate-200">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="pt-6">
                                <button className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black text-lg hover:bg-slate-100 transition-colors shadow-xl shadow-white/10">
                                    Demo Hospital System
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Plan Comparison Table */}
            <section id="pricing" className="py-32 relative z-10 px-6 max-w-5xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-black mb-4 uppercase">Transparent Pricing</h2>
                    <p className="text-slate-500 dark:text-slate-400">Choose the license that fits your business scale.</p>
                </div>

                <div className="overflow-x-auto rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900/50">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50">
                                <th className="p-8 text-xl font-black">Features</th>
                                <th className="p-8 text-center">
                                    <div className="text-xl font-black text-blue-600">5-YEAR PLAN</div>
                                    <div className="text-sm font-bold opacity-50">$400 / One-time</div>
                                </th>
                                <th className="p-8 text-center">
                                    <div className="text-xl font-black">MONTHLY RENT</div>
                                    <div className="text-sm font-bold opacity-50">$15 / Month</div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {[
                                { name: 'Full Version Access', a: true, b: true },
                                { name: 'Machine-ID Binding', a: 'Single Device', b: 'Single Device' },
                                { name: 'Priority Support', a: true, b: false },
                                { name: 'License Duration', a: '60 Months', b: '30 Days' },
                                { name: 'Offline Mode', a: true, b: true },
                                { name: 'Cost per Month', a: '~$6.60', b: '$15.00' }
                            ].map((row, i) => (
                                <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                    <td className="p-6 font-bold text-slate-700 dark:text-slate-300">{row.name}</td>
                                    <td className="p-6 text-center">
                                        {typeof row.a === 'boolean' ? (row.a ? <ShieldCheck className="mx-auto text-emerald-500" /> : <div className="w-6 h-6 border-2 border-slate-200 dark:border-slate-700 rounded-full mx-auto" />) : <span className="font-bold">{row.a}</span>}
                                    </td>
                                    <td className="p-6 text-center">
                                        {typeof row.b === 'boolean' ? (row.b ? <ShieldCheck className="mx-auto text-emerald-500" /> : <div className="w-6 h-6 border-2 border-slate-200 dark:border-slate-700 rounded-full mx-auto" />) : <span className="font-bold">{row.b}</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Testimonials Section */}
            <section className="py-32 bg-blue-600 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Voice of Somali Business</h2>
                        <p className="text-blue-100 text-lg">See why thousands of entrepreneurs trust HUDI SOFT.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { quote: "The 5-year plan changed how we manage our 12 stores. Total security, no monthly headaches.", author: "Ahmed Salad", role: "CEO, Salad Supermarkets" },
                            { quote: "Implementing the HMS license was seamless. Our clinic is now fully digital and patient-ready.", author: "Dr. Maryam Ali", role: "Director, Mogadishu Medical" },
                            { quote: "Support is top-notch. Any issues with machine binding were solved in minutes.", author: "Liban Farah", role: "Founder, Liban Retail" }
                        ].map((t, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-[2.5rem] shadow-2xl"
                            >
                                <div className="flex gap-1 mb-6">
                                    {[1, 2, 3, 4, 5].map(j => <Zap key={j} size={16} fill="white" className="text-white" />)}
                                </div>
                                <p className="text-white text-xl font-light italic mb-8 leading-relaxed">"{t.quote}"</p>
                                <div>
                                    <h4 className="text-white font-black">{t.author}</h4>
                                    <p className="text-blue-200 text-sm">{t.role}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Existing Company & Team Visuals */}
            <section className="py-32 relative z-10 px-6 bg-white/50 dark:bg-slate-950/50 border-y border-slate-200 dark:border-slate-800">
                {/* ... (already holds Ceremony and Management sections) */}
                <div className="max-w-7xl mx-auto">
                    {/* (Refitting existing sections here for visual consistency) */}
                    <div className="grid lg:grid-cols-2 gap-20 items-center mb-32">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="space-y-8"
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-sm font-bold uppercase tracking-widest">
                                <Building size={16} /> Our Headquarters
                            </div>
                            <h2 className="text-4xl md:text-6xl font-black leading-tight text-slate-900 dark:text-white">
                                The Core of <br /> Software Excellence
                            </h2>
                            <p className="text-xl text-slate-600 dark:text-slate-400 font-light leading-relaxed">
                                Based in the heart of Mogadishu, Hudi Soft Systems operates from our state-of-the-art skyscraper. We are more than a software house; we are the engine powering the digital transformation of East Africa.
                            </p>
                            <div className="grid grid-cols-2 gap-8 pt-4">
                                <div className="space-y-2">
                                    <h4 className="text-3xl font-black text-blue-600 dark:text-blue-400">200+</h4>
                                    <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Engineers</p>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-3xl font-black text-purple-600 dark:text-purple-400">24/7</h4>
                                    <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Security Support</p>
                                </div>
                            </div>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="relative overflow-hidden rounded-[2.5rem]"
                        >
                            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-[3rem] blur-2xl opacity-20 animate-pulse"></div>
                            <motion.img
                                animate={{ scale: [1, 1.05], x: [0, -10], y: [0, -5] }}
                                whileHover={{ scale: 1.1 }}
                                transition={{
                                    scale: { duration: 20, repeat: Infinity, repeatType: "mirror", ease: "linear" },
                                    whileHover: { duration: 0.4 }
                                }}
                                src="/images/branded_hq.png"
                                alt="Hudi Soft Branded HQ"
                                className="relative rounded-[2.5rem] shadow-2xl border border-white/20 object-cover aspect-[4/3] w-full cursor-zoom-in"
                            />
                        </motion.div>
                    </div>

                    {/* Office Environment */}
                    <div className="grid lg:grid-cols-2 gap-20 items-center mb-32">
                        <motion.div
                            initial={{ opacity: 0, order: 2 }}
                            whileInView={{ opacity: 1, order: 1 }}
                            viewport={{ once: true }}
                            className="relative lg:order-1 overflow-hidden rounded-[2.5rem]"
                        >
                            <motion.img
                                animate={{ scale: [1.1, 1.2], rotate: [0, 1] }}
                                whileHover={{ scale: 1.25 }}
                                transition={{
                                    default: { duration: 25, repeat: Infinity, repeatType: "mirror", ease: "linear" },
                                    whileHover: { duration: 0.4 }
                                }}
                                src="/images/office.png"
                                alt="Office Environment"
                                className="rounded-[2.5rem] shadow-2xl border border-white/20 object-cover aspect-[16/10] w-full cursor-zoom-in"
                            />
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, x: 30, order: 1 }}
                            whileInView={{ opacity: 1, x: 0, order: 2 }}
                            viewport={{ once: true }}
                            className="space-y-8 lg:order-2"
                        >
                            <h3 className="text-4xl font-black text-slate-900 dark:text-white">Innovative Environment</h3>
                            <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed font-light">
                                Our workspace is designed for deep focus and collaborative problem solving. With high-speed fiber connectivity and ergonomic design, our team works in a world-class environment.
                            </p>
                            <ul className="space-y-4">
                                {["Edge-computing Infrastructure", "Agile Sprints Rooms", "24/7 Data Monitoring Center"].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 font-bold text-slate-700 dark:text-slate-300">
                                        <div className="w-2 h-2 rounded-full bg-blue-500"></div> {item}
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    </div>

                    {/* Ceremony Section */}
                    <div className="mb-32">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="relative rounded-[3rem] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800"
                        >
                            <motion.img
                                animate={{ scale: [1, 1.03] }}
                                whileHover={{ scale: 1.08 }}
                                transition={{
                                    scale: { duration: 15, repeat: Infinity, repeatType: "mirror", ease: "linear" },
                                    whileHover: { duration: 0.4 }
                                }}
                                src="/images/ceremony.png"
                                alt="Staff Launch Ceremony"
                                className="w-full h-auto aspect-video object-cover cursor-zoom-in"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-12">
                                <div className="max-w-3xl">
                                    <h3 className="text-4xl font-black text-white mb-4">A Legacy of Celebration</h3>
                                    <p className="text-white/80 text-lg font-light leading-relaxed">
                                        Our journey is defined by unity. Here, our global staff force gathers to celebrate the launch of our enterprise licensing engine, holding the HUDI-SOFT banner that represents our commitment to excellence and security.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Management & Staff */}
                    <div className="space-y-20">
                        <div className="text-center max-w-3xl mx-auto space-y-4">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-sm font-bold uppercase tracking-widest">
                                <Users size={16} /> Our Family
                            </div>
                            <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white">The Minds Behind The Engine</h2>
                        </div>

                        <div className="grid md:grid-cols-2 gap-12">
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="space-y-6"
                            >
                                <motion.img
                                    whileHover={{ scale: 1.05 }}
                                    src="/images/management.png"
                                    alt="Management Team"
                                    className="rounded-3xl shadow-xl w-full aspect-video object-cover cursor-zoom-in transition-transform"
                                />
                                <h4 className="text-2xl font-black">Advisory & Management</h4>
                                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Leading with vision and technical expertise, our management team ensures Hudi Soft remains the most trusted licensing provider in the region.
                                </p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.2 }}
                                className="space-y-6"
                            >
                                <motion.img
                                    whileHover={{ scale: 1.05 }}
                                    src="/images/staff.png"
                                    alt="Full Staff Team"
                                    className="rounded-3xl shadow-xl w-full aspect-video object-cover cursor-zoom-in transition-transform"
                                />
                                <h4 className="text-2xl font-black">Our Technical Force</h4>
                                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                                    From security architects to full-stack developers, our team is a unified force dedicated to software integrity and protection.
                                </p>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Subscription Pricing */}
            <div className="relative z-10">
                <SubscriptionSection />
            </div>

            {/* FAQ */}
            <div className="relative z-10">
                <FAQSection />
            </div>

            {/* Footer */}
            <footer className="bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 py-24 relative z-10 border-t border-slate-200 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid md:grid-cols-4 gap-16 mb-20">
                        <div className="col-span-2 space-y-8">
                            <div className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white">
                                HUDI<span className="font-light text-blue-600">SOFT</span>
                            </div>
                            <p className="max-w-md text-lg leading-relaxed font-light">
                                Empowering the next generation of Somali enterprises with secure, scalable, and innovative software licensing solutions.
                            </p>
                            <div className="flex gap-4">
                                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 hover:text-blue-600 transition-colors cursor-pointer"><Building size={20} /></div>
                                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 hover:text-blue-600 transition-colors cursor-pointer"><Globe size={20} /></div>
                                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 hover:text-blue-600 transition-colors cursor-pointer"><ShieldCheck size={20} /></div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <h5 className="text-slate-900 dark:text-white font-black uppercase text-xs tracking-widest">Solutions</h5>
                            <ul className="space-y-4 text-sm font-bold">
                                <li className="hover:text-blue-600 transition cursor-pointer">POS Licensing</li>
                                <li className="hover:text-blue-600 transition cursor-pointer">HMS Security</li>
                                <li className="hover:text-blue-600 transition cursor-pointer">Machine Binding</li>
                                <li className="hover:text-blue-600 transition cursor-pointer">Custom Enterprise</li>
                            </ul>
                        </div>
                        <div className="space-y-6">
                            <h5 className="text-slate-900 dark:text-white font-black uppercase text-xs tracking-widest">Support</h5>
                            <ul className="space-y-4 text-sm font-bold">
                                <li className="hover:text-blue-600 transition cursor-pointer">Documentation</li>
                                <li className="hover:text-blue-600 transition cursor-pointer">Admin Login</li>
                                <li className="hover:text-blue-600 transition cursor-pointer">Terms of Service</li>
                                <li className="hover:text-blue-600 transition cursor-pointer">Contact Us</li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-12 border-t border-slate-100 dark:border-slate-900 flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="flex items-center gap-6 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all">
                            <span className="text-xs font-black uppercase tracking-tighter mr-2">WE ACCEPT</span>
                            <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-[10px] font-black rounded-lg border border-blue-100 dark:border-blue-800">EVC PLUS</div>
                            <div className="px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-[10px] font-black rounded-lg border border-green-100 dark:border-green-800">ZAAD</div>
                            <div className="px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-[10px] font-black rounded-lg border border-amber-100 dark:border-amber-800">SAHAL</div>
                        </div>
                        <p className="text-[10px] uppercase tracking-widest font-black opacity-30">© 2026 Hudi Soft Systems. Mogadishu HQ.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
