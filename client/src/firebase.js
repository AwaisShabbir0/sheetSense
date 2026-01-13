
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBGS4Nl_ecUBUpJev4_jMA_ykq-uwwYZYM",
    authDomain: "sheetsense-bfead.firebaseapp.com",
    projectId: "sheetsense-bfead",
    storageBucket: "sheetsense-bfead.firebasestorage.app",
    messagingSenderId: "131773339925",
    appId: "1:131773339925:web:77b31d5b3c54cd253b311c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, googleProvider };
