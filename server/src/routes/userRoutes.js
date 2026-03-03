const express        = require("express");
const router         = express.Router();
const controller     = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");

// ── Public ──
router.post("/register", controller.registerUser);
router.post("/login",    controller.loginUser);

// ── Protected ──
router.get("/profile",             authMiddleware, controller.getProfile);
router.get("/api-key",             authMiddleware, controller.getApiKey);
router.post("/api-key/regenerate", authMiddleware, controller.regenerateApiKey);
router.get("/stats",               authMiddleware, controller.getDashboardStats);
router.get("/conversations",       authMiddleware, controller.getRecentConversations);
router.get("/widget-config",       authMiddleware, controller.getWidgetConfig);
router.put("/widget-config",       authMiddleware, controller.saveWidgetConfig);
router.get("/domains",             authMiddleware, controller.getDomains);
router.post("/domains",            authMiddleware, controller.addDomain);
router.delete("/domains",          authMiddleware, controller.removeDomain);

module.exports = router;