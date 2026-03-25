import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SubscriptionSection = () => {
    const navigate = useNavigate();
    const [hoveredCard, setHoveredCard] = useState(null);

    const handleSelectPlan = (plan, type) => {
        navigate('/order', { state: { plan, type } });
    };

    const cards = [
        {
            id: 'monthly',
            title: 'Monthly Rent',
            price: '$15',
            duration: '/ Month',
            description: 'Recurring monthly payment',
            features: [
                'Full System Access',
                'Cancel Anytime',
                'Affordable Entry',
                'Monthly Renewal Required'
            ],
            buttonText: 'Subscribe Now',
            popular: false
        },
        {
            id: 'five-year',
            title: '5 Year License',
            price: '$400',
            duration: ' One-Time',
            description: 'Best value for long-term commitment',
            features: [
                'Full System Access',
                '5 Years Valid License',
                'Priority Support',
                'No Monthly Fees'
            ],
            buttonText: 'Buy Now',
            popular: true
        }
    ];

    return (
        <section className="py-20 bg-slate-50 dark:bg-slate-900 transition-colors">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl font-extrabold text-slate-900 dark:text-white sm:text-5xl"
                    >
                        Simple, Transparent Pricing
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="mt-4 text-xl text-slate-600 dark:text-slate-400"
                    >
                        Choose the plan that best fits your business needs.
                        <span className="block mt-2 font-semibold text-blue-600 dark:text-blue-400">Save 80% with the 5-Year Plan.</span>
                    </motion.p>
                </div>

                <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto relative perspective-1000">
                    {/* Animated Background Gradients behind cards */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 blur-3xl rounded-full transform -translate-y-1/2"></div>

                    {cards.map((card, index) => (
                        <motion.div
                            key={card.id}
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.2, duration: 0.6 }}
                            onHoverStart={() => setHoveredCard(card.id)}
                            onHoverEnd={() => setHoveredCard(null)}
                            whileHover={{ scale: 1.02, rotateY: card.id === 'monthly' ? 2 : -2 }}
                            className={`relative flex flex-col p-8 rounded-3xl backdrop-blur-xl bg-white/70 dark:bg-slate-800/70 border-2 shadow-2xl transition-all duration-300 ${card.popular
                                    ? 'border-blue-500 dark:border-blue-400 shadow-blue-500/20'
                                    : 'border-slate-200 dark:border-slate-700'
                                }`}
                        >
                            {card.popular && (
                                <div className="absolute -top-5 left-0 right-0 flex justify-center">
                                    <span className="flex items-center gap-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-bold px-4 py-1.5 rounded-full uppercase tracking-wide shadow-lg">
                                        <Star size={14} className="fill-current" /> Most Popular
                                    </span>
                                </div>
                            )}

                            <div className="mb-6">
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{card.title}</h3>
                                <p className="text-slate-500 dark:text-slate-400 mt-2">{card.description}</p>
                            </div>

                            <div className="mb-6 flex items-baseline text-slate-900 dark:text-white">
                                <span className="text-5xl font-extrabold tracking-tight">{card.price}</span>
                                <span className="ml-1 text-xl font-medium text-slate-500 dark:text-slate-400">{card.duration}</span>
                            </div>

                            <ul className="flex-1 space-y-4 mb-8">
                                {card.features.map((feature, i) => (
                                    <motion.li
                                        key={i}
                                        className="flex items-center"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.4 + (i * 0.1) }}
                                    >
                                        <CheckCircle2 className="h-6 w-6 text-blue-500 mr-3 flex-shrink-0" />
                                        <span className="text-slate-700 dark:text-slate-300">{feature}</span>
                                    </motion.li>
                                ))}
                            </ul>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleSelectPlan(card, card.id === 'monthly' ? 'Monthly' : 'FiveYear')}
                                className={`mt-auto w-full py-4 px-6 rounded-xl text-lg font-bold shadow-lg transition-all ${card.popular
                                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-blue-500/30'
                                        : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white'
                                    }`}
                            >
                                {card.buttonText}
                            </motion.button>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default SubscriptionSection;
