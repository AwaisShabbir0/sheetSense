import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../firebase';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    updateProfile as updateFirebaseProfile,
    signInAnonymously
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // User is signed in, fetch additional data from Firestore
                try {
                    const userDocRef = doc(db, 'users', firebaseUser.uid);
                    const userDoc = await getDoc(userDocRef);

                    if (userDoc.exists()) {
                        setUser({ ...firebaseUser, ...userDoc.data() });
                    } else {
                        // Fallback if firestore doc doesn't exist (shouldn't happen on normal flow)
                        setUser(firebaseUser);
                    }
                    setIsAuthenticated(true);
                } catch (error) {
                    console.error("Error fetching user data:", error);
                    // Still set the user, just minimal info
                    setUser(firebaseUser);
                    setIsAuthenticated(true);
                }
            } else {
                // User is signed out
                setUser(null);
                setIsAuthenticated(false);
            }
            setLoading(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    const login = async (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const signup = async (name, email, password) => {
        // 1. Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Update Firebase Auth profile
        const photoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=00FF94&color=000`;
        await updateFirebaseProfile(user, {
            displayName: name,
            photoURL: photoURL
        });

        // 3. Create user document in Firestore
        await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            name: name,
            email: email,
            photoURL: photoURL,
            createdAt: new Date().toISOString()
        });

        return user;
    };

    const googleSignIn = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            // Check if user exists in Firestore
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
                // Determine display name (prefer displayName, fallback to email local part)
                const displayName = user.displayName || user.email.split('@')[0];
                const photoURL = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=00FF94&color=000`;

                // Create user document
                await setDoc(userDocRef, {
                    uid: user.uid,
                    name: displayName,
                    email: user.email,
                    photoURL: photoURL,
                    createdAt: new Date().toISOString()
                });
            }

            return user;
        } catch (error) {
            console.error("Error signing in with Google: ", error);
            throw error;
        }
    };

    const logout = () => {
        return signOut(auth);
    };

    const updateProfile = async (data) => {
        if (!auth.currentUser) throw new Error('No user logged in');

        const updates = {};
        if (data.name) updates.displayName = data.name;

        // Update Firebase Auth profile if any relevant fields changed
        if (Object.keys(updates).length > 0) {
            await updateFirebaseProfile(auth.currentUser, updates);
        }

        // Update Firestore document
        // If name changed, update photoURL too if not provided explicitly
        if (data.name && !data.photoURL) {
            data.photoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=00FF94&color=000`;
        }

        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userDocRef, data);

        // Update local state manually to reflect changes immediately
        setUser(prev => ({ ...prev, ...data }));
    };

    const loginAnonymously = async () => {
        try {
            await signInAnonymously(auth);
        } catch (error) {
            console.error("Error signing in anonymously:", error);
            throw error;
        }
    };

    const value = {
        user,
        isAuthenticated,
        login,
        signup,
        googleSignIn,
        loginAnonymously,
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
