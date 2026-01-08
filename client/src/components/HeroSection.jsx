import React, { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Download, PlayCircle, Mic, X, Terminal } from 'lucide-react';
import { TypeAnimation } from 'react-type-animation';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const HeroSection = () => {
    const [isVideoOpen, setIsVideoOpen] = useState(false);
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const rotateX = useTransform(y, [0, 1080], [5, -5]);
    const rotateY = useTransform(x, [0, 1920], [-5, 5]);

    const handleMouseMove = (event) => {
        x.set(event.clientX);
        y.set(event.clientY);
    };

    const handleDownload = (e) => {
        if (!isAuthenticated) {
            e.preventDefault();
            navigate('/signin');
        }
    };

    const handleWatchDemo = () => {
        if (!isAuthenticated) {
            navigate('/signin');
        } else {
            setIsVideoOpen(true);
        }
    };

    return (
        <section
            onMouseMove={handleMouseMove}
            className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-32 pb-20"
        >
            {/* Background Noise & Glow */}
            <div className="absolute inset-0 bg-[#000000] z-0">
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")',
                        backgroundRepeat: 'repeat',
                    }}
                ></div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 2 }}
                    className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#00FF94]/10 rounded-full blur-[120px]"
                />
            </div>

            <div className="relative z-10 container mx-auto px-4 flex flex-col items-center text-center">
                {/* Badge */}
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6 }}
                    className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-8"
                >
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF94] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00FF94]"></span>
                    </span>
                    <span className="text-[#00FF94] text-xs font-semibold tracking-wide uppercase">v1.0 Public Beta is Live</span>
                </motion.div>

                {/* Headline */}
                <motion.h1
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-6xl md:text-8xl font-bold leading-tight mb-6"
                >
                    Talk to your <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00FF94] to-[#A855F7]">
                        Spreadsheets.
                    </span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="text-xl md:text-2xl text-white/60 max-w-2xl mb-12"
                >
                    The world's first multimodal AI assistant for Excel. <br className="hidden md:block" />
                    Use Voice to analyze and Gestures to navigate.
                </motion.p>

                {/* CTAs */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                    className="flex flex-col sm:flex-row gap-4 mb-24"
                >
                    <a
                        href="/manifest.xml"
                        download="SheetSense-Manifest.xml"
                        onClick={handleDownload}
                        className="group flex items-center justify-center gap-2 bg-[#00FF94] text-black px-8 py-4 rounded-full font-bold text-lg hover:shadow-[0_0_30px_-5px_#00FF9466] transition-all transform hover:-translate-y-1"
                    >
                        <Download size={20} className="group-hover:translate-y-0.5 transition-transform" />
                        Download XML
                    </a>
                    <button
                        onClick={handleWatchDemo}
                        className="flex items-center justify-center gap-2 border border-white/20 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white/5 transition-all"
                    >
                        <PlayCircle size={20} />
                        Watch Demo
                    </button>
                </motion.div>

                {/* 3D Mockup */}
                <motion.div
                    style={{
                        rotateX,
                        rotateY,
                        perspective: 1000
                    }}
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.8 }}
                    className="w-full max-w-5xl aspect-video bg-[#0A0A0A] rounded-2xl border border-white/10 shadow-[0_50px_100px_-20px_rgba(0,255,148,0.15)] relative overflow-hidden group"
                >
                    {/* Mac Header */}
                    <div className="absolute top-0 w-full h-12 bg-white/5 border-b border-white/5 flex items-center px-4 gap-2 z-20">
                        <div className="w-3 h-3 rounded-full bg-[#FF5F57]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#FFBD2E]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#28C840]"></div>
                    </div>

                    {/* Content Orb */}
                    <div className="w-full h-full flex flex-col items-center justify-center relative">
                        {/* Grid Lines */}
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]"></div>

                        {/* Orb */}
                        <div className="relative z-10 mb-8">
                            <div className="absolute inset-0 bg-[#00FF94] blur-[60px] opacity-20 animate-pulse"></div>
                            <div className="relative w-24 h-24 rounded-full border border-[#00FF94]/50 bg-[#00FF94]/10 flex items-center justify-center shadow-[0_0_30px_-5px_#00FF94]">
                                <Mic size={40} className="text-[#00FF94]" />
                            </div>
                        </div>

                        {/* Typing Text */}
                        <div className="relative z-10 font-mono text-[#00FF94] text-lg bg-black/40 px-4 py-2 rounded border border-[#00FF94]/20 backdrop-blur-sm">
                            <span className="mr-2 opacity-50">$</span>
                            <TypeAnimation
                                sequence={[
                                    'Analyze pivot table for Q3 sales...',
                                    2000,
                                    'Highlighting top performers...',
                                    2000,
                                    'Generating quarterly report...',
                                    2000,
                                ]}
                                wrapper="span"
                                speed={50}
                                repeat={Infinity}
                            />
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Video Modal */}
            {isVideoOpen && (
                <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
                    >
                        <button
                            onClick={() => setIsVideoOpen(false)}
                            className="absolute top-4 right-4 z-10 bg-black/50 p-2 rounded-full text-white hover:bg-white/20 transition-colors"
                        >
                            <X size={24} />
                        </button>
                        <video
                            className="w-full h-full object-cover"
                            src="/videos/ScreenRecorderProject1.mp4"
                            controls
                            autoPlay
                        ></video>
                    </motion.div>
                </div>
            )}
        </section>
    );
};

export default HeroSection;
