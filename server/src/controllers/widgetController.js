const userModel = require("../model/userModels");
const messageModel = require("../model/messageModel");
// Import your AI logic here later
// const { getGeminiResponse } = require("../utils/gemini"); 

// ── GET WIDGET CONFIG ──
// Called when the widget first loads on TechStore
module.exports.getPublicConfig = async (req, res) => {
  try {
    const { apiKey } = req.query;
    if (!apiKey) return res.status(400).json({ success: false, message: "API Key missing" });

    const user = await userModel.findOne({ generatedApiKey: apiKey });
    if (!user) return res.status(404).json({ success: false, message: "Invalid API Key" });

    // Return only public branding info
    return res.json({
      success: true,
      config: user.widgetConfig || {
        botName: "Assistant",
        welcomeMessage: "Hi! How can I help you?",
        color: "#6366f1",
        theme: "light"
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false });
  }
};

// ── HANDLE CHAT MESSAGE ──
// Called when a visitor types a message in the bubble
module.exports.handleWidgetMessage = async (req, res) => {
  try {
    const apiKey = req.headers["x-api-key"];
    const { message, sessionId, visitorId, page } = req.body;

    const user = await userModel.findOne({ generatedApiKey: apiKey });
    if (!user) return res.status(401).json({ success: false });

    // 1. Placeholder for Gemini AI 
    // For now, let's send a static reply to prove it works
    const aiReply = `Hello! I see you are visiting from ${page}. How can I help you with our tech products?`;

    // 2. Save/Update Conversation in Database
    // We use upsert so if the session exists, we update it; otherwise, we create it.
    await messageModel.findOneAndUpdate(
      { sessionId },
      {
        userId: user._id,
        visitorId,
        page,
        lastMessage: message,
        $inc: { messageCount: 1 },
        status: "active"
      },
      { upsert: true, new: true }
    );

    return res.json({ success: true, reply: aiReply });
  } catch (err) {
    console.error("Widget Error:", err);
    return res.status(500).json({ success: false });
  }
};