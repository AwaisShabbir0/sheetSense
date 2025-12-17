import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import TaskPane from './components/TaskPane.jsx'
import './index.css'

/* global Office */

const Root = () => {
    const [isOfficeInitialized, setIsOfficeInitialized] = useState(false);
    const [isExcel, setIsExcel] = useState(false);

    useEffect(() => {
        const initOffice = async () => {
            if (window.Office) {
                try {
                    await Office.onReady((info) => {
                        console.log("Office.onReady info:", info);
                        if (info.host === Office.HostType.Excel) {
                            setIsExcel(true);
                        }
                        setIsOfficeInitialized(true);
                    });
                } catch (e) {
                    console.error("Office.onReady error:", e);
                    setIsOfficeInitialized(true); // Fallback
                }
            } else {
                setIsOfficeInitialized(true);
            }
        };

        initOffice();
    }, []);

    if (!isOfficeInitialized) {
        return (
            <div className="flex items-center justify-center p-10 bg-gray-900 text-white min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
                    <p>Initializing SheetSense...</p>
                </div>
            </div>
        );
    }

    if (isExcel) {
        return <TaskPane />;
    }

    return <App />;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <Root />
    </React.StrictMode>
);
