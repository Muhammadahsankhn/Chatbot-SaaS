/**
 * ChatBase Widget
 * Drop this single script tag on any website:
 * <script src="https://your-server.com/widget.js" data-api-key="cb_live_xxx"></script>
 */

(function () {
  "use strict";

  //  Read config from the script tag
  const currentScript =
    document.currentScript ||
    (function () {
      const scripts = document.getElementsByTagName("script");
      return scripts[scripts.length - 1];
    })();

  const API_KEY = currentScript.getAttribute("data-api-key");
  const SERVER_URL =
    currentScript.getAttribute("data-server") || "http://localhost:3000";

  if (!API_KEY) {
    console.error("[ChatBase] No data-api-key found on script tag.");
    return;
  }

  // Generate session + visitor IDs
  function generateId(prefix) {
    return (
      prefix +
      "_" +
      Math.random().toString(36).substring(2, 10) +
      Date.now().toString(36)
    );
  }

  const SESSION_ID = generateId("sess");
  const VISITOR_ID =
    localStorage.getItem("cb_visitor_id") || generateId("visitor");
  localStorage.setItem("cb_visitor_id", VISITOR_ID);

  //  State 
  let isOpen = false;
  let isTyping = false;
  let messageHistory = [];
  let hasGreeted = false;

  //  Widget config (overridden by server response) 
  let config = {
    botName: "Assistant",
    welcomeMessage: "Hi! How can I help you today?",
    color: "#6366f1",
    position: "bottom-right",
    theme: "light",
  };

  // STYLES
  function injectStyles() {
    const style = document.createElement("style");
    style.innerHTML = `
      #cb-widget * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

      #cb-launcher {
        position: fixed;
        ${config.position.includes("right") ? "right: 24px;" : "left: 24px;"}
        bottom: 24px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: ${config.color};
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      #cb-launcher:hover { transform: scale(1.08); box-shadow: 0 6px 24px rgba(0,0,0,0.25); }
      #cb-launcher svg { width: 26px; height: 26px; fill: white; transition: opacity 0.2s; }

      #cb-unread-badge {
        position: absolute;
        top: -3px;
        right: -3px;
        width: 18px;
        height: 18px;
        background: #ef4444;
        border-radius: 50%;
        font-size: 11px;
        font-weight: 700;
        color: white;
        display: none;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
      }

      #cb-window {
        position: fixed;
        ${config.position.includes("right") ? "right: 24px;" : "left: 24px;"}
        bottom: 92px;
        width: 370px;
        height: 560px;
        background: ${config.theme === "dark" ? "#1e1e2e" : "#ffffff"};
        border-radius: 20px;
        box-shadow: 0 8px 40px rgba(0,0,0,0.18);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        z-index: 999998;
        opacity: 0;
        transform: translateY(20px) scale(0.97);
        pointer-events: none;
        transition: opacity 0.25s ease, transform 0.25s ease;
      }
      #cb-window.cb-open {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: all;
      }

      /* Header */
      #cb-header {
        background: ${config.color};
        padding: 16px 18px;
        display: flex;
        align-items: center;
        gap: 12px;
        flex-shrink: 0;
      }
      #cb-avatar {
        width: 38px; height: 38px;
        border-radius: 50%;
        background: rgba(255,255,255,0.25);
        display: flex; align-items: center; justify-content: center;
        font-size: 18px; flex-shrink: 0;
      }
      #cb-header-info { flex: 1; }
      #cb-bot-name { font-size: 15px; font-weight: 700; color: white; }
      #cb-status { font-size: 12px; color: rgba(255,255,255,0.8); display: flex; align-items: center; gap: 5px; }
      #cb-status-dot { width: 7px; height: 7px; border-radius: 50%; background: #4ade80; display: inline-block; }
      #cb-close-btn {
        background: none; border: none; cursor: pointer;
        color: rgba(255,255,255,0.8); font-size: 22px; line-height: 1;
        padding: 4px; border-radius: 6px; transition: background 0.15s;
      }
      #cb-close-btn:hover { background: rgba(255,255,255,0.15); color: white; }

      /* Messages */
      #cb-messages {
        flex: 1;
        overflow-y: auto;
        padding: 18px 14px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        background: ${config.theme === "dark" ? "#1e1e2e" : "#f8fafc"};
        scroll-behavior: smooth;
      }
      #cb-messages::-webkit-scrollbar { width: 4px; }
      #cb-messages::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 2px; }

      .cb-msg-row { display: flex; gap: 8px; align-items: flex-end; }
      .cb-msg-row.cb-user { flex-direction: row-reverse; }

      .cb-msg-avatar {
        width: 28px; height: 28px; border-radius: 50%;
        background: ${config.color}22;
        display: flex; align-items: center; justify-content: center;
        font-size: 13px; flex-shrink: 0;
      }

      .cb-bubble {
        max-width: 98%;
        padding: 10px 14px;
        border-radius: 18px;
        font-size: 14px;
        line-height: 1.55;
        word-break: break-word;
      }
      .cb-bot .cb-bubble {
        background: ${config.theme === "dark" ? "#2d2d3d" : "#ffffff"};
        color: ${config.theme === "dark" ? "#e2e8f0" : "#1e293b"};
        border-bottom-left-radius: 5px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.07);
      }
      .cb-user .cb-bubble {
        background: ${config.color};
        color: white;
        border-bottom-right-radius: 5px;
      }

      .cb-timestamp {
        font-size: 11px;
        color: ${config.theme === "dark" ? "#64748b" : "#94a3b8"};
        margin-top: 3px;
        padding: 0 6px;
      }
      .cb-user .cb-timestamp { text-align: right; }

      /* Typing indicator */
      #cb-typing {
        display: none;
        gap: 8px;
        align-items: flex-end;
      }
      .cb-typing-bubble {
        background: ${config.theme === "dark" ? "#2d2d3d" : "#ffffff"};
        border-radius: 18px;
        border-bottom-left-radius: 5px;
        padding: 12px 16px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.07);
        display: flex;
        gap: 5px;
        align-items: center;
      }
      .cb-dot {
        width: 7px; height: 7px;
        background: #94a3b8;
        border-radius: 50%;
        animation: cb-bounce 1.2s ease-in-out infinite;
      }
      .cb-dot:nth-child(2) { animation-delay: 0.2s; }
      .cb-dot:nth-child(3) { animation-delay: 0.4s; }
      @keyframes cb-bounce {
        0%, 60%, 100% { transform: translateY(0); }
        30% { transform: translateY(-6px); }
      }

      /* Input area */
      #cb-input-area {
        padding: 12px 14px;
        background: ${config.theme === "dark" ? "#1e1e2e" : "#ffffff"};
        border-top: 1px solid ${config.theme === "dark" ? "#2d2d3d" : "#e2e8f0"};
        display: flex;
        gap: 8px;
        align-items: flex-end;
        flex-shrink: 0;
      }
      #cb-input {
        flex: 1;
        border: 1.5px solid ${config.theme === "dark" ? "#3d3d5c" : "#e2e8f0"};
        border-radius: 12px;
        padding: 10px 14px;
        font-size: 14px;
        resize: none;
        outline: none;
        background: ${config.theme === "dark" ? "#2d2d3d" : "#f8fafc"};
        color: ${config.theme === "dark" ? "#e2e8f0" : "#1e293b"};
        max-height: 100px;
        line-height: 1.5;
        transition: border-color 0.15s;
      }
      #cb-input:focus { border-color: ${config.color}; }
      #cb-input::placeholder { color: #94a3b8; }

      #cb-send-btn {
        width: 40px; height: 40px;
        border-radius: 10px;
        background: ${config.color};
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: opacity 0.15s, transform 0.15s;
      }
      #cb-send-btn:hover { opacity: 0.9; transform: scale(1.05); }
      #cb-send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
      #cb-send-btn svg { width: 18px; height: 18px; fill: white; }

      /* Branding */
      #cb-branding {
        text-align: center;
        font-size: 11px;
        color: #94a3b8;
        padding: 6px;
        background: ${config.theme === "dark" ? "#1e1e2e" : "#ffffff"};
      }
      #cb-branding a { color: ${config.color}; text-decoration: none; }

      @media (max-width: 420px) {
        #cb-window { width: calc(100vw - 16px); right: 8px; left: 8px; bottom: 80px; height: 75vh; }
      }
    `;
    document.head.appendChild(style);
  }

  // BUILD HTML
  function buildWidget() {
    const wrapper = document.createElement("div");
    wrapper.id = "cb-widget";
    wrapper.innerHTML = `
      <!-- Launcher button -->
      <button id="cb-launcher" aria-label="Open chat">
        <svg id="cb-icon-chat" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
        <svg id="cb-icon-close" viewBox="0 0 24 24" style="display:none"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        <span id="cb-unread-badge"></span>
      </button>

      <!-- Chat window -->
      <div id="cb-window" role="dialog" aria-label="Chat with ${config.botName}">
        <!-- Header -->
        <div id="cb-header">
          <div id="cb-avatar">🤖</div>
          <div id="cb-header-info">
            <div id="cb-bot-name">${config.botName}</div>
            <div id="cb-status"><span id="cb-status-dot"></span> Online</div>
          </div>
          <button id="cb-close-btn" aria-label="Close chat">✕</button>
        </div>

        <!-- Messages -->
        <div id="cb-messages">
          <!-- Typing indicator -->
          <div id="cb-typing" class="cb-msg-row cb-bot">
            <div class="cb-msg-avatar">🤖</div>
            <div class="cb-typing-bubble">
              <div class="cb-dot"></div>
              <div class="cb-dot"></div>
              <div class="cb-dot"></div>
            </div>
          </div>
        </div>

        <!-- Input -->
        <div id="cb-input-area">
          <textarea
            id="cb-input"
            placeholder="Type a message..."
            rows="1"
            maxlength="1000"
            aria-label="Message input"
          ></textarea>
          <button id="cb-send-btn" aria-label="Send message">
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>

        <!-- Branding -->
        <div id="cb-branding">Powered by <a href="#" target="_blank">Digi ChatBot</a></div>
      </div>
    `;
    document.body.appendChild(wrapper);
  }

  // HELPERS
  function formatTime(date) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function scrollToBottom() {
    const messages = document.getElementById("cb-messages");
    if (messages) messages.scrollTop = messages.scrollHeight;
  }

  function showTyping() {
    const el = document.getElementById("cb-typing");
    if (el) {
      el.style.display = "flex";
      scrollToBottom();
    }
  }

  function hideTyping() {
    const el = document.getElementById("cb-typing");
    if (el) el.style.display = "none";
  }

  function showUnreadBadge() {
    const badge = document.getElementById("cb-unread-badge");
    if (badge && !isOpen) {
      badge.style.display = "flex";
      badge.textContent = "1";
    }
  }

  function clearUnreadBadge() {
    const badge = document.getElementById("cb-unread-badge");
    if (badge) badge.style.display = "none";
  }

  //  Add a message bubble to the chat 
  function addMessage(text, role) {
    const messages = document.getElementById("cb-messages");
    const typing = document.getElementById("cb-typing");
    if (!messages) return;

    const row = document.createElement("div");
    row.className = `cb-msg-row ${role === "user" ? "cb-user" : "cb-bot"}`;

    const avatar =
      role === "bot"
        ? `<div class="cb-msg-avatar">🤖</div>`
        : "";

    row.innerHTML = `
      ${avatar}
      <div>
        <div class="cb-bubble">${escapeHtml(text)}</div>
        <div class="cb-timestamp">${formatTime(new Date())}</div>
      </div>
    `;

    // Insert before typing indicator
    messages.insertBefore(row, typing);
    scrollToBottom();

    // Track history for multi-turn context
    messageHistory.push({
      role: role === "user" ? "user" : "model",
      text,
    });
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/\n/g, "<br>");
  }

  //  Auto-resize textarea as user types 
  function autoResizeTextarea(el) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 100) + "px";
  }

  // API CALLS
  async function sendMessage(text) {
    if (isTyping || !text.trim()) return;

    isTyping = true;
    const sendBtn = document.getElementById("cb-send-btn");
    if (sendBtn) sendBtn.disabled = true;

    addMessage(text, "user");
    showTyping();

    try {
      const response = await fetch(`${SERVER_URL}/api/v1/chat/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify({
          message: text.trim(),
          sessionId: SESSION_ID,
          visitorId: VISITOR_ID,
          page: window.location.href,
          history: messageHistory.slice(-10), // last 10 messages for context
        }),
      });

      const data = await response.json();
      hideTyping();

      if (data.success) {
        addMessage(data.reply, "bot");
      } else {
        addMessage(
          data.message || "Something went wrong. Please try again.",
          "bot"
        );
      }
    } catch (err) {
      hideTyping();
      addMessage("Unable to connect. Please check your connection.", "bot");
      console.error("[ChatBase] Error:", err);
    } finally {
      isTyping = false;
      if (sendBtn) sendBtn.disabled = false;
      const input = document.getElementById("cb-input");
      if (input) {
        input.focus();
        autoResizeTextarea(input);
      }
    }
  }

  // Show welcome message when chat opens
  function showWelcomeMessage() {
    if (hasGreeted) return;
    hasGreeted = true;
    setTimeout(() => {
      addMessage(config.welcomeMessage, "bot");
    }, 400);
  }

  // OPEN / CLOSE
  function openChat() {
    isOpen = true;
    const win = document.getElementById("cb-window");
    const iconChat = document.getElementById("cb-icon-chat");
    const iconClose = document.getElementById("cb-icon-close");
    if (win) win.classList.add("cb-open");
    if (iconChat) iconChat.style.display = "none";
    if (iconClose) iconClose.style.display = "block";
    clearUnreadBadge();
    showWelcomeMessage();
    setTimeout(() => {
      const input = document.getElementById("cb-input");
      if (input) input.focus();
    }, 300);
  }

  function closeChat() {
    isOpen = false;
    const win = document.getElementById("cb-window");
    const iconChat = document.getElementById("cb-icon-chat");
    const iconClose = document.getElementById("cb-icon-close");
    if (win) win.classList.remove("cb-open");
    if (iconChat) iconChat.style.display = "block";
    if (iconClose) iconClose.style.display = "none";
  }

  // EVENT LISTENERS
  function attachEvents() {
    // Toggle chat open/close
    const launcher = document.getElementById("cb-launcher");
    if (launcher) launcher.addEventListener("click", () => isOpen ? closeChat() : openChat());

    // Close button
    const closeBtn = document.getElementById("cb-close-btn");
    if (closeBtn) closeBtn.addEventListener("click", closeChat);

    // Send button
    const sendBtn = document.getElementById("cb-send-btn");
    if (sendBtn) {
      sendBtn.addEventListener("click", () => {
        const input = document.getElementById("cb-input");
        if (input && input.value.trim()) {
          const text = input.value.trim();
          input.value = "";
          autoResizeTextarea(input);
          sendMessage(text);
        }
      });
    }

    // Enter to send (Shift+Enter = new line)
    const input = document.getElementById("cb-input");
    if (input) {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          const text = input.value.trim();
          if (text) {
            input.value = "";
            autoResizeTextarea(input);
            sendMessage(text);
          }
        }
      });

      input.addEventListener("input", () => autoResizeTextarea(input));
    }

    // Close on outside click
    document.addEventListener("click", (e) => {
      const widget = document.getElementById("cb-widget");
      if (isOpen && widget && !widget.contains(e.target)) {
        closeChat();
      }
    });
  }

  // FETCH WIDGET CONFIG FROM SERVER
  async function fetchConfig() {
    try {
      const response = await fetch(
        `${SERVER_URL}/api/v1/chat/config?apiKey=${API_KEY}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config) {
          config = { ...config, ...data.config };
        }
      }
    } catch (e) {
      // Use default config if server unreachable
    }
  }

  // INIT
  async function init() {
    // Fetch owner's widget config (bot name, color etc.)
    await fetchConfig();

    // Build the widget
    injectStyles();
    buildWidget();
    attachEvents();

    // Show unread badge after 5 seconds to grab attention
    setTimeout(() => {
      if (!isOpen) showUnreadBadge();
    }, 5000);
  }

  // Wait for DOM to be ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();