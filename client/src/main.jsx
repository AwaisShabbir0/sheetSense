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

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 bg-gray-900 text-white min-h-screen">
                    <h2 className="text-xl text-red-500 mb-2">Something went wrong.</h2>
                    <pre className="text-xs bg-gray-800 p-2 rounded overflow-auto whitespace-pre-wrap">
                        {this.state.error && this.state.error.toString()}
                    </pre>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-cyan-600 rounded text-white"
                    >
                        Reload
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <ErrorBoundary>
            <Root />
        </ErrorBoundary>
    </React.StrictMode>
);
