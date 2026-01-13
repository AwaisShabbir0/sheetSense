import React from 'react';
import { motion } from 'framer-motion';
import { Mic, Hand, Zap, MessageSquare } from 'lucide-react';

const FeaturesSection = () => {
    const features = [
        {
            icon: <MessageSquare className="w-8 h-8 text-blue-400" />,
            color: "bg-blue-400/20",
            borderColor: "border-blue-400/20",
            hoverBorder: "hover:border-blue-400/50",
            title: "Text Commands",
            description: "Type natural language commands like \"Highlight all rows where sales > 5000\" or \"Sort by Date descending\"."
        },
        {
            icon: <Mic className="w-8 h-8 text-green-400" />,
            color: "bg-green-400/20",
            borderColor: "border-green-400/20",
            hoverBorder: "hover:border-green-400/50",
            title: "Natural Voice Control",
            description: "Just say \"Filter by Q3 revenue\" or \"Create a pivot table for sales.\" No more hunting through menus."
        },
        {
            icon: <Zap className="w-8 h-8 text-yellow-400" />,
            color: "bg-yellow-400/20",
            borderColor: "border-yellow-400/20",
            hoverBorder: "hover:border-yellow-400/50",
            title: "Instant Analysis",
            description: "Complex formulas generated in seconds. Ask questions about your data and get visual trends instantly."
        },
        {
            icon: <Hand className="w-8 h-8 text-purple-400" />,
            color: "bg-purple-400/20",
            borderColor: "border-purple-400/20",
            hoverBorder: "hover:border-purple-400/50",
            title: "Gesture Navigation",
            description: "Swipe left to switch sheets. Pinch to zoom into data clusters. Control Excel like distinct minority report.",
            tag: "Future Implementation"
        }
    ];

    return (
        <section className="py-24 bg-black relative">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-20">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-5xl md:text-6xl font-bold mb-4"
                    >
                        Superpowers for your <br />
                        <span className="text-[#4ADE80]">Data Workflow</span>
                    </motion.h2>
                    <motion.div
                        initial={{ scaleX: 0 }}
                        whileInView={{ scaleX: 1 }}
                        viewport={{ once: true }}
                        className="w-20 h-1 bg-[#22C55E] mx-auto rounded-full"
                    />
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
                    {features.map((feature, index) => (
                        <FeatureCard key={index} feature={feature} index={index} />
                    ))}
                </div>
            </div>
        </section>
    );
};

const FeatureCard = ({ feature, index }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.2 }}
            className={`relative p-8 bg-white/[0.03] rounded-3xl border border-white/5 ${feature.hoverBorder} transition-all duration-300 group hover:-translate-y-2`}
        >
            {feature.tag && (
                <div className="absolute top-4 right-4 bg-purple-500/20 text-purple-300 text-xs font-bold px-2 py-1 rounded-full border border-purple-500/20">
                    {feature.tag}
                </div>
            )}
            <div className={`w-14 h-14 ${feature.color} rounded-full flex items-center justify-center mb-6`}>
                {feature.icon}
            </div>
            <h3 className="text-2xl font-bold mb-4 font-outfit">{feature.title}</h3>
            <p className="text-gray-400 leading-relaxed text-lg">{feature.description}</p>
        </motion.div>
    );
};

export default FeaturesSection;
