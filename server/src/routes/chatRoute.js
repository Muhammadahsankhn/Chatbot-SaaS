const express = require("express");
const router  = express.Router();
const {
  sendMessage,
  getWidgetConfig,
  serveWidget,
} = require("../controllers/chatController");
const auth    = require("../middleware/authMiddleware");
const conversationModel = require("../model/messageModel");

// ── Existing routes ──
router.get("/widget.js", serveWidget);
router.get("/config",    getWidgetConfig);
router.post("/message",  sendMessage);

// ── NEW: Get messages for a session (used by ChatLogs panel) ──
router.get("/session/:sessionId", auth, async (req, res) => {
  try {
    const conversation = await conversationModel.findOne({
      sessionId: req.params.sessionId,
      userId: req.user.id,
    });
    if (!conversation) return res.status(404).json({ success: false });

    // ✅ Your model uses `text` field — normalize to `content` for frontend
    const messages = (conversation.messages || []).map(m => ({
      role:    m.role,
      content: m.text,   // ← map text → content
    }));

    return res.json({ success: true, messages });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});


module.exports = router;