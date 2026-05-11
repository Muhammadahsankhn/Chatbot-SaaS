import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, MessageSquare, X, RefreshCw, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8001`;

const VoiceBot = () => {
    const { user } = useAuth();
    const [status, setStatus] = useState('idle'); // idle, listening, thinking, speaking, error
    const [transcript, setTranscript] = useState("");
    const [response, setResponse] = useState("");
    const [isMuted, setIsMuted] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    
    const recognitionRef = useRef(null);
    const synthRef = useRef(window.speechSynthesis);
    const utteranceRef = useRef(null);

    const getApiKey = useCallback(() => {
        try {
            const u = JSON.parse(localStorage.getItem("cb_user") || "{}");
            return u.apiKey || u.generatedApiKey || "";
        } catch { return ""; }
    }, []);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (recognitionRef.current) recognitionRef.current.stop();
            if (synthRef.current) synthRef.current.cancel();
        };
    }, []);

    const startListening = () => {
        setErrorMessage("");
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            setErrorMessage("Speech recognition not supported in this browser. Try Chrome or Edge.");
            setStatus('error');
            return;
        }

        try {
            const rec = new SpeechRecognition();
            rec.lang = "en-US";
            rec.interimResults = true;
            rec.continuous = false;
            recognitionRef.current = rec;

            rec.onstart = () => {
                setStatus('listening');
                setTranscript("");
            };

            rec.onresult = (event) => {
                const text = Array.from(event.results)
                    .map(result => result[0].transcript)
                    .join('');
                setTranscript(text);
            };

            rec.onerror = (e) => {
                console.error("Speech Recognition Error:", e.error);
                if (e.error === 'not-allowed') {
                    setErrorMessage("Microphone access denied. Please enable it in your browser settings.");
                } else {
                    setErrorMessage(`Error: ${e.error}`);
                }
                setStatus('error');
            };

            rec.onend = () => {
                if (status === 'listening') {
                    // If we finished listening and have a transcript, process it
                    if (transcript.trim()) {
                        setStatus('thinking');
                        handleBotResponse(transcript);
                    } else {
                        setStatus('idle');
                    }
                }
            };

            rec.start();
        } catch (err) {
            console.error("Failed to start speech recognition:", err);
            setErrorMessage("Could not access microphone.");
            setStatus('error');
        }
    };

    const handleBotResponse = async (text) => {
        try {
            const apiKey = getApiKey();
            if (!apiKey) {
                setErrorMessage("No API Key found. Please check your settings.");
                setStatus('error');
                return;
            }

            const res = await axios.post(`${BASE_URL}/chat/message`, 
                { 
                    message: text, 
                    visitorId: "dashboard-voice-user",
                    sessionId: "voice-session-" + (user?.id || "anon")
                },
                { headers: { "x-api-key": apiKey } }
            );

            const botReply = res.data?.reply || "I'm sorry, I couldn't process that.";
            setResponse(botReply);
            setStatus('speaking');
            speak(botReply);
        } catch (err) {
            console.error("Chat API error:", err);
            setErrorMessage("Failed to connect to the AI service.");
            setStatus('error');
        }
    };

    const speak = (text) => {
        if (isMuted) {
            setTimeout(() => setStatus('idle'), 2000);
            return;
        }

        if (!synthRef.current) return;
        
        synthRef.current.cancel();
        
        const utter = new SpeechSynthesisUtterance(text);
        
        // Try to find a premium-sounding voice
        const voices = synthRef.current.getVoices();
        const preferredVoice = voices.find(v => v.name.includes("Google") && v.lang.startsWith("en")) || 
                               voices.find(v => v.lang.startsWith("en")) || 
                               voices[0];
        
        if (preferredVoice) utter.voice = preferredVoice;
        utter.rate = 1.0;
        utter.pitch = 1.0;
        
        utter.onend = () => {
            setStatus('idle');
        };

        utter.onerror = (e) => {
            console.error("Speech Synthesis Error:", e);
            setStatus('idle');
        };

        utteranceRef.current = utter;
        synthRef.current.speak(utter);
    };

    const handleMicClick = () => {
        if (status === 'idle' || status === 'error') {
            startListening();
        } else {
            if (recognitionRef.current) recognitionRef.current.stop();
            if (synthRef.current) synthRef.current.cancel();
            setStatus('idle');
        }
    };

    const clearChat = () => {
        setTranscript("");
        setResponse("");
        setErrorMessage("");
        setStatus('idle');
        if (synthRef.current) synthRef.current.cancel();
    };

    return (
        <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto p-4 md:p-8">
            {/* ── AI VISUALIZER / FACE ── */}
            <div className="relative w-64 h-64 mb-16 flex items-center justify-center">
                {/* Outer Glows */}
                <div className={`absolute inset-0 rounded-full blur-[60px] transition-all duration-700 opacity-60 ${
                    status === 'listening' ? 'bg-indigo-500 scale-125' : 
                    status === 'thinking' ? 'bg-purple-500 animate-pulse' : 
                    status === 'speaking' ? 'bg-cyan-400 scale-110' : 
                    status === 'error' ? 'bg-red-500/40' :
                    'bg-indigo-500/20'
                }`}></div>

                {/* Main Orb Container */}
                <div className={`relative w-48 h-48 rounded-full border-2 transition-all duration-500 flex items-center justify-center overflow-hidden bg-[#0a0a0f] backdrop-blur-xl ${
                    status === 'listening' ? 'border-indigo-400 shadow-[0_0_40px_rgba(129,140,248,0.6)] scale-105' : 
                    status === 'thinking' ? 'border-purple-400 shadow-[0_0_40px_rgba(192,132,252,0.6)]' : 
                    status === 'speaking' ? 'border-cyan-400 shadow-[0_0_40px_rgba(34,211,238,0.6)] scale-105' : 
                    status === 'error' ? 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.3)]' :
                    'border-white/10 shadow-2xl'
                }`}>
                    
                    {/* Interior Particle-like Animation */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className={`absolute inset-0 bg-gradient-to-tr from-transparent via-indigo-500/10 to-transparent animate-spin-slow opacity-50`}></div>
                        <div className={`absolute inset-[-50%] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15)_0%,transparent_70%)] animate-pulse`}></div>
                    </div>

                    {/* Eyes / Core Intelligence */}
                    <div className="flex gap-10 items-center justify-center z-10">
                        {[0, 1].map(i => (
                            <div key={i} className={`relative w-4 h-4 transition-all duration-500 ${
                                status === 'listening' ? 'h-1 scale-x-125' : 
                                status === 'thinking' ? 'scale-110' : 
                                status === 'speaking' ? 'scale-150' : 'scale-100'
                            }`}>
                                <div className={`absolute inset-0 rounded-full bg-white transition-all duration-300 ${
                                    status === 'speaking' ? 'shadow-[0_0_15px_white]' : 
                                    status === 'listening' ? 'shadow-[0_0_10px_rgba(129,140,248,0.8)]' : ''
                                }`} />
                                {status === 'thinking' && (
                                    <div className={`absolute inset-0 rounded-full border-2 border-white/50 animate-ping`} style={{ animationDelay: `${i * 0.2}s` }}></div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Dynamic Mouth / Audio Visualizer */}
                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-32 flex items-center justify-center gap-1.5 h-10">
                        {status === 'speaking' ? (
                            [...Array(7)].map((_, i) => (
                                <div key={i} className={`w-1 rounded-full bg-cyan-400 animate-speaking`} 
                                     style={{ height: '4px', animationDelay: `${i * 0.1}s`, animationDuration: `${0.3 + Math.random() * 0.4}s` }}></div>
                            ))
                        ) : status === 'listening' ? (
                            <div className="w-24 h-[2px] bg-indigo-400/50 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-400 animate-progress-fast w-1/3"></div>
                            </div>
                        ) : (
                            <div className="w-12 h-[2px] bg-white/10 rounded-full"></div>
                        )}
                    </div>
                </div>

                {/* Status Indicator Circle (Rotating outer ring) */}
                <svg className="absolute w-60 h-60 pointer-events-none" viewBox="0 0 100 100">
                    <circle 
                        cx="50" cy="50" r="48" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="0.5" 
                        strokeDasharray="1, 4"
                        className={`text-white/10 transition-all duration-1000 ${status !== 'idle' ? 'animate-spin-slow text-indigo-500/30' : ''}`}
                    />
                </svg>
            </div>

            {/* ── INFORMATION DISPLAY ── */}
            <div className="w-full text-center space-y-6 min-h-[140px] px-4">
                <div className="space-y-1">
                    <span className={`text-xs font-bold uppercase tracking-[0.3em] transition-colors duration-300 ${
                        status === 'error' ? 'text-red-400' : 
                        status === 'listening' ? 'text-indigo-400' : 
                        status === 'speaking' ? 'text-cyan-400' : 'text-slate-500'
                    }`}>
                        {status === 'idle' ? 'System Ready' : 
                         status === 'listening' ? 'Listening...' : 
                         status === 'thinking' ? 'Processing...' : 
                         status === 'speaking' ? 'Speaking...' : 'System Error'}
                    </span>
                    
                    {status === 'error' ? (
                        <div className="flex items-center justify-center gap-2 text-red-400 mt-2 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle size={16} />
                            <p className="text-sm font-medium">{errorMessage}</p>
                        </div>
                    ) : (
                        <div className="min-h-[20px]">
                            {transcript && (
                                <p className="text-indigo-300/80 italic text-sm mt-1 animate-in fade-in">
                                    "{transcript}"
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className="max-w-2xl mx-auto">
                    {response && (status === 'speaking' || status === 'idle') && (
                        <div className="bg-white/[0.03] backdrop-blur-md border border-white/10 p-6 rounded-3xl animate-in fade-in zoom-in-95 duration-500 shadow-2xl">
                            <p className="text-slate-200 text-lg leading-relaxed font-medium">
                                {response}
                            </p>
                        </div>
                    )}
                    {status === 'listening' && !transcript && (
                        <p className="text-xl text-indigo-100/60 animate-pulse italic font-light">
                            "Say something, I'm listening..."
                        </p>
                    )}
                </div>
            </div>

            {/* ── CONTROLS ── */}
            <div className="mt-12 flex items-center gap-8">
                <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-5 rounded-2xl border transition-all duration-300 group ${
                        isMuted ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                    title={isMuted ? "Unmute" : "Mute"}
                >
                    {isMuted ? <VolumeX size={26} /> : <Volume2 size={26} className="group-hover:scale-110 transition-transform" />}
                </button>

                <button 
                    onClick={handleMicClick}
                    className={`p-10 rounded-full transition-all duration-500 relative group ${
                        status === 'listening' ? 'bg-red-500 scale-110 shadow-[0_0_50px_rgba(239,68,68,0.5)]' : 
                        status === 'thinking' ? 'bg-purple-600 animate-pulse shadow-[0_0_50px_rgba(147,51,234,0.5)]' :
                        status === 'speaking' ? 'bg-cyan-500 scale-105 shadow-[0_0_50px_rgba(34,211,238,0.5)]' :
                        'bg-indigo-600 hover:bg-indigo-500 shadow-[0_20px_40px_rgba(79,70,229,0.3)] hover:-translate-y-1'
                    }`}
                >
                    <div className="relative z-10">
                        {status === 'listening' ? <MicOff size={36} /> : 
                         status === 'thinking' ? <RefreshCw size={36} className="animate-spin" /> : 
                         <Mic size={36} className="group-hover:scale-110 transition-transform" />}
                    </div>
                    {/* Ring animation for listening */}
                    {status === 'listening' && (
                        <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-ping"></div>
                    )}
                </button>

                <button 
                    className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 text-slate-400 hover:text-white group"
                    onClick={clearChat}
                    title="Clear Conversation"
                >
                    <X size={26} className="group-hover:rotate-90 transition-transform" />
                </button>
            </div>

            {/* Custom Animations */}
            <style>{`
                @keyframes speaking {
                    0%, 100% { height: 4px; opacity: 0.5; }
                    50% { height: 32px; opacity: 1; }
                }
                .animate-speaking {
                    animation: speaking 0.4s ease-in-out infinite;
                }
                .animate-spin-slow {
                    animation: spin 12s linear infinite;
                }
                @keyframes progress {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(300%); }
                }
                .animate-progress-fast {
                    animation: progress 1.5s infinite linear;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default VoiceBot;

