(function () {
  const currentScript = document.currentScript;
  const API_KEY = currentScript.getAttribute("data-api-key");

  // Auto-detect server from script src or explicit data-server attribute
  const SERVER_URL =
    currentScript.getAttribute("data-server") ||
    currentScript.src.split("/widget.js")[0];

  if (!API_KEY) {
    console.error("[DigiChat] Missing data-api-key attribute.");
    return;
  }

  let config      = {};
  let sessionId   = null;
  let isOpen      = false;
  let isTyping    = false;
  let history     = [];

  // ── Fetch widget config from FastAPI ──
  async function fetchConfig() {
    try {
      const res = await fetch(`${SERVER_URL}/chat/config/${API_KEY}`);
      const data = await res.json();
      if (data.success) config = data.config;
    } catch (e) {
      console.warn("[DigiChat] Could not load config, using defaults.");
    }
  }

  // ── Inject styles ──
  function injectStyles() {
    const color      = config.color    || "#6366f1";
    const isDark     = config.theme   === "dark";
    const bg         = isDark ? "#1e1e2e" : "#ffffff";
    const msgBg      = isDark ? "#16161e" : "#f8fafc";
    const textColor  = isDark ? "#e2e8f0" : "#1e293b";
    const borderCol  = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

    const css = `
      #cb-widget * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'DM Sans', -apple-system, sans-serif; }
      #cb-btn {
        position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px;
        border-radius: 50%; background: ${color}; border: none; cursor: pointer;
        box-shadow: 0 4px 20px ${color}60; display: flex; align-items: center; justify-content: center;
        transition: transform .2s, box-shadow .2s; z-index: 99998;
      }
      #cb-btn:hover { transform: scale(1.08); box-shadow: 0 6px 28px ${color}80; }
      #cb-btn svg { width: 24px; height: 24px; fill: white; }
      #cb-window {
        position: fixed; bottom: 92px; right: 24px; width: 370px; height: 540px;
        background: ${bg}; border-radius: 18px; border: 1px solid ${borderCol};
        box-shadow: 0 20px 60px rgba(0,0,0,0.2); display: flex; flex-direction: column;
        overflow: hidden; z-index: 99997; opacity: 0; pointer-events: none;
        transform: translateY(12px) scale(0.97); transition: opacity .25s, transform .25s;
      }
      #cb-window.open { opacity: 1; pointer-events: all; transform: translateY(0) scale(1); }
      #cb-header {
        background: ${color}; padding: 14px 16px; display: flex;
        align-items: center; justify-content: space-between; flex-shrink: 0;
      }
      #cb-header-left { display: flex; align-items: center; gap: 10px; }
      .cb-avatar {
        width: 34px; height: 34px; border-radius: 50%; background: rgba(255,255,255,0.25);
        display: flex; align-items: center; justify-content: center; font-size: 16px; overflow: hidden; flex-shrink: 0;
      }
      .cb-avatar img { width: 100%; height: 100%; object-fit: cover; }
      #cb-bot-name { color: white; font-weight: 700; font-size: 14px; }
      #cb-status   { color: rgba(255,255,255,0.75); font-size: 11px; margin-top: 1px; }
      #cb-close {
        background: rgba(255,255,255,0.2); border: none; width: 28px; height: 28px;
        border-radius: 50%; cursor: pointer; color: white; font-size: 16px;
        display: flex; align-items: center; justify-content: center;
      }
      #cb-msgs {
        flex: 1; overflow-y: auto; padding: 16px; display: flex;
        flex-direction: column; gap: 10px; scroll-behavior: smooth;
      }
      #cb-msgs::-webkit-scrollbar { width: 3px; }
      #cb-msgs::-webkit-scrollbar-thumb { background: ${borderCol}; border-radius: 3px; }
      .cb-msg { display: flex; gap: 8px; align-items: flex-end; animation: cb-fadein .2s ease; }
      .cb-msg.user { flex-direction: row-reverse; }
      @keyframes cb-fadein { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      .cb-bubble-avatar {
        width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
        background: ${color}22; display: flex; align-items: center; justify-content: center; font-size: 12px; overflow: hidden;
      }
      .cb-bubble-avatar img { width: 100%; height: 100%; object-fit: cover; }
      .cb-msg-content { max-width: 78%; }
      .cb-bubble {
        padding: 9px 13px; border-radius: 16px; font-size: 13.5px; line-height: 1.55;
        color: ${textColor}; word-break: break-word;
      }
      .cb-msg.bot  .cb-bubble { background: ${msgBg}; border: 1px solid ${borderCol}; border-bottom-left-radius: 4px; }
      .cb-msg.user .cb-bubble { background: ${color}; color: white; border-bottom-right-radius: 4px; }
      .cb-time { font-size: 10px; color: #94a3b8; margin-top: 3px; padding: 0 4px; }
      .cb-msg.user .cb-time { text-align: right; }
      .cb-typing { display: flex; gap: 4px; align-items: center; padding: 10px 14px; background: ${msgBg}; border: 1px solid ${borderCol}; border-radius: 16px; border-bottom-left-radius: 4px; width: fit-content; }
      .cb-typing span { width: 6px; height: 6px; background: #94a3b8; border-radius: 50%; animation: cb-bounce .9s infinite; }
      .cb-typing span:nth-child(2) { animation-delay: .15s; }
      .cb-typing span:nth-child(3) { animation-delay: .3s; }
      @keyframes cb-bounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-5px); } }
      #cb-footer {
        padding: 12px; border-top: 1px solid ${borderCol}; display: flex; gap: 8px; flex-shrink: 0;
        background: ${bg};
      }
      #cb-input {
        flex: 1; background: ${msgBg}; border: 1px solid ${borderCol}; border-radius: 12px;
        padding: 9px 13px; font-size: 13.5px; color: ${textColor}; outline: none; resize: none;
        max-height: 100px; line-height: 1.4; font-family: inherit;
      }
      #cb-input::placeholder { color: #94a3b8; }
      #cb-send {
        width: 38px; height: 38px; border-radius: 10px; background: ${color}; border: none;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        flex-shrink: 0; align-self: flex-end; transition: opacity .15s;
      }
      #cb-send:disabled { opacity: 0.5; cursor: not-allowed; }
      #cb-send svg { width: 16px; height: 16px; fill: white; }
      @media (max-width: 420px) {
        #cb-window { width: calc(100vw - 16px); right: 8px; bottom: 80px; height: 70vh; }
        #cb-btn { right: 16px; bottom: 16px; }
      }
    `;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ── Build widget DOM ──
  function buildWidget() {
    const botName     = config.botName       || "Assistant";
    const welcome     = config.welcomeMessage || "Hi! How can I help you today?";
    const placeholder = config.placeholder   || "Type a message...";
    const logoUrl     = config.logoUrl       || "";
    const position    = config.position      || "bottom-right";

    const avatarContent = logoUrl
      ? `<img src="${logoUrl}" alt="bot"/>`
      : "🤖";

    const container = document.createElement("div");
    container.id    = "cb-widget";
    container.innerHTML = `
      <button id="cb-btn" aria-label="Open chat">
        <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
      </button>
      <div id="cb-window" role="dialog" aria-label="Chat window">
        <div id="cb-header">
          <div id="cb-header-left">
            <div class="cb-avatar">${avatarContent}</div>
            <div>
              <div id="cb-bot-name">${botName}</div>
              <div id="cb-status">Online</div>
            </div>
          </div>
          <button id="cb-close" aria-label="Close">✕</button>
        </div>
        <div id="cb-msgs"></div>
        <div id="cb-footer">
          <textarea id="cb-input" placeholder="${placeholder}" rows="1"></textarea>
          <button id="cb-send">
            <svg viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
          </button>
        </div>
      </div>
    `;

    if (position === "bottom-left") {
      container.querySelector("#cb-btn").style.right    = "auto";
      container.querySelector("#cb-btn").style.left     = "24px";
      container.querySelector("#cb-window").style.right = "auto";
      container.querySelector("#cb-window").style.left  = "24px";
    }

    document.body.appendChild(container);

    // Welcome message
    addMessage("bot", welcome);
  }

  // ── Events ──
  function attachEvents() {
    document.getElementById("cb-btn").addEventListener("click", toggleChat);
    document.getElementById("cb-close").addEventListener("click", toggleChat);
    document.getElementById("cb-send").addEventListener("click", sendMessage);

    const input = document.getElementById("cb-input");
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    input.addEventListener("input", () => {
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 100) + "px";
    });
  }

  function toggleChat() {
    isOpen = !isOpen;
    const win = document.getElementById("cb-window");
    const btn = document.getElementById("cb-btn");
    win.classList.toggle("open", isOpen);
    btn.innerHTML = isOpen
      ? `<svg viewBox="0 0 24 24" fill="white"><path d="M18 6L6 18M6 6l12 12" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg>`
      : `<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`;
    if (isOpen) document.getElementById("cb-input").focus();
  }

  function addMessage(role, text) {
    const msgs       = document.getElementById("cb-msgs");
    const logoUrl    = config.logoUrl || "";
    const time       = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const avatarHtml = logoUrl
      ? `<div class="cb-bubble-avatar"><img src="${logoUrl}" alt="bot"/></div>`
      : `<div class="cb-bubble-avatar">🤖</div>`;

    const div = document.createElement("div");
    div.className = `cb-msg ${role}`;
    div.innerHTML = role === "bot"
      ? `${avatarHtml}<div class="cb-msg-content"><div class="cb-bubble">${text}</div><div class="cb-time">${time}</div></div>`
      : `<div class="cb-msg-content"><div class="cb-bubble">${text}</div><div class="cb-time">${time}</div></div>`;

    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function showTyping() {
    const msgs = document.getElementById("cb-msgs");
    const div  = document.createElement("div");
    div.className = "cb-msg bot";
    div.id        = "cb-typing";
    div.innerHTML = `<div class="cb-bubble-avatar">🤖</div><div class="cb-typing"><span></span><span></span><span></span></div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function hideTyping() {
    const t = document.getElementById("cb-typing");
    if (t) t.remove();
  }

  async function sendMessage() {
    const input = document.getElementById("cb-input");
    const text  = input.value.trim();
    if (!text || isTyping) return;

    input.value      = "";
    input.style.height = "auto";
    isTyping         = true;
    document.getElementById("cb-send").disabled = true;

    addMessage("user", text);
    showTyping();

    // Add to history
    history.push({ role: "user", text });

    try {
      const res  = await fetch(`${SERVER_URL}/chat/message`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
        body:    JSON.stringify({
          message:   text,
          sessionId: sessionId,
          visitorId: getVisitorId(),
          page:      window.location.href,
          history:   history.slice(-10),   // last 10 messages for context
        }),
      });

      const data = await res.json();
      hideTyping();

      if (data.success) {
        sessionId = data.sessionId;
        addMessage("bot", data.reply);
        history.push({ role: "model", text: data.reply });
        // Keep history trimmed
        if (history.length > 20) history = history.slice(-20);
      } else {
        addMessage("bot", data.message || "Something went wrong. Please try again.");
      }
    } catch (err) {
      hideTyping();
      addMessage("bot", "Connection issue. Please check your internet and try again.");
    }

    isTyping = false;
    document.getElementById("cb-send").disabled = false;
    document.getElementById("cb-input").focus();
  }

  function getVisitorId() {
    let vid = localStorage.getItem("cb_visitor_id");
    if (!vid) {
      vid = "v_" + Math.random().toString(36).substr(2,9) + Date.now();
      localStorage.setItem("cb_visitor_id", vid);
    }
    return vid;
  }

  // ── Init ──
  async function init() {
    await fetchConfig();
    injectStyles();
    buildWidget();
    attachEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();