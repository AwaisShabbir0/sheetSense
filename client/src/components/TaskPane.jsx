import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Send, Bot, User, Sparkles, Plus, MessageSquare, Menu, X, Clock, Trash2, Pencil, Check } from 'lucide-react';
import NaturalLanguageService from '../services/NaturalLanguageService';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';

const TaskPane = () => {
    const { user, loginAnonymously, loading } = useAuth();

    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [authError, setAuthError] = useState(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const messagesEndRef = useRef(null);

    // Auto-login anonymously
    useEffect(() => {
        if (!loading && !user) {
            loginAnonymously().catch(err => {
                console.error(err);
                if (err.code === 'auth/admin-restricted-operation' || err.code === 'auth/operation-not-allowed') {
                    setAuthError("Please enable 'Anonymous' sign-in in Firebase Console.");
                } else {
                    setAuthError(`Auth Error: ${err.message}`);
                }
            });
        }
    }, [user, loading, loginAnonymously]);

    // Chat History State
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [conversations, setConversations] = useState([]);
    const [currentChatId, setCurrentChatId] = useState(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Load Conversations
    useEffect(() => {
        if (!user) {
            setConversations([]);
            return;
        }

        const q = query(
            collection(db, 'chats'),
            where('userId', '==', user.uid),
            orderBy('updatedAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const chats = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setConversations(chats);
        }, (error) => {
            console.error("Chats Listener Error:", error);
            if (error.code === 'failed-precondition') {
                setAuthError("Database Error: Missing Index. Check browser console for link.");
            } else if (error.code === 'permission-denied') {
                setAuthError("Database Error: Permission Denied. Check Firestore Rules.");
            } else {
                setAuthError(`History Error: ${error.message}`);
            }
        });

        return () => unsubscribe();
    }, [user]);

    // Load Messages for Current Chat
    useEffect(() => {
        if (!currentChatId || !user) {
            if (!currentChatId) setMessages([{ type: 'bot', text: 'HEY, how can i help you?' }]);
            return;
        }

        const q = query(
            collection(db, `chats/${currentChatId}/messages`),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Map Firestore data to UI format
            const uiMessages = msgs.map(m => ({
                type: m.sender === 'user' ? 'user' : 'bot',
                text: m.text
            }));

            if (uiMessages.length === 0) {
                setMessages([{ type: 'bot', text: 'HEY, how can i help you?' }]);
            } else {
                setMessages(uiMessages);
            }
            scrollToBottom();
        }, (error) => {
            console.error("Messages Listener Error:", error);
            setAuthError(`Chat Error: ${error.message}`);
        });

        return () => unsubscribe();
    }, [currentChatId, user]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const [editingChatId, setEditingChatId] = useState(null);
    const [editTitle, setEditTitle] = useState("");

    const createNewChat = async () => {
        setCurrentChatId(null);
        setMessages([{ type: 'bot', text: 'HEY, how can i help you?' }]);
        if (window.innerWidth < 768) setIsSidebarOpen(false);
    };

    const deleteChat = async (e, chatId) => {
        e.stopPropagation();
        if (!window.confirm("Delete this chat?")) return;

        try {
            // Optimistic UI update: Remove immediately from list
            setConversations(prev => prev.filter(c => c.id !== chatId));

            // Unselect if deleting currently valid chat
            if (currentChatId === chatId) {
                setCurrentChatId(null);
                setMessages([{ type: 'bot', text: 'HEY, how can i help you?' }]);
            }

            await deleteDoc(doc(db, 'chats', chatId));
        } catch (error) {
            console.error("Error deleting chat:", error);
            alert(`Failed to delete: ${error.message}`);
        }
    };

    const startEditing = (e, chat) => {
        e.stopPropagation();
        setEditingChatId(chat.id);
        setEditTitle(chat.title);
    };

    const saveTitle = async (e, chatId) => {
        e.stopPropagation(); // Prevent chat selection
        try {
            await updateDoc(doc(db, 'chats', chatId), {
                title: editTitle
            });
            setEditingChatId(null);
        } catch (error) {
            console.error("Error updating title:", error);
        }
    };

    const updateChatTitle = async (chatId, firstMessage) => {
        try {
            const title = firstMessage.length > 30 ? firstMessage.substring(0, 30) + '...' : firstMessage;
            await updateDoc(doc(db, 'chats', chatId), {
                title: title
            });
        } catch (error) {
            console.error("Error updating title:", error);
        }
    };

    // --- Message Handling ---

    const saveMessage = async (text, sender, specificChatId = null) => {
        if (!user) return;

        let chatId = specificChatId || currentChatId;

        // If no chat selected, or we are in "New Chat" state (id is null), create one NOW
        if (!chatId) {
            const title = text.length > 30 ? text.substring(0, 30) + '...' : text;
            // Only if sender is user, we set title. If bot speaks first? Unlikely.
            // If bot speaks first (unlikely in this flow), title might be "New Chat"

            const docRef = await addDoc(collection(db, 'chats'), {
                userId: user.uid,
                title: sender === 'user' ? title : "New Chat",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            chatId = docRef.id;
            if (!specificChatId) setCurrentChatId(chatId);
        } else {
            // Update timestamp
            await updateDoc(doc(db, 'chats', chatId), {
                updatedAt: serverTimestamp()
            });

            // Auto-rename if title is "New Chat" and user speaks
            const currentChat = conversations.find(c => c.id === chatId);
            if (currentChat && currentChat.title === "New Chat" && sender === 'user') {
                updateChatTitle(chatId, text);
            }
        }

        await addDoc(collection(db, `chats/${chatId}/messages`), {
            text: text,
            sender: sender,
            createdAt: serverTimestamp()
        });

        return chatId;
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const userText = inputValue;
        setInputValue('');

        if (isListening) stopRecording();

        setIsProcessing(true);

        try {
            // 1. Save User Message
            let activeChatId = null;
            if (!user) {
                setMessages(prev => [...prev, { type: 'user', text: userText }]);
            } else {
                activeChatId = await saveMessage(userText, 'user');
            }

            // 2. Process with AI
            const history = [...messages, { type: 'user', text: userText }];
            const result = await NaturalLanguageService.processCommand(userText, history);

            let botText = "Done.";
            if (typeof result === 'string') botText = result;
            else if (result?.text) botText = result.text;
            else if (result) botText = JSON.stringify(result);

            // 3. Save Bot Message
            if (!user) {
                setMessages(prev => [...prev, { type: 'bot', text: botText }]);
            } else {
                // Use the SAME chatId we used for the user message
                await saveMessage(botText, 'bot', activeChatId);
            }

        } catch (error) {
            console.error("Chat Error:", error);
            const errText = `Error: ${error.message}`;
            if (!user) setMessages(prev => [...prev, { type: 'bot', text: errText }]);
            else saveMessage(errText, 'bot'); // Fallback to currentChatId logic if we failed before getting ID
        } finally {
            setIsProcessing(false);
        }
    };

    // --- Voice Logic (Ported) ---

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setIsListening(false);
        }
    };

    const handleVoiceResponse = async (audioBlob) => {
        if (!audioBlob || audioBlob.size === 0) return;

        setIsProcessing(true);
        try {
            // Pass history
            const history = messages;
            const result = await NaturalLanguageService.processVoiceCommand(audioBlob, history);

            // result contains { text, actions, userText }
            let activeChatId = null;
            if (result.userText && user) {
                activeChatId = await saveMessage(result.userText, 'user');
            } else if (result.userText) {
                setMessages(prev => [...prev, { type: 'user', text: result.userText }]);
            }

            const botText = result.text || "Processed voice command.";

            if (user) {
                await saveMessage(botText, 'bot', activeChatId);
            } else {
                setMessages(prev => [...prev, { type: 'bot', text: botText }]);
            }

        } catch (error) {
            console.error("Voice Processing Failed:", error);
            if (user) saveMessage(`Error: ${error.message}`, 'bot');
            else setMessages(prev => [...prev, { type: 'bot', text: `Error: ${error.message}` }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleListening = async () => {
        if (isListening) {
            stopRecording();
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mediaRecorder = new MediaRecorder(stream);
                mediaRecorderRef.current = mediaRecorder;
                audioChunksRef.current = [];

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) audioChunksRef.current.push(event.data);
                };

                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    stream.getTracks().forEach(track => track.stop());
                    handleVoiceResponse(audioBlob);
                };

                mediaRecorder.start();
                setIsListening(true);
            } catch (error) {
                console.error("Microphone Error:", error);
                alert("Could not access microphone.");
            }
        }
    };

    // --- Render ---

    return (
        <div className="w-full h-screen bg-black text-white flex font-['Outfit'] overflow-hidden relative">

            {/* Sidebar Overlay (Mobile) */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsSidebarOpen(false)}
                        className="absolute inset-0 bg-black/80 z-20 md:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <motion.div
                className={`flex flex-col border-r border-white/10 bg-black/95 z-30 absolute md:relative h-full transition-all duration-300 ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full md:w-0 md:translate-x-0 md:hidden'}`}
                animate={{ width: isSidebarOpen ? 256 : 0, opacity: isSidebarOpen ? 1 : 0 }} // Simple animation for sidebar toggle
                style={{ overflow: 'hidden' }} // Hide content when closed
            >
                {/* Fixed Manual Toggle for sidebar logic: Using standard CSS classes for response but Framer for smooth toggle if needed. 
                   Actually let's stick to conditional rendering/classes for simplicity or use Framer properly. 
                   The `animate` prop above handles width.
                */}
            </motion.div>
            {/* Re-doing Sidebar with conditional rendering of content to avoid layout issues */}
            <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-[#0a0a0a] border-r border-white/10 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-4 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="font-semibold tracking-wide">History</h2>
                        <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1 hover:bg-white/10 rounded">
                            <X size={18} />
                        </button>
                    </div>

                    <button
                        onClick={createNewChat}
                        className="flex items-center gap-2 w-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 px-4 py-3 rounded-xl transition-all mb-4"
                    >
                        <Plus size={18} />
                        <span className="text-sm font-medium">New Chat</span>
                    </button>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {conversations.length === 0 && (
                            <div className="text-center text-white/20 text-xs py-8">
                                No history yet
                            </div>
                        )}
                        {conversations.map(chat => (
                            <div
                                key={chat.id}
                                onClick={() => { setCurrentChatId(chat.id); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                                className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${currentChatId === chat.id ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-white/60'}`}
                            >
                                <div className="flex items-center gap-3 overflow-hidden flex-1">
                                    <MessageSquare size={14} className="shrink-0" />
                                    {editingChatId === chat.id ? (
                                        <div className="flex items-center gap-2 w-full">
                                            <input
                                                type="text"
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="bg-black/50 border border-white/20 rounded px-2 py-1 text-xs text-white w-full focus:outline-none focus:border-cyan-500"
                                                autoFocus
                                            />
                                            <button onClick={(e) => saveTitle(e, chat.id)} className="p-1 hover:text-green-400">
                                                <Check size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="text-sm truncate">{chat.title || 'Untitled Chat'}</span>
                                    )}
                                </div>

                                {editingChatId !== chat.id && (
                                    <div className="flex gap-1 opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => startEditing(e, chat)}
                                            className="p-1 text-white/40 hover:text-cyan-400 transition-colors"
                                        >
                                            <Pencil size={12} />
                                        </button>
                                        <button
                                            onClick={(e) => deleteChat(e, chat.id)}
                                            className="p-1 text-white/40 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>


            {/* Main Chat Area */}
            <div className={`flex-1 flex flex-col h-full w-full transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
                {/* Auth Error Banner */}
                {authError && (
                    <div className="bg-red-500/10 border-b border-red-500/20 p-2 text-xs text-red-400 text-center">
                        {authError}
                    </div>
                )}
                {/* Header */}
                <div className="p-4 border-b border-white/10 bg-black/50 backdrop-blur-md z-10 flex items-center gap-4">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <Menu size={18} />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        <h1 className="text-sm font-medium tracking-wide">
                            {conversations.find(c => c.id === currentChatId)?.title || "SheetSense AI"}
                        </h1>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex gap-3 ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.type === 'user' ? 'bg-white/10' : 'bg-gradient-to-br from-cyan-500 to-blue-500'}`}>
                                {msg.type === 'user' ? <User size={14} /> : <Bot size={14} />}
                            </div>
                            <div className={`p-3 rounded-2xl text-sm max-w-[85%] ${msg.type === 'user' ? 'bg-white/10 rounded-tr-sm' : 'bg-white/5 border border-white/10 rounded-tl-sm'}`}>
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

                {/* Input */}
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
        </div>
    );
};

export default TaskPane;
