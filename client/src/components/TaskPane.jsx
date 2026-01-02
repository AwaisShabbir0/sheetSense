import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Send, Bot, User, Sparkles } from 'lucide-react';
import NaturalLanguageService from '../services/NaturalLanguageService';

const TaskPane = () => {
    const [messages, setMessages] = useState([
        { type: 'bot', text: 'HEY, how can i help you?' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const messagesEndRef = useRef(null);
    const [debugLog, setDebugLog] = useState([]);

    const addDebugMessage = (msg) => {
        console.log(msg);
        setMessages(prev => [...prev, { type: 'debug', text: `[DEBUG] ${msg}` }]);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setIsListening(false);
            addDebugMessage("Recording stopped.");
        }
    };

    const handleVoiceResponse = async (audioBlob) => {
        if (!audioBlob || audioBlob.size === 0) {
            addDebugMessage("Error: Empty audio recording.");
            return;
        }

        setIsProcessing(true);
        addDebugMessage(`Sending audio (${audioBlob.size} bytes)...`);

        try {
            const result = await NaturalLanguageService.processVoiceCommand(audioBlob);

            addDebugMessage("Voice command processed successfully.");

            setMessages(prev => [...prev, {
                type: 'bot',
                text: result.text
            }]);

            if (result.actions && result.actions.length > 0) {
                addDebugMessage(`Actions executed: ${JSON.stringify(result.actions)}`);
            }

        } catch (error) {
            console.error("Voice Processing Failed:", error);
            addDebugMessage(`Error: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleListening = async () => {
        if (isListening) {
            stopRecording();
        } else {
            try {
                addDebugMessage("Requesting microphone...");
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                addDebugMessage("Microphone granted.");

                const mediaRecorder = new MediaRecorder(stream);
                mediaRecorderRef.current = mediaRecorder;
                audioChunksRef.current = [];

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        audioChunksRef.current.push(event.data);
                    }
                };

                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    // Stop all tracks
                    stream.getTracks().forEach(track => track.stop());
                    handleVoiceResponse(audioBlob);
                };

                mediaRecorder.start();
                setIsListening(true);
                addDebugMessage("Recording started...");

            } catch (error) {
                console.error("Microphone Error:", error);
                let errorMsg = error.message;
                if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                    errorMsg = "Permission denied. Please allow microphone access.";
                }
                addDebugMessage(`Start failed: ${errorMsg}`);
            }
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const userText = inputValue;
        setInputValue('');

        // Stop listening when sending message
        if (isListening) {
            stopRecording();
        }

        // Add user message
        setMessages(prev => [...prev, { type: 'user', text: userText }]);
        setIsProcessing(true);

        // Process command (No key needed, handled by server)
        const result = await NaturalLanguageService.processCommand(userText);

        // Add bot response
        const botText = typeof result === 'object' ? result.text : result;
        setMessages(prev => [...prev, { type: 'bot', text: botText }]);
        setIsProcessing(false);
    };

    return (
        <div className="w-full h-screen bg-black text-white flex flex-col font-['Outfit'] overflow-hidden relative">

            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-black/50 backdrop-blur-md z-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <h1 className="text-sm font-medium tracking-wide">SheetSense AI</h1>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-3 ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.type === 'user' ? 'bg-white/10' : 'bg-gradient-to-br from-cyan-500 to-blue-500'
                            }`}>
                            {msg.type === 'user' ? <User size={14} /> : <Bot size={14} />}
                        </div>
                        <div className={`p-3 rounded-2xl text-sm max-w-[85%] ${msg.type === 'user'
                            ? 'bg-white/10 rounded-tr-sm'
                            : 'bg-white/5 border border-white/10 rounded-tl-sm'
                            }`}>
                            {msg.text}
                        </div>
                    </motion.div>
                ))}

                {isProcessing && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-3"
                    >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-cyan-500 to-blue-500">
                            <Sparkles size={14} className="animate-spin-slow" />
                        </div>
                        <div className="p-3 rounded-2xl rounded-tl-sm bg-white/5 border border-white/10 flex gap-1 items-center">
                            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </motion.div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/10 bg-black/50 backdrop-blur-md">
                <form onSubmit={handleSendMessage} className="relative">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={isListening ? "Listening..." : "Ask SheetSense to edit..."}
                        className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors placeholder:text-gray-500 ${isListening ? 'border-cyan-500/50 ring-1 ring-cyan-500/20' : ''}`}
                    />
                    <button
                        type="submit"
                        disabled={!inputValue.trim() || isProcessing}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/10 rounded-lg text-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={18} />
                    </button>
                </form>
                <div className="flex justify-center mt-2">
                    <button
                        onClick={toggleListening}
                        className={`flex items-center gap-1.5 text-[10px] transition-all duration-300 ${isListening ? 'text-cyan-400 scale-110' : 'text-gray-500 hover:text-cyan-400'
                            }`}
                    >
                        <Mic size={12} className={isListening ? 'animate-pulse' : ''} />
                        {isListening ? 'Listening...' : 'Tap to speak'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TaskPane;
