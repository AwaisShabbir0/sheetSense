import React from 'react';
import { motion } from 'framer-motion';
import { Instagram, Linkedin, MessageCircle } from 'lucide-react';

const ShareSection = () => {
    return (
        <section className="py-24 bg-black border-t border-white/10">
            <div className="container mx-auto px-4 text-center">
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-3xl md:text-4xl font-bold mb-12 font-outfit"
                >
                    Connect with Us
                </motion.h2>

                <div className="flex flex-wrap justify-center gap-8">
                    <SocialButton
                        icon={<Instagram size={24} />}
                        label="Follow on Instagram"
                        href="https://www.instagram.com/sheetsense.ai?utm_source=qr"
                        gradient="from-[#833AB4] via-[#FD1D1D] to-[#F77737]"
                        delay={0}
                    />
                    <SocialButton
                        icon={<MessageCircle size={24} />}
                        label="Chat on WhatsApp"
                        href="https://whatsapp.com/biz/"
                        color="bg-[#25D366]"
                        delay={0.2}
                    />
                    <SocialButton
                        icon={<Linkedin size={24} />}
                        label="Connect on LinkedIn"
                        href="https://www.linkedin.com/in/awais-shabbir-971180277?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app"
                        color="bg-[#0077B5]"
                        delay={0.4}
                    />
                </div>
            </div>
        </section>
    );
};

const SocialButton = ({ icon, label, href, color, gradient, delay }) => {
    return (
        <motion.a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay }}
            whileHover={{ scale: 1.05, y: -4 }}
            className={`
        px-8 py-4 rounded-full flex items-center gap-3 font-semibold text-white
        bg-white/[0.05] border border-white/10 hover:border-transparent transition-all
        hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]
        relative overflow-hidden group
      `}
        >
            <div className={`
        absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity
        ${gradient ? `bg-gradient-to-tr ${gradient}` : color}
      `}></div>

            <span className={`relative z-10 ${gradient ? 'text-white' : ''} group-hover:text-white transition-colors`}
                style={{ color: !gradient && !color ? 'inherit' : undefined }}
            >
                {icon}
            </span>
            <span className="relative z-10">{label}</span>
        </motion.a>
    );
};

export default ShareSection;
