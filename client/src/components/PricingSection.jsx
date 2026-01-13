import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const PricingSection = () => {
    return (
        <section className="py-24 bg-[#050505]">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-20">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-5xl font-bold mb-6"
                    >
                        Unlock your full potential
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-xl text-gray-400"
                    >
                        Choose the plan that fits your workflow.
                    </motion.p>
                </div>

                {/* Cards */}
                <div className="flex flex-col lg:flex-row justify-center items-center gap-8 max-w-7xl mx-auto">
                    <PricingCard
                        title="Starter"
                        price="$0"
                        features={[
                            "Basic Voice Commands",
                            "5 Sheets/mo",
                            "Community Support"
                        ]}
                        buttonText="Free Plan"
                        delay={0.4}
                    />
                    <PricingCard
                        title="Pro"
                        price="$29"
                        features={[
                            "Unlimited Voice & Gestures",
                            "Advanced AI Analysis",
                            "Priority Support",
                            "Custom Macros"
                        ]}
                        isPopular={true}
                        delay={0.6}
                    />
                    <PricingCard
                        title="Enterprise"
                        price="Custom"
                        features={[
                            "Dedicated Server",
                            "SSO Integration",
                            "24/7 Phone Support",
                            "On-premise Deployment"
                        ]}
                        delay={0.8}
                    />
                </div>
            </div>
        </section>
    );
};

const PricingCard = ({ title, price, features, isPopular, delay, buttonText = "Get Started" }) => {
    const handleEmailClick = () => {
        if (price === '$0') return;
        const subject = `Request Access: ${title} Plan`;
        const body = `Hi SheetSense Team,\n\nI would like to request access to the ${title} plan resources.\n\nThanks!`;
        const mailtoLink = `mailto:sheetsense.ai@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoLink;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay }}
            className={`relative w-full max-w-sm rounded-[32px] p-10 border transition-all duration-300 group hover:-translate-y-4 ${isPopular
                ? 'bg-[#A855F7]/5 border-[#A855F7]/30 hover:border-[#00FF94] hover:shadow-[0_20px_40px_-10px_rgba(0,255,148,0.1)]'
                : 'bg-white/[0.03] border-white/10 hover:border-white/30'
                }`}
        >
            {isPopular && (
                <div className="absolute top-10 right-10 bg-[#00FF94] text-black text-xs font-bold px-3 py-1.5 rounded-full">
                    MOST POPULAR
                </div>
            )}

            <div className="mb-8">
                <h3 className="text-2xl font-semibold text-gray-400 mb-4">{title}</h3>
                <div className="flex items-baseline gap-1">
                    <span className="text-6xl font-bold text-white tracking-tighter">{price}</span>
                    {price !== 'Custom' && <span className="text-xl text-gray-500">/mo</span>}
                </div>
            </div>

            <ul className="space-y-4 mb-10">
                {features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-3 text-gray-300">
                        <Check size={20} className="text-[#00FF94] shrink-0" />
                        <span>{feature}</span>
                    </li>
                ))}
            </ul>

            <button
                onClick={handleEmailClick}
                className={`w-full py-4 rounded-2xl font-bold transition-colors ${isPopular
                    ? 'bg-[#00FF94] text-black hover:bg-[#00CC76]'
                    : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
            >
                {buttonText}
            </button>
        </motion.div>
    );
};

export default PricingSection;
