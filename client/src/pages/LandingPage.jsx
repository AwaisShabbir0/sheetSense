import React from 'react';
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import FeaturesSection from '../components/FeaturesSection';
import HowItWorksSection from '../components/HowItWorksSection';
import PricingSection from '../components/PricingSection';
import ContactSection from '../components/ContactSection';
import ShareSection from '../components/ShareSection';
import Footer from '../components/Footer';

const LandingPage = () => {
    return (
        <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-black">
            <Navbar />
            <main>
                <div id="home">
                    <HeroSection />
                </div>
                <div id="features">
                    <FeaturesSection />
                </div>
                <div id="how-it-works">
                    <HowItWorksSection />
                </div>
                <div id="pricing">
                    <PricingSection />
                </div>
                <div id="share">
                    <ShareSection />
                </div>
                <div id="contact">
                    <ContactSection />
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default LandingPage;
