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

  let config    = {};
  let sessionId = null;
  let isOpen    = false;
  let isTyping  = false;
  let history   = [];
  let shadow    = null; // Shadow DOM root

  // ── Fetch widget config from FastAPI ──
  async function fetchConfig() {
    try {
      const res  = await fetch(`${SERVER_URL}/chat/config/${API_KEY}?t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) config = data.config;
    } catch (e) {
      console.warn("[DigiChat] Could not load config, using defaults.");
    }
  }

  // ── Build full widget inside Shadow DOM ──
  function buildWidget() {
    const color      = config.color          || "#6366f1";
    const isDark     = config.theme         === "dark";
    const bg         = isDark ? "#1e1e2e"   : "#ffffff";
    const msgBg      = isDark ? "#16161e"   : "#f8fafc";
    const textColor  = isDark ? "#e2e8f0"   : "#1e293b";
    const borderCol  = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
    const botName    = config.botName        || "Assistant";
    const welcome    = config.welcomeMessage || "Hi! How can I help you today?";
    const placeholder= config.placeholder   || "Type a message...";
    const logoUrl    = config.logoUrl        || "";
    const position   = config.position      || "bottom-right";

    const isLeft     = position === "bottom-left";
    const hPos       = isLeft ? "left: 24px;" : "right: 24px;";
    const avatarHtmlHeader = logoUrl
      ? `<img src="${logoUrl}" alt="bot" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
      : "🤖";

    // ── Host container (just a fixed anchor, no visible styles) ──
    const host = document.createElement("div");
    host.id    = "digichat-widget-host";
    host.style.cssText = "all:initial;position:fixed;bottom:0;right:0;z-index:2147483647;";
    document.body.appendChild(host);

    // ── Shadow Root — completely isolated from host page CSS ──
    shadow = host.attachShadow({ mode: "open" });

    // ── All widget CSS lives entirely inside shadow ──
    const css = `
      *, *::before, *::after {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'DM Sans', Roboto, sans-serif;
      }

      /* ── FAB Button ── */
      #cb-btn {
        position: fixed;
        bottom: 24px;
        ${hPos}
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: ${color};
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 20px ${color}60;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform .2s, box-shadow .2s;
        z-index: 99999;
        padding: 0;
      }
      #cb-btn:hover { transform: scale(1.08); box-shadow: 0 6px 28px ${color}80; }
      #cb-btn svg { width: 24px; height: 24px; fill: white; display: block; }

      /* ── Chat Window ── */
      #cb-window {
        position: fixed;
        bottom: 92px;
        ${hPos}
        width: 370px;
        height: 560px;
        background: ${bg};
        border-radius: 18px;
        border: 1px solid ${borderCol};
        box-shadow: 0 24px 64px rgba(0,0,0,0.22);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        z-index: 99998;
        opacity: 0;
        pointer-events: none;
        transform: translateY(14px) scale(0.97);
        transition: opacity .25s ease, transform .25s ease;
      }
      #cb-window.open {
        opacity: 1;
        pointer-events: all;
        transform: translateY(0) scale(1);
      }

      /* ── Header ── */
      #cb-header {
        background: ${color};
        padding: 14px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
      }
      #cb-header-left { display: flex; align-items: center; gap: 10px; }
      .cb-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(255,255,255,0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 17px;
        overflow: hidden;
        flex-shrink: 0;
      }
      #cb-bot-name { color: #fff; font-weight: 700; font-size: 14px; line-height: 1.3; }
      #cb-status   { color: rgba(255,255,255,0.75); font-size: 11px; margin-top: 2px; line-height: 1; }
      #cb-close {
        background: rgba(255,255,255,0.18);
        border: none;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        cursor: pointer;
        color: #fff;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
        flex-shrink: 0;
        transition: background .15s;
      }
      #cb-close:hover { background: rgba(255,255,255,0.3); }

      /* ── Messages ── */
      #cb-msgs {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        scroll-behavior: smooth;
      }
      #cb-msgs::-webkit-scrollbar { width: 3px; }
      #cb-msgs::-webkit-scrollbar-thumb { background: ${borderCol}; border-radius: 3px; }

      /* ── Message Row ── */
      .cb-msg {
        display: flex;
        align-items: flex-end;
        gap: 8px;
        width: 100%;
        min-width: 0;
      }
      .cb-msg.user { flex-direction: row-reverse; }

      @keyframes cb-fadein {
        from { opacity: 0; transform: translateY(6px); }
        to   { opacity: 1; transform: translateY(0);   }
      }
      .cb-msg { animation: cb-fadein .2s ease; }

      /* ── Bubble Avatar ── */
      .cb-bubble-avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: ${color}22;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        overflow: hidden;
        flex-shrink: 0;
        align-self: flex-end;
      }
      .cb-bubble-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }

      /* ── Message Content wrapper ── */
      .cb-msg-content {
        display: flex;
        flex-direction: column;
        min-width: 0;
        max-width: 76%;
        flex-shrink: 1;
      }
      .cb-msg.user .cb-msg-content { align-items: flex-end; }
      .cb-msg.bot  .cb-msg-content { align-items: flex-start; }

      /* ── Bubble ── */
      .cb-bubble {
        display: block;
        padding: 10px 14px;
        border-radius: 18px;
        font-size: 13.5px;
        line-height: 1.6;
        word-break: break-word;
        overflow-wrap: break-word;
        white-space: pre-wrap;
        max-width: 100%;
      }
      .cb-msg.bot .cb-bubble {
        background: ${msgBg};
        color: ${textColor};
        border: 1px solid ${borderCol};
        border-bottom-left-radius: 4px;
      }
      .cb-msg.user .cb-bubble {
        background: ${color};
        color: #ffffff;
        border-bottom-right-radius: 4px;
      }

      /* ── Timestamp ── */
      .cb-time {
        font-size: 10px;
        color: #94a3b8;
        margin-top: 4px;
        padding: 0 4px;
        white-space: nowrap;
      }

      /* ── Typing indicator ── */
      .cb-typing-row {
        display: flex;
        align-items: flex-end;
        gap: 8px;
        width: 100%;
        animation: cb-fadein .2s ease;
      }
      .cb-typing {
        display: flex;
        gap: 4px;
        align-items: center;
        padding: 12px 16px;
        background: ${msgBg};
        border: 1px solid ${borderCol};
        border-radius: 18px;
        border-bottom-left-radius: 4px;
      }
      .cb-typing span {
        width: 7px;
        height: 7px;
        background: #94a3b8;
        border-radius: 50%;
        animation: cb-bounce .9s infinite;
        display: block;
      }
      .cb-typing span:nth-child(2) { animation-delay: .15s; }
      .cb-typing span:nth-child(3) { animation-delay: .3s; }
      @keyframes cb-bounce {
        0%, 60%, 100% { transform: translateY(0);    }
        30%            { transform: translateY(-6px); }
      }

      /* ── Footer / Input area ── */
      #cb-footer {
        padding: 12px;
        border-top: 1px solid ${borderCol};
        display: flex;
        align-items: flex-end;
        gap: 8px;
        flex-shrink: 0;
        background: ${bg};
      }
      #cb-input {
        flex: 1;
        min-width: 0;
        background: ${msgBg};
        border: 1px solid ${borderCol};
        border-radius: 12px;
        padding: 9px 13px;
        font-size: 13.5px;
        color: ${textColor};
        outline: none;
        resize: none;
        max-height: 100px;
        line-height: 1.5;
        font-family: inherit;
        display: block;
      }
      #cb-input::placeholder { color: #94a3b8; }
      #cb-input:focus { border-color: ${color}88; }

      #cb-send {
        width: 40px;
        height: 40px;
        min-width: 40px;
        border-radius: 12px;
        background: ${color};
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: opacity .15s, transform .1s;
        padding: 0;
      }
      #cb-send:hover:not(:disabled) { transform: scale(1.05); }
      #cb-send:disabled { opacity: 0.45; cursor: not-allowed; }
      #cb-send svg { width: 17px; height: 17px; fill: white; display: block; }

      /* ── Responsive: narrow screens ── */
      @media (max-width: 420px) {
        #cb-window { width: calc(100vw - 16px); right: 8px !important; left: auto !important; bottom: 80px; height: 72vh; }
        #cb-btn    { right: 16px !important; left: auto !important; bottom: 16px; }
      }
    `;

    // ── Shadow DOM HTML ──
    shadow.innerHTML = `
      <style>${css}</style>

      <button id="cb-btn" aria-label="Open chat">
        <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
      </button>

      <div id="cb-window" role="dialog" aria-label="Chat window">

        <div id="cb-header">
          <div id="cb-header-left">
            <div class="cb-avatar">${avatarHtmlHeader}</div>
            <div>
              <div id="cb-bot-name">${botName}</div>
              <div id="cb-status">● Online</div>
            </div>
          </div>
          <button id="cb-close" aria-label="Close">✕</button>
        </div>

        <div id="cb-msgs"></div>

        <div id="cb-footer">
          <textarea id="cb-input" placeholder="${placeholder}" rows="1"></textarea>
          <button id="cb-send" aria-label="Send">
            <svg viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
          </button>
        </div>

      </div>
    `;

    return shadow;
  }

  // ── Helper: get element inside shadow ──
  function $  (id)  { return shadow.getElementById(id); }

  // ── Toggle open/close ──
  function toggleChat() {
    isOpen = !isOpen;
    const win = $("cb-window");
    const btn = $("cb-btn");
    win.classList.toggle("open", isOpen);
    btn.innerHTML = isOpen
      ? `<svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="white" stroke-width="2.5" stroke-linecap="round" fill="none"/></svg>`
      : `<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`;
    if (isOpen) $("cb-input").focus();
  }

  // ── Add a message bubble ──
  function addMessage(role, text) {
    const msgs    = $("cb-msgs");
    const logoUrl = config.logoUrl || "";
    const time    = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const avatarHtml = role === "bot"
      ? `<div class="cb-bubble-avatar">${logoUrl ? `<img src="${logoUrl}" alt="bot">` : "🤖"}</div>`
      : "";

    const div = document.createElement("div");
    div.className = `cb-msg ${role}`;
    div.innerHTML = `
      ${avatarHtml}
      <div class="cb-msg-content">
        <div class="cb-bubble">${escapeHtml(text)}</div>
        <div class="cb-time">${time}</div>
      </div>
    `;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  // ── Typing indicator ──
  function showTyping() {
    const msgs = $("cb-msgs");
    const logoUrl = config.logoUrl || "";
    const div  = document.createElement("div");
    div.className = "cb-typing-row";
    div.id        = "cb-typing";
    div.innerHTML = `
      <div class="cb-bubble-avatar">${logoUrl ? `<img src="${logoUrl}" alt="bot">` : "🤖"}</div>
      <div class="cb-typing"><span></span><span></span><span></span></div>
    `;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }
  function hideTyping() {
    const t = $("cb-typing");
    if (t) t.remove();
  }

  // ── XSS protection ──
  function escapeHtml(str) {
    return str
      .replace(/&/g,  "&amp;")
      .replace(/</g,  "&lt;")
      .replace(/>/g,  "&gt;")
      .replace(/"/g,  "&quot;")
      .replace(/'/g,  "&#039;");
  }

  // ── Send message ──
  async function sendMessage() {
    const input = $("cb-input");
    const text  = input.value.trim();
    if (!text || isTyping) return;

    input.value        = "";
    input.style.height = "auto";
    isTyping           = true;
    $("cb-send").disabled = true;

    addMessage("user", text);
    showTyping();
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
          history:   history.slice(-10),
        }),
      });
      const data = await res.json();
      hideTyping();

      if (data.success) {
        sessionId = data.sessionId;
        addMessage("bot", data.reply);
        history.push({ role: "model", text: data.reply });
        if (history.length > 20) history = history.slice(-20);
      } else {
        addMessage("bot", data.message || "Something went wrong. Please try again.");
      }
    } catch {
      hideTyping();
      addMessage("bot", "Connection issue. Please check your internet and try again.");
    }

    isTyping = false;
    $("cb-send").disabled = false;
    $("cb-input").focus();
  }

  // ── Visitor ID ──
  function getVisitorId() {
    let vid = localStorage.getItem("cb_visitor_id");
    if (!vid) {
      vid = "v_" + Math.random().toString(36).substr(2, 9) + Date.now();
      localStorage.setItem("cb_visitor_id", vid);
    }
    return vid;
  }

  // ── Attach events (all inside shadow) ──
  function attachEvents() {
    $("cb-btn").addEventListener("click", toggleChat);
    $("cb-close").addEventListener("click", toggleChat);
    $("cb-send").addEventListener("click", sendMessage);

    const input = $("cb-input");
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    input.addEventListener("input", () => {
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 100) + "px";
    });
  }

  // ── Init ──
  async function init() {
    await fetchConfig();
    buildWidget();
    attachEvents();
    addMessage("bot", config.welcomeMessage || "Hi! How can I help you today?");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();