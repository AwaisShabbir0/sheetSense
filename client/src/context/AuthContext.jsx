import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for saved user in local storage on load
        const savedUser = localStorage.getItem('sheetSense_user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
            setIsAuthenticated(true);
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        // Mock login
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (email && password) {
                    const mockUser = {
                        name: 'Excel Wizard',
                        email: email,
                        avatar: 'https://ui-avatars.com/api/?name=Excel+Wizard&background=00FF94&color=000'
                    };
                    setUser(mockUser);
                    setIsAuthenticated(true);
                    localStorage.setItem('sheetSense_user', JSON.stringify(mockUser));
                    resolve(mockUser);
                } else {
                    reject(new Error('Invalid credentials'));
                }
            }, 1000);
        });
    };

    const signup = async (name, email, password) => {
        // Mock signup
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const mockUser = {
                    name: name,
                    email: email,
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=00FF94&color=000`
                };
                // For signup, we usually log them in automatically or ask to sign in.
                // Here we'll just log them in.
                setUser(mockUser);
                setIsAuthenticated(true);
                localStorage.setItem('sheetSense_user', JSON.stringify(mockUser));
                resolve(mockUser);
            }, 1000);
        });
    };

    const logout = () => {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('sheetSense_user');
    };

    const updateProfile = async (data) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const updatedUser = { ...user, ...data };
                if (data.name) {
                    updatedUser.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=00FF94&color=000`
                }
                setUser(updatedUser);
                localStorage.setItem('sheetSense_user', JSON.stringify(updatedUser));
                resolve(updatedUser);
            }, 800);
        });
    };

    const value = {
        user,
        isAuthenticated,
        login,
        signup,
        logout,
        updateProfile,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
