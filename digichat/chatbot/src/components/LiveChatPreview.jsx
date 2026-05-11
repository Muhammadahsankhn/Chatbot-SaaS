import { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { Send, Mic, MicOff, X, Bot } from "lucide-react";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8001`;

function getApiKey() {
  try {
    const user = JSON.parse(localStorage.getItem("cb_user") || "{}");
    return user.apiKey || user.generatedApiKey || "";
  } catch { return ""; }
}

// ── Voice Modal (Human Face) ──────────────────────────────────────
function VoiceModal({ open, onClose, color, botName, theme = "dark", messages, setMessages, sessionId }) {
  const [voiceStatus, setVoiceStatus] = useState("idle"); // idle, listening, thinking, speaking
  const [transcript, setTranscript]   = useState("");
  const [reply, setReply]             = useState("");
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);

  const isListening = voiceStatus === "listening";
  const isThinking  = voiceStatus === "thinking";
  const isSpeaking  = voiceStatus === "speaking";
  const glowColor   = color || "#6366f1";
  const isDark      = theme === "dark";

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
      }
      if (synthRef.current) synthRef.current.cancel();
      setVoiceStatus("idle");
      setTranscript("");
      setReply("");
    }
  }, [open]);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (synthRef.current) synthRef.current.cancel();

    try {
      const rec = new SpeechRecognition();
      rec.lang = "en-US";
      rec.interimResults = true;
      rec.continuous = false;
      recognitionRef.current = rec;

      rec.onstart = () => {
        setVoiceStatus("listening");
        setTranscript("");
      };

      rec.onresult = (event) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        setTranscript(finalTranscript || interimTranscript);

        if (finalTranscript) {
          handleBotResponse(finalTranscript);
        }
      };

      rec.onerror = (e) => {
        console.error("[Voice] Recognition Error:", e.error);
        setVoiceStatus("idle");
        if (e.error === 'not-allowed') {
          alert("Microphone access denied. Please allow it in settings.");
        }
      };

      rec.onend = () => {
        setVoiceStatus(prev => (prev === "listening") ? "idle" : prev);
      };

      rec.start();
    } catch (err) {
      console.error("[Voice] Failed to start:", err);
      setVoiceStatus("idle");
    }
  };

  const handleBotResponse = async (text) => {
    setVoiceStatus("thinking");
    setMessages(m => [...m, { role: "user", text }]);

    try {
      const apiKey = getApiKey();
      const res = await axios.post(`${BASE_URL}/chat/message`, 
        { 
          message: text, 
          visitorId: "preview-user",
          sessionId,
          history: messages.slice(-6).map(m => ({
            role: m.role === "bot" ? "model" : "user",
            content: m.text
          }))
        },
        { headers: { "x-api-key": apiKey } }
      );
      const botReply = res.data?.reply || "I'm not sure how to answer that.";
      setReply(botReply);
      setMessages(m => [...m, { role: "bot", text: botReply }]);
      setVoiceStatus("speaking");
      speak(botReply);
    } catch (err) {
      console.error("[Voice] API error:", err);
      setVoiceStatus("idle");
      setReply("Connection issue.");
    }
  };

  const speak = (text) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    
    const utter = new SpeechSynthesisUtterance(text);
    
    // Ensure voices are loaded
    const loadVoicesAndSpeak = () => {
      const voices = synthRef.current.getVoices();
      const voice = voices.find(v => v.name.includes("Google") && v.lang.startsWith("en")) 
                 || voices.find(v => v.lang.startsWith("en")) 
                 || voices[0];
      if (voice) utter.voice = voice;
      
      utter.onend = () => setVoiceStatus("idle");
      utter.onerror = () => setVoiceStatus("idle");
      synthRef.current.speak(utter);
    };

    if (synthRef.current.getVoices().length === 0) {
      synthRef.current.onvoiceschanged = loadVoicesAndSpeak;
    } else {
      loadVoicesAndSpeak();
    }
  };

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-300"
      style={{ 
        background: isDark 
          ? "linear-gradient(160deg,#080810,#121225)" 
          : "linear-gradient(160deg,#f8fafc,#eff6ff)" 
      }}>
      
      <button onClick={onClose} className={`absolute top-4 right-4 p-1.5 rounded-full transition-all ${isDark ? 'bg-white/5 hover:bg-white/10 text-white/40 hover:text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-500 hover:text-slate-800'}`}>
        <X size={16} />
      </button>

      <p className="text-indigo-500 text-[9px] uppercase tracking-[0.3em] font-black mb-6">{botName}</p>

      {/* face */}
      <div className="relative flex items-center justify-center mb-8" style={{ width: 140, height: 140 }}>
        <div className="absolute inset-0 rounded-full transition-all duration-1000"
          style={{ 
            boxShadow: `0 0 ${isListening || isSpeaking ? "60px 15px" : "20px 5px"} ${glowColor}44`,
            background: `radial-gradient(circle, ${glowColor}22 0%, transparent 70%)` 
          }} />
        
        <div className={`relative w-28 h-28 rounded-full flex flex-col items-center justify-center overflow-hidden transition-all duration-500 ${isThinking ? 'animate-pulse' : ''}`}
          style={{ 
            background: isDark ? "linear-gradient(135deg,#151525,#050510)" : "linear-gradient(135deg,#f1f5f9,#e2e8f0)", 
            border: `1px solid ${isListening ? (isDark ? '#fff' : glowColor) : glowColor + '88'}`, 
            transition: "all 0.5s" 
          }}>
          
          <div className="flex gap-6 mb-4">
            {[0, 1].map(i => (
              <div key={i} className={`w-3 h-3 rounded-full flex items-center justify-center transition-all duration-300 ${isListening ? 'scale-y-[0.1]' : 'scale-100'}`}
                style={{ 
                  background: isListening && !isDark ? "#000" : `radial-gradient(circle, ${glowColor} 0%, transparent 100%)`, 
                  boxShadow: `0 0 10px ${glowColor}aa` 
                }}>
                <div className={`w-1 h-1 rounded-full animate-pulse ${isDark ? 'bg-white' : 'bg-slate-800'}`} />
              </div>
            ))}
          </div>

          <div className="flex items-end gap-0.5 h-6">
            {isSpeaking 
              ? [1, 2, 3, 2, 1].map((h, i) => <div key={i} className="w-1 rounded-full" style={{ height: h * 6, background: glowColor, animation: `mouthBar 0.2s ease-in-out ${i * 0.05}s infinite alternate` }} />)
              : isListening ? <div className={`w-12 h-[2px] animate-pulse ${isDark ? 'bg-white/40' : 'bg-slate-400'}`} />
              : <div className="w-8 h-0.5 opacity-20" style={{ background: glowColor }} />}
          </div>
        </div>
      </div>

      <div className="text-center space-y-1 mb-6 min-h-[60px]">
        <h3 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {isListening ? "Listening..." : isThinking ? "Thinking..." : isSpeaking ? "Speaking..." : "Ready"}
        </h3>
        <div className="px-4">
          <p className={`text-xs max-w-[200px] mx-auto leading-relaxed line-clamp-3 italic ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {transcript ? `"${transcript}"` : reply ? reply : "I'm listening for your question..."}
          </p>
        </div>
      </div>

      <button onClick={startListening}
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 ${isListening ? 'scale-110 shadow-[0_0_30px_rgba(239,68,68,0.4)]' : ''}`}
        style={{ 
          background: isListening ? '#ef4444' : `linear-gradient(135deg, ${glowColor}, ${glowColor}dd)`, 
          boxShadow: isListening ? 'none' : `0 8px 20px ${glowColor}44` 
        }}>
        {isListening ? <MicOff size={24} color="#fff" /> : <Mic size={24} color="#fff" />}
      </button>

      <style>{`
        @keyframes mouthBar { from{height:3px;opacity:0.5} to{height:20px;opacity:1} }
      `}</style>
    </div>
  );
}

// ── Live Chat Widget Preview ──────────────────────────────────────
export function LiveChatPreview({ cfg, logoPreview }) {
  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState("");
  const [isTyping,   setIsTyping]   = useState(false);
  const [voiceOpen,  setVoiceOpen]  = useState(false);
  const [sessionId]                 = useState(() => `preview-${Date.now()}`);
  const bottomRef = useRef(null);

  const previewBg   = cfg.theme === "dark" ? "#1e1e2e" : "#ffffff";
  const previewText = cfg.theme === "dark" ? "#e2e8f0" : "#1e293b";
  const previewMsg  = cfg.theme === "dark" ? "#16162a" : "#f1f5f9";
  const borderCol   = cfg.theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)";

  // Show welcome message on mount / config change
  useEffect(() => {
    setMessages([{ role: "bot", text: cfg.welcomeMessage || "Hi! How can I help you today?" }]);
  }, [cfg.welcomeMessage]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isTyping) return;
    setInput("");
    setMessages(m => [...m, { role: "user", text }]);
    setIsTyping(true);

    try {
      const apiKey = getApiKey();
      if (!apiKey) {
        setMessages(m => [...m, { role: "bot", text: "No API key found. Please save your settings first." }]);
        setIsTyping(false);
        return;
      }
      const res = await axios.post(
        `${BASE_URL}/chat/message`,
        {
          message:   text,
          sessionId,
          visitorId: "preview-user",
          history:   messages.slice(-6).map(m => ({
            role:    m.role === "bot" ? "model" : "user",
            content: m.text,
          })),
        },
        { headers: { "x-api-key": apiKey } }
      );
      const reply = res.data?.reply || "Sorry, I couldn't get a response.";
      setMessages(m => [...m, { role: "bot", text: reply }]);
    } catch {
      setMessages(m => [...m, { role: "bot", text: "Unable to reach the AI service. Please make sure the server is running." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  return (
    <div className="relative w-full max-w-[300px] rounded-2xl overflow-hidden shadow-2xl flex flex-col" style={{ height: 420 }}>
      {voiceOpen && (
        <VoiceModal 
          open={voiceOpen} 
          onClose={() => setVoiceOpen(false)} 
          color={cfg.color} 
          botName={cfg.botName} 
          theme={cfg.theme}
          messages={messages}
          setMessages={setMessages}
          sessionId={sessionId}
        />
      )}
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ background: cfg.color }}>
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center overflow-hidden shrink-0">
            {logoPreview ? <img src={logoPreview} alt="logo" className="w-full h-full object-cover" /> : <Bot size={18} color="#fff" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-white truncate">{cfg.botName || "Assistant"}</div>
            <div className="text-[10px] text-white/80 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2" style={{ background: previewBg }}>
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className="px-3 py-2 rounded-2xl text-xs leading-relaxed max-w-[85%] break-words"
                style={m.role === "user"
                  ? { background: cfg.color, color: "#fff", borderBottomRightRadius: 4 }
                  : { background: previewMsg, color: previewText, borderTopLeftRadius: 4 }}>
                {m.text}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="px-3 py-2.5 rounded-2xl flex gap-1 items-center" style={{ background: previewMsg, borderTopLeftRadius: 4 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: previewText, opacity: 0.5, animation: `dotBounce 1s ease-in-out ${i * 0.15}s infinite` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 flex items-center gap-1.5 p-2" style={{ background: previewBg, borderTop: `1px solid ${borderCol}` }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={cfg.placeholder || "Type a message..."}
            className="flex-1 h-8 rounded-xl px-3 text-[11px] outline-none resize-none"
            style={{ background: previewMsg, color: previewText, border: `1px solid ${borderCol}` }}
          />
          {/* Voice btn */}
          <button onClick={() => setVoiceOpen(true)} className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all hover:scale-110"
            style={{ background: previewMsg, border: `1px solid ${cfg.color}55` }}>
            <Mic size={13} color={cfg.color} />
          </button>
          {/* Send btn */}
          <button onClick={sendMessage} disabled={!input.trim() || isTyping}
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-md transition-all hover:scale-105 disabled:opacity-50"
            style={{ background: cfg.color }}>
            <Send size={13} color="#fff" />
          </button>
        </div>

        <style>{`
          @keyframes dotBounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }
        `}</style>
      </div>
  );
}