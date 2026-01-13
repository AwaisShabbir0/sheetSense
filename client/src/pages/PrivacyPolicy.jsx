import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { motion } from 'framer-motion';

const PrivacyPolicy = () => {
    return (
        <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-black flex flex-col">
            <Navbar />

            <main className="flex-grow pt-24 pb-12 px-4 sm:px-6">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-4xl font-bold font-outfit mb-8 text-primary">Privacy Policy</h1>

                        <div className="space-y-8 text-white/80 leading-relaxed font-light">
                            <section className="bg-surface border border-white/10 rounded-2xl p-8">
                                <h2 className="text-2xl font-semibold text-white mb-4">1. Information Collection</h2>
                                <p>We collect information you provide directly to us when you create an account, such as your name and email address. We also collect data related to your usage of our AI instructions to improve the service.</p>
                            </section>

                            <section className="bg-surface border border-white/10 rounded-2xl p-8">
                                <h2 className="text-2xl font-semibold text-white mb-4">2. Use of Information</h2>
                                <p>We use the information we collect to operate and improve our services, communicate with you, and personalize your experience. We do not sell your personal data to third parties.</p>
                            </section>

                            <section className="bg-surface border border-white/10 rounded-2xl p-8">
                                <h2 className="text-2xl font-semibold text-white mb-4">3. Data Security</h2>
                                <p>We implement appropriate technical and organizational measures to protect the security of your personal information. However, please note that no system is completely secure.</p>
                            </section>

                            <section className="bg-surface border border-white/10 rounded-2xl p-8">
                                <h2 className="text-2xl font-semibold text-white mb-4">4. Changes to this Policy</h2>
                                <p>We may update this privacy policy from time to time. We will notify you of any changes by posting the new privacy policy on this page.</p>
                            </section>
                        </div>
                    </motion.div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default PrivacyPolicy;
