const express    = require("express");
const router     = express.Router();
const controller = require("../controllers/userController");
const auth       = require("../middleware/authMiddleware");
const widgetController = require("../controllers/widgetController");




// ── Public ──
router.post("/register", controller.registerUser);
router.post("/login",    controller.loginUser);

// ── Protected ──
router.get("/profile",              auth, controller.getProfile);
router.put("/profile",              auth, controller.updateProfile);
router.put("/password",             auth, controller.changePassword);

router.get("/api-key",              auth, controller.getApiKey);
router.post("/api-key/regenerate",  auth, controller.regenerateApiKey);

router.get("/stats",                auth, controller.getDashboardStats);
router.get("/conversations",        auth, controller.getRecentConversations);
router.get("/weekly-activity",      auth, controller.getWeeklyActivity);      // ← NEW
router.get("/all-conversations",    auth, controller.getAllConversations);     // ← for ChatLogs
router.get("/analytics",            auth, controller.getAnalytics);           // ← for Analytics

router.get("/widget-config",        auth, controller.getWidgetConfig);
router.put("/widget-config",        auth, controller.saveWidgetConfig);

router.get("/domains",              auth, controller.getDomains);
router.post("/domains",             auth, controller.addDomain);
router.delete("/domains",           auth, controller.removeDomain);


// Public Widget Endpoints
router.get("/api/v1/chat/config", widgetController.getPublicConfig);
router.post("/api/v1/chat/message", widgetController.handleWidgetMessage);


module.exports = router;