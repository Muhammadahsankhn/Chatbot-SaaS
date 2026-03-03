const express = require("express");
const router = express.Router();
const {
  sendMessage,
  getWidgetConfig,
  serveWidget,
} = require("../controllers/chatController");

// Serve the embeddable widget.js file
// Website owners put: <script src="https://yourserver.com/widget.js" data-api-key="xxx">
router.get("/widget.js", serveWidget);

// Widget fetches owner's bot config on load (name, color, welcome message)
router.get("/config", getWidgetConfig);

// Main chat endpoint — widget POSTs visitor messages here
router.post("/message", sendMessage);

module.exports = router;