import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { motion } from 'framer-motion';

const TermsOfService = () => {
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
                        <h1 className="text-4xl font-bold font-outfit mb-8 text-primary">Terms of Service</h1>

                        <div className="space-y-8 text-white/80 leading-relaxed font-light">
                            <section className="bg-surface border border-white/10 rounded-2xl p-8">
                                <h2 className="text-2xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
                                <p>By accessing and using SheetSense ("the Service"), you accept and agree to be bound by the terms and provision of this agreement.</p>
                            </section>

                            <section className="bg-surface border border-white/10 rounded-2xl p-8">
                                <h2 className="text-2xl font-semibold text-white mb-4">2. Description of Service</h2>
                                <p>SheetSense provides an AI-powered spreadsheet assistant tool. You are responsible for obtaining access to the Service and that access may involve third party fees (such as Internet service provider or airtime charges).</p>
                            </section>

                            <section className="bg-surface border border-white/10 rounded-2xl p-8">
                                <h2 className="text-2xl font-semibold text-white mb-4">3. User Conduct</h2>
                                <p>You agree to use the Service only for lawful purposes. You are prohibited from posting or transmitting to or from this Service any unlawful, threatening, libelous, defamatory, obscene, or pornographic material.</p>
                            </section>

                            <section className="bg-surface border border-white/10 rounded-2xl p-8">
                                <h2 className="text-2xl font-semibold text-white mb-4">4. Disclaimer of Warranties</h2>
                                <p>The Service is provided on an "as is" and "as available" basis. SheetSense expressly disclaims all warranties of any kind, whether express or implied, including, but not limited to the implied warranties of merchantability, fitness for a particular purpose and non-infringement.</p>
                            </section>
                        </div>
                    </motion.div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default TermsOfService;
