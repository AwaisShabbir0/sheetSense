import React, { useState, useEffect, useRef } from 'react';
import { Mic, Menu, X, User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const { user, isAuthenticated, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const profileRef = useRef(null);

    const isHome = location.pathname === '/';

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);

        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleLogout = () => {
        logout();
        setIsProfileOpen(false);
        navigate('/');
    };

    const navLinks = [
        { name: 'Features', to: 'features' },
        { name: 'How it Works', to: 'how-it-works' },
        { name: 'Pricing', to: 'pricing' },
        { name: 'Contact', to: 'contact' },
    ];

    const handleNavClick = (to) => {
        setIsMobileMenuOpen(false);
        if (isHome) {
            const element = document.getElementById(to);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        } else {
            navigate('/');
            // Small timeout to allow navigation to complete before scrolling
            setTimeout(() => {
                const element = document.getElementById(to);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                }
            }, 100);
        }
    };

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled || !isHome ? 'bg-black/50 backdrop-blur-md border-b border-white/5' : 'bg-transparent'
                }`}
        >
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                {/* Logo */}
                <RouterLink to="/" className="flex items-center gap-3 start-0">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#00FF94] to-[#A855F7] flex items-center justify-center">
                        <Mic className="text-black w-5 h-5" />
                    </div>
                    <div className="text-2xl font-bold">
                        <span className="text-white">Sheet</span>
                        <span className="text-[#00FF94]">Sense</span>
                    </div>
                </RouterLink>

                {/* Desktop Links */}
                <div className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <button
                            key={link.name}
                            onClick={() => handleNavClick(link.to)}
                            className="text-gray-400 hover:text-white cursor-pointer transition-colors text-sm font-medium bg-transparent border-none"
                        >
                            {link.name}
                        </button>
                    ))}
                </div>

                {/* Auth / Profile Section */}
                <div className="hidden md:block">
                    {isAuthenticated ? (
                        <div className="relative" ref={profileRef}>
                            <button
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="flex items-center gap-3 hover:bg-white/5 px-3 py-2 rounded-lg transition-colors"
                            >
                                <img
                                    src={user?.avatar}
                                    alt={user?.name}
                                    className="w-8 h-8 rounded-full border border-primary"
                                />
                                <span className="font-medium text-sm">{user?.name}</span>
                                <ChevronDown className={`w-4 h-4 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {isProfileOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute right-0 mt-2 w-64 bg-[#0A0A0A] border border-white/10 rounded-xl shadow-xl overflow-hidden"
                                    >
                                        <div className="p-4 border-b border-white/10">
                                            <p className="font-semibold text-white">{user?.name}</p>
                                            <p className="text-xs text-white/50 truncate">{user?.email}</p>
                                        </div>
                                        <div className="p-2">
                                            <RouterLink
                                                to="/profile"
                                                onClick={() => setIsProfileOpen(false)}
                                                className="flex items-center gap-3 p-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                            >
                                                <User className="w-4 h-4" />
                                                Profile
                                            </RouterLink>
                                            <button
                                                className="w-full flex items-center gap-3 p-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left"
                                            >
                                                <Settings className="w-4 h-4" />
                                                Settings
                                            </button>
                                            <div className="h-px bg-white/10 my-1" />
                                            <button
                                                onClick={handleLogout}
                                                className="w-full flex items-center gap-3 p-3 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors text-left"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                Sign Out
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <RouterLink to="/signin">
                            <button className="bg-white text-black px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-colors flex items-center gap-2">
                                Get Early Access
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 12h14m-7-7 7 7-7 7" />
                                </svg>
                            </button>
                        </RouterLink>
                    )}
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    className="md:hidden text-white p-2"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-black border-t border-white/10"
                    >
                        <div className="p-6 flex flex-col gap-4">
                            {isAuthenticated && (
                                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl mb-2">
                                    <img
                                        src={user?.avatar}
                                        alt={user?.name}
                                        className="w-10 h-10 rounded-full border border-primary"
                                    />
                                    <div>
                                        <p className="font-semibold text-white">{user?.name}</p>
                                        <RouterLink
                                            to="/profile"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className="text-primary text-sm"
                                        >
                                            View Profile
                                        </RouterLink>
                                    </div>
                                </div>
                            )}

                            {navLinks.map((link) => (
                                <button
                                    key={link.name}
                                    onClick={() => handleNavClick(link.to)}
                                    className="text-gray-300 hover:text-white py-2 text-lg font-medium text-left bg-transparent border-none"
                                >
                                    {link.name}
                                </button>
                            ))}

                            {isAuthenticated ? (
                                <button
                                    onClick={handleLogout}
                                    className="bg-red-500/10 text-red-500 w-full py-3 rounded-lg font-bold mt-4"
                                >
                                    Sign Out
                                </button>
                            ) : (
                                <RouterLink to="/signin" onClick={() => setIsMobileMenuOpen(false)}>
                                    <button className="bg-[#00FF94] text-black w-full py-3 rounded-lg font-bold mt-4">
                                        Get Early Access
                                    </button>
                                </RouterLink>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

export default Navbar;
