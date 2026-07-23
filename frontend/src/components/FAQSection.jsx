import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const faqs = [
    {
        question: "How does the manual Somali payment flow work?",
        answer: "After selecting your plan and entering your company details, you will be provided with our official payment numbers for EVC Plus, ZAAD, and Sahal. Simply make the transfer and upload the screenshot of the receipt. Our team will verify it and activate your license."
    },
    {
        question: "What happens when my Monthly Rent plan expires?",
        answer: "Your desktop system will automatically lock and display a 'Subscription Expired' screen. Once you renew your payment and it is verified by the admin, access is restored immediately without any data loss."
    },
    {
        question: "Can I upgrade from Monthly to the 5-Year Plan?",
        answer: "Yes! The 5-Year Plan offers the best value with an 80% discount compared to monthly payments over 5 years. You can request an upgrade at any time through our support team."
    },
    {
        question: "Is my data secure if the license expires?",
        answer: "Absolutely. When a license expires, the system restricts access to the main features to prevent new data entry, but your existing data remains fully secure and untouched in your local database."
    }
];

const FAQSection = () => {
    const [activeIndex, setActiveIndex] = useState(null);

    const toggleAccordion = (index) => {
        setActiveIndex(activeIndex === index ? null : index);
    };

    return (
        <section className="py-24 bg-slate-100 dark:bg-slate-950">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl font-extrabold text-center text-slate-900 dark:text-white mb-12">
                    Frequently Asked Questions
                </h2>
                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden"
                        >
                            <button
                                className="w-full px-6 py-5 flex justify-between items-center focus:outline-none"
                                onClick={() => toggleAccordion(index)}
                            >
                                <span className="font-semibold text-left text-slate-900 dark:text-slate-100">
                                    {faq.question}
                                </span>
                                <motion.div
                                    animate={{ rotate: activeIndex === index ? 180 : 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <ChevronDown className="text-slate-500 dark:text-slate-400" />
                                </motion.div>
                            </button>
                            <AnimatePresence>
                                {activeIndex === index && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="px-6 pb-5 text-slate-600 dark:text-slate-400"
                                    >
                                        {faq.answer}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FAQSection;
