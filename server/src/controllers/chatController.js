const axios = require("axios");
const path = require("path");
const fs = require("fs");
const userModel = require("../model/userModels");
const conversationModel = require("../model/messageModel");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY;

// ── Plan message limits ──
const PLAN_LIMITS = {
  starter: 5000,
  pro: 20000,
  enterprise: Infinity,
};

// ── Reset billing cycle if 30 days have passed ──
async function checkAndResetBillingCycle(user) {
  const now = new Date();
  const cycleStart = new Date(user.billingCycleStart);
  const daysSinceCycle = (now - cycleStart) / (1000 * 60 * 60 * 24);
  if (daysSinceCycle >= 30) {
    user.messageCount = 0;
    user.billingCycleStart = now;
    await user.save();
  }
}

// ══════════════════════════════════════════════
// GET /api/v1/chat/config?apiKey=xxx
// Widget calls this on load to get bot name, color etc.
// ══════════════════════════════════════════════
module.exports.getWidgetConfig = async (req, res) => {
  try {
    const apiKey = req.query.apiKey;
    if (!apiKey) return res.status(400).json({ success: false });

    const user = await userModel
      .findOne({ generatedApiKey: apiKey })
      .select("widgetConfig domains");

    if (!user) return res.status(404).json({ success: false });

    return res.status(200).json({
      success: true,
      config: user.widgetConfig || {
        botName: "Assistant",
        welcomeMessage: "Hi! How can I help you today?",
        color: "#6366f1",
        position: "bottom-right",
        theme: "light",
      },
    });
  } catch (err) {
    console.error("getWidgetConfig error:", err.message);
    return res.status(500).json({ success: false });
  }
};

// ══════════════════════════════════════════════
// GET /widget.js
// Serves the embeddable widget file
// ══════════════════════════════════════════════
module.exports.serveWidget = (req, res) => {
  const widgetPath = path.join(__dirname, "..", "..", "widget.js");
  if (!fs.existsSync(widgetPath)) {
    return res.status(404).send("Widget file not found");
  }
  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.sendFile(widgetPath);
};

// ══════════════════════════════════════════════
// POST /api/v1/chat/message
// Main chat endpoint — widget sends messages here
// ══════════════════════════════════════════════
module.exports.sendMessage = async (req, res) => {
  try {
    const { message, sessionId, visitorId, page, history } = req.body;
    const apiKey = req.headers["x-api-key"];

    // 1. Validate API key
    if (!apiKey)
      return res.status(401).json({ success: false, message: "API key required" });

    const user = await userModel.findOne({ generatedApiKey: apiKey });
    if (!user)
      return res.status(401).json({ success: false, message: "Invalid API key" });

    // 2. Check domain allowlist
    const origin = req.headers.origin || req.headers.referer || "";
    if (user.domains && user.domains.length > 0) {
      const allowed = user.domains.some((d) => origin.includes(d));
      if (!allowed)
        return res.status(403).json({ success: false, message: "Domain not authorized" });
    }

    // 3. Reset billing cycle if needed
    await checkAndResetBillingCycle(user);

    // 4. Check plan limit
    const limit = PLAN_LIMITS[user.plan] ?? PLAN_LIMITS.starter;
    if (user.messageCount >= limit)
      return res.status(429).json({
        success: false,
        message: `Monthly limit of ${limit} messages reached. Please upgrade your plan.`,
      });

    // 5. Validate message
    if (!message || !message.trim())
      return res.status(400).json({ success: false, message: "Message is empty" });

    if (message.length > 1000)
      return res.status(400).json({ success: false, message: "Message too long" });

    // 6. Call Python AI service
    const aiResponse = await axios.post(
      `${AI_SERVICE_URL}/chat/message-with-history`,
      {
        message: message.trim(),
        sessionId: sessionId || `sess_${Date.now()}`,
        userId: user._id.toString(),
        history: history || [],
        botConfig: user.widgetConfig || {},
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-internal-service-key": INTERNAL_SERVICE_KEY,
        },
        timeout: 15000,
      }
    );

    const aiData = aiResponse.data;
    if (!aiData.success)
      return res.status(500).json({ success: false, message: "AI service error" });

    // 7. Save / update conversation in MongoDB
    await saveConversation({
      userId: user._id,
      sessionId: aiData.sessionId || sessionId,
      visitorId: visitorId || "anonymous",
      page: page || origin,
      userMessage: message.trim(),
      botReply: aiData.reply,
      tokensUsed: aiData.tokensUsed || 0,
    });

    // 8. Increment message counter
    user.messageCount = (user.messageCount || 0) + 1;
    await user.save();

    // 9. Return reply to widget
    return res.status(200).json({
      success: true,
      reply: aiData.reply,
      sessionId: aiData.sessionId || sessionId,
    });
  } catch (err) {
    if (err.code === "ECONNREFUSED") {
      return res.status(503).json({
        success: false,
        message: "AI service unavailable. Please try again.",
      });
    }
    console.error("sendMessage error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── Helper: upsert conversation document ──
async function saveConversation({ userId, sessionId, visitorId, page, userMessage, botReply, tokensUsed }) {
  try {
    let convo = await conversationModel.findOne({ sessionId });

    if (!convo) {
      // First message — create new conversation
      convo = await conversationModel.create({
        userId,
        sessionId,
        visitorId,
        page,
        messages: [
          { role: "user", text: userMessage },
          { role: "bot",  text: botReply },
        ],
        messageCount: 2,
        totalTokensUsed: tokensUsed,
        status: "active",
      });
    } else {
      // Existing session — append messages
      convo.messages.push({ role: "user", text: userMessage });
      convo.messages.push({ role: "bot",  text: botReply });
      convo.messageCount += 2;
      convo.totalTokensUsed += tokensUsed;
      await convo.save();
    }
  } catch (err) {
    console.error("saveConversation error:", err.message);
  }
}