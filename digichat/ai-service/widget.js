(function () {
  const currentScript = document.currentScript;
  const API_KEY = currentScript.getAttribute("data-api-key");
  const SERVER_URL =
    currentScript.getAttribute("data-server") ||
    currentScript.src.split("/widget.js")[0];

  if (!API_KEY) return;

  let config    = {};
  let sessionId = null;
  let isOpen    = false;
  let isTyping  = false;
  let history   = [];
  let shadow    = null;

  async function fetchConfig() {
    try {
      const res  = await fetch(`${SERVER_URL}/chat/config/${API_KEY}?t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) config = data.config;
    } catch (e) {
      console.warn("[DigiChat] Could not load config.");
    }
  }

  function buildWidget() {
    const color      = config.color          || "#4f46e5";
    const botName    = config.botName        || "Dentia";
    const role       = config.role           || "BUSINESS ADVISOR";
    const isDark     = config.theme         === "dark";
    const bg         = isDark ? "#0a0a0f"   : "#ffffff";
    const msgBg      = isDark ? "#16161e"   : "#ffffff";
    const textColor  = isDark ? "#f8fafc"   : "#1e293b";
    const borderCol  = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
    const agentImg   = config.logoUrl        || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=800&auto=format&fit=crop";
    const placeholder= config.placeholder   || `Ask ${botName}...`;
    const position   = config.position      || "bottom-right";
    const hPos       = position === "bottom-left" ? "left: 24px;" : "right: 24px;";

    const host = document.createElement("div");
    host.id    = "digichat-widget-host";
    host.style.cssText = "all:initial;position:fixed;bottom:0;right:0;z-index:2147483647;";
    document.body.appendChild(host);

    shadow = host.attachShadow({ mode: "open" });

    const css = `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', system-ui, -apple-system, sans-serif; }
      
      /* ── FAB ── */
      #cb-btn {
        position: fixed; bottom: 24px; ${hPos} width: 60px; height: 60px; border-radius: 50%;
        background: ${color}; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
        box-shadow: 0 8px 32px ${color}44; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); z-index: 99999;
      }
      #cb-btn:hover { transform: scale(1.1); box-shadow: 0 12px 48px ${color}66; }
      #cb-btn svg { width: 28px; height: 28px; fill: white; }

      /* ── Window ── */
      #cb-window {
        position: fixed; bottom: 100px; ${hPos} width: 400px; height: 700px; max-height: calc(100vh - 120px);
        background: ${bg}; border-radius: 24px; border: 1px solid ${borderCol};
        box-shadow: 0 24px 80px rgba(0,0,0,0.15); display: flex; flex-direction: column;
        overflow: hidden; z-index: 99998; opacity: 0; pointer-events: none;
        transform: translateY(20px) scale(0.95); transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      }
      #cb-window.open { opacity: 1; pointer-events: all; transform: translateY(0) scale(1); }

      /* ── Header ── */
      #cb-header {
        padding: 20px 24px; border-bottom: 1px solid ${borderCol}; display: flex; align-items: center; justify-content: space-between;
      }
      #cb-header-info { display: flex; align-items: center; gap: 8px; }
      #cb-header-title { font-size: 18px; font-weight: 800; color: ${textColor}; }
      #cb-header-dot { color: ${color}; font-weight: 900; font-size: 20px; }
      #cb-header-role { font-size: 11px; font-weight: 700; color: #94a3b8; letter-spacing: 0.1em; text-transform: uppercase; }
      #cb-close { background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; border-radius: 50%; transition: all 0.2s; }
      #cb-close:hover { background: ${borderCol}; color: ${textColor}; }

      /* ── Hero Agent Section ── */
      #cb-hero { padding: 16px 24px; }
      #cb-hero-card {
        position: relative; width: 100%; border-radius: 20px; overflow: hidden; aspect-ratio: 16 / 10;
        background: #000; box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      }
      #cb-hero-img { width: 100%; height: 100%; object-fit: cover; opacity: 0.9; }
      #cb-hero-overlay {
        position: absolute; bottom: 16px; left: 0; right: 0; display: flex; justify-content: center;
      }
      #cb-hero-speak {
        background: #fff; border: none; padding: 10px 20px; border-radius: 30px; display: flex; align-items: center; gap: 10px;
        font-weight: 700; font-size: 13px; color: ${color}; cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.2); transition: transform 0.2s;
      }
      #cb-hero-speak:hover { transform: translateY(-2px); }
      #cb-hero-speak svg { width: 16px; height: 16px; stroke: ${color}; stroke-width: 2.5; }

      /* ── Messages ── */
      #cb-msgs { flex: 1; overflow-y: auto; padding: 0 24px 20px; display: flex; flex-direction: column; gap: 16px; }
      #cb-msgs::-webkit-scrollbar { width: 4px; }
      #cb-msgs::-webkit-scrollbar-thumb { background: ${borderCol}; border-radius: 4px; }

      .cb-msg { display: flex; flex-direction: column; gap: 4px; max-width: 85%; animation: cb-pop 0.3s ease-out; }
      .cb-msg.bot { align-self: flex-start; }
      .cb-msg.user { align-self: flex-end; align-items: flex-end; }
      
      .cb-bubble {
        padding: 14px 20px; border-radius: 18px; font-size: 14px; line-height: 1.6; color: ${textColor};
        background: ${msgBg}; border: 1px solid ${borderCol}; box-shadow: 0 2px 8px rgba(0,0,0,0.02);
      }
      .cb-msg.bot .cb-bubble { border-top-left-radius: 4px; }
      .cb-msg.user .cb-bubble { background: ${color}; color: #fff; border: none; border-top-right-radius: 4px; }

      @keyframes cb-pop { from { opacity: 0; transform: scale(0.9) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }

      /* ── Footer ── */
      #cb-footer { padding: 20px 24px 24px; border-top: 1px solid ${borderCol}; }
      #cb-input-group {
        display: flex; align-items: center; gap: 12px; background: ${isDark ? "#16161e" : "#f8fafc"};
        border: 1px solid ${borderCol}; border-radius: 16px; padding: 8px 12px; transition: border-color 0.2s;
      }
      #cb-input-group:focus-within { border-color: ${color}; }
      #cb-input {
        flex: 1; border: none; background: none; font-size: 14px; color: ${textColor}; outline: none; padding: 8px 4px; resize: none; max-height: 100px;
      }
      .cb-action-btn {
        width: 36px; height: 36px; border: none; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center;
        transition: all 0.2s; background: none;
      }
      #cb-voice-btn { color: #94a3b8; }
      #cb-voice-btn:hover { background: ${color}11; color: ${color}; }
      #cb-send-btn { color: ${color}; }
      #cb-send-btn:hover { background: ${color}11; transform: translateX(2px); }
      #cb-send-btn:disabled { opacity: 0.3; cursor: not-allowed; }
      .cb-action-btn svg { width: 20px; height: 20px; }

      /* ── Voice Modal ── */
      #cb-voice-modal {
        position: absolute; inset: 0; background: rgba(8, 8, 16, 0.98); backdrop-filter: blur(12px); z-index: 100;
        display: none; flex-direction: column; align-items: center; justify-content: center; color: white;
      }
      #cb-voice-modal.open { display: flex; animation: cb-fadein 0.4s ease; }
      .cb-voice-face {
        width: 160px; height: 160px; border-radius: 50%; background: radial-gradient(circle, ${color}, #000);
        position: relative; box-shadow: 0 0 80px ${color}44; margin-bottom: 24px; display: flex; align-items: center; justify-content: center;
      }
      .cb-voice-pulse {
        position: absolute; inset: -12px; border: 2px solid ${color}44; border-radius: 50%; animation: cb-pulse 2s infinite;
      }
      @keyframes cb-pulse { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(1.6); opacity: 0; } }
      #cb-voice-status { font-size: 22px; font-weight: 800; margin-bottom: 6px; }
      #cb-voice-sub { color: #94a3b8; font-size: 14px; text-align: center; max-width: 80%; }
      .cb-vclose { position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.05); border: none; color: #fff; cursor: pointer; padding: 8px; border-radius: 50%; display: flex; }

      @media (max-width: 480px) {
        #cb-window { width: 100vw; height: 100vh; max-height: 100vh; bottom: 0; right: 0; border-radius: 0; }
        #cb-btn.open { display: none; }
      }
    `;

    shadow.innerHTML = `
      <style>${css}</style>
      <button id="cb-btn"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></button>
      <div id="cb-window">
        <div id="cb-header">
          <div id="cb-header-info">
            <span id="cb-header-title">${botName}</span>
            <span id="cb-header-dot">•</span>
            <span id="cb-header-role">${role}</span>
          </div>
          <button id="cb-close">✕</button>
        </div>
        <div id="cb-hero">
          <div id="cb-hero-card">
            <img src="${agentImg}" id="cb-hero-img">
            <div id="cb-hero-overlay">
              <button id="cb-hero-speak">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                Speak with ${botName}
              </button>
            </div>
          </div>
        </div>
        <div id="cb-msgs"></div>
        <div id="cb-footer">
          <div id="cb-input-group">
            <textarea id="cb-input" placeholder="${placeholder}" rows="1"></textarea>
            <button id="cb-voice-btn" class="cb-action-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg></button>
            <button id="cb-send-btn" class="cb-action-btn" disabled><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></button>
          </div>
        </div>
        <div id="cb-voice-modal">
          <button class="cb-vclose">✕</button>
          <div class="cb-voice-face"><div class="cb-voice-pulse"></div><svg width="60" height="60" viewBox="0 0 24 24" fill="white"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/></svg></div>
          <div id="cb-voice-status">Listening...</div>
          <div id="cb-voice-sub">I'm waiting for your question.</div>
        </div>
      </div>
    `;
    attachEvents();
  }

  function $(id) { return shadow.getElementById(id); }

  function toggleChat() {
    isOpen = !isOpen;
    $("cb-window").classList.toggle("open", isOpen);
    $("cb-btn").innerHTML = isOpen ? "✕" : `<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`;
    if (isOpen && history.length === 0) {
      addMessage("bot", config.welcomeMessage || `Hi, I'm ${config.botName || 'Dentia'}! How can I help you today?`);
    }
  }

  function addMessage(role, text) {
    const div = document.createElement("div");
    div.className = `cb-msg ${role}`;
    div.innerHTML = `<div class="cb-bubble">${text}</div>`;
    $("cb-msgs").appendChild(div);
    $("cb-msgs").scrollTop = $("cb-msgs").scrollHeight;
    history.push({ role: role === "bot" ? "model" : "user", text });
  }

  async function sendMessage() {
    const input = $("cb-input");
    const text  = input.value.trim();
    if (!text || isTyping) return;
    input.value = ""; input.style.height = "auto";
    addMessage("user", text);
    isTyping = true;
    
    try {
      const res = await fetch(`${SERVER_URL}/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
        body: JSON.stringify({ message: text, history: history.slice(-6) })
      });
      const data = await res.json();
      if (data.success) addMessage("bot", data.reply);
    } catch { addMessage("bot", "Oops, something went wrong."); }
    finally { isTyping = false; }
  }

  // ── Voice Agent Logic (Real STT/TTS) ──
  let voiceState = "idle";
  let recognition = null;

  function updateVoiceUI(state, text, subText) {
    voiceState = state;
    const status = $("cb-voice-status");
    const sub = $("cb-voice-sub");
    const face = shadow.querySelector(".cb-voice-face");
    const pulse = shadow.querySelector(".cb-voice-pulse");

    if (text) status.innerText = text;
    if (subText) sub.innerText = subText;

    const states = {
      idle:      { color: config.color || "#4f46e5", pulse: "none" },
      listening: { color: "#ef4444", pulse: "cb-pulse 1.5s infinite" },
      thinking:  { color: "#a78bfa", pulse: "cb-pulse 1s infinite" },
      speaking:  { color: "#22d3ee", pulse: "cb-pulse 2s infinite" }
    };

    const s = states[state] || states.idle;
    face.style.background = `radial-gradient(circle at 35% 35%, ${s.color}, #000)`;
    face.style.boxShadow = `0 0 100px ${s.color}44`;
    pulse.style.animation = s.pulse;
    pulse.style.borderColor = `${s.color}44`;
  }

  function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      updateVoiceUI("idle", "Error", "Speech recognition not supported in this browser.");
      return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognition.onstart = () => {
      updateVoiceUI("listening", "Listening...", "I'm listening to you...");
    };

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      updateVoiceUI("thinking", "Thinking...", `"${text}"`);
      handleVoiceMessage(text);
    };

    recognition.onerror = () => {
      updateVoiceUI("idle", "Try again", "Sorry, I didn't catch that.");
      setTimeout(closeVoice, 2000);
    };
    recognition.onend = () => {
      if (voiceState === "listening") {
        updateVoiceUI("idle", "Ready", "How can I help you?");
      }
    };
    recognition.start();
  }

  async function handleVoiceMessage(text) {
    try {
      const res = await fetch(`${SERVER_URL}/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
        body: JSON.stringify({ message: text, history: history.slice(-6) })
      });
      const data = await res.json();
      if (data.success) {
        updateVoiceUI("speaking", "Speaking...", data.reply);
        speakText(data.reply);
      } else {
        updateVoiceUI("idle", "Error", "Could not get a response.");
      }
    } catch {
      updateVoiceUI("idle", "Error", "Connection issue.");
    }
  }

  function speakText(text) {
    const synth = window.speechSynthesis;
    if (!synth) return;
    
    // Stop any current speech
    synth.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.onend = () => {
      setTimeout(closeVoice, 1500);
    };
    synth.speak(utter);
  }

  function openVoice() {
    $("cb-voice-modal").classList.add("open");
    startListening();
  }

  function closeVoice() {
    $("cb-voice-modal").classList.remove("open");
    if (recognition) recognition.stop();
    window.speechSynthesis.cancel();
    voiceState = "idle";
  }

  function attachEvents() {
    $("cb-btn").onclick = toggleChat;
    $("cb-close").onclick = toggleChat;
    $("cb-hero-speak").onclick = openVoice;
    $("cb-voice-btn").onclick = openVoice;
    shadow.querySelector(".cb-vclose").onclick = closeVoice;
    
    const input = $("cb-input");
    input.oninput = () => {
      input.style.height = "auto"; input.style.height = input.scrollHeight + "px";
      $("cb-send-btn").disabled = !input.value.trim();
    };
    input.onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
    $("cb-send-btn").onclick = sendMessage;
  }

  async function init() { await fetchConfig(); buildWidget(); }
  
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();