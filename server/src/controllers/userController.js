const userModel         = require("../model/userModels");
const conversationModel = require("../model/messageModel");   // ← your actual file
const bcrypt            = require("bcrypt");
const { generateToken } = require("../utils/generateToken");
const { v4: uuidv4 }   = require("uuid");
const mongoose          = require("mongoose");

// ── Register ──
module.exports.registerUser = async (req, res) => {
  try {
    const { fullname, email, password } = req.body;

    if (!fullname || !email || !password)
      return res.status(400).json({ success: false, message: "All fields are required." });

    const existing = await userModel.findOne({ email });
    if (existing)
      return res.status(400).json({ success: false, message: "Email already registered." });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const newUser = await userModel.create({ fullname, email, password: hash });

    const token = generateToken(newUser);
    res.cookie("token", token, { httpOnly: true, sameSite: "lax", secure: false });

    return res.status(201).json({
      success: true,
      message: "Account created successfully!",
      token,                              // ← frontend saves to localStorage
      user: {
        id:       newUser._id,
        fullname: newUser.fullname,
        email:    newUser.email,
        plan:     newUser.plan || "starter",
      }
    });
  } catch (err) {
    console.error("Register error:", err.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ── Login ──
module.exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email and password required." });

    const user = await userModel.findOne({ email });
    if (!user)
      return res.status(401).json({ success: false, message: "Email or password incorrect." });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ success: false, message: "Email or password incorrect." });

    const token = generateToken(user);
    res.cookie("token", token, { httpOnly: true, sameSite: "lax", secure: false });

    return res.status(200).json({
      success: true,
      token,                              // ← was missing before, now saves to localStorage
      user: {
        id:       user._id,
        fullname: user.fullname,
        email:    user.email,
        plan:     user.plan || "starter",
      }
    });
  } catch (err) {
    console.error("Login error:", err.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ── Get Profile ──
module.exports.getProfile = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id).select("-password");
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get API Key ──
module.exports.getApiKey = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id).select("generatedApiKey");
    return res.json({ success: true, apiKey: user.generatedApiKey });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Regenerate API Key ──
module.exports.regenerateApiKey = async (req, res) => {
  try {
    const newKey = uuidv4();
    await userModel.findByIdAndUpdate(req.user.id, { generatedApiKey: newKey });
    return res.json({ success: true, apiKey: newKey });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Dashboard Stats ──
module.exports.getDashboardStats = async (req, res) => {
  try {
    const user = await userModel
      .findById(req.user.id)
      .select("plan messageCount usageLimit");

    const userId = new mongoose.Types.ObjectId(req.user.id);

    // Total conversations this user's widget has had
    const totalConversations = await conversationModel.countDocuments({ userId });

    // Total messages across all conversations
    const agg = await conversationModel.aggregate([
      { $match: { userId } },
      { $group: { _id: null, total: { $sum: "$messageCount" } } }
    ]);
    const totalMessages = agg[0]?.total || 0;

    // Conversations started today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const activeToday = await conversationModel.countDocuments({
      userId,
      createdAt: { $gte: todayStart }
    });

    return res.json({
      success: true,
      stats: {
        totalConversations,
        totalMessages,
        activeToday,
        messageCount: user.messageCount || 0,
        usageLimit:   user.usageLimit   || 100,
        plan:         user.plan         || "starter",
      }
    });
  } catch (err) {
    console.error("Stats error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Recent Conversations ──
module.exports.getRecentConversations = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const conversations = await conversationModel
      .find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("sessionId page messageCount status createdAt visitorId");

    return res.json({ success: true, conversations });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Widget Config ──
module.exports.getWidgetConfig = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id).select("widgetConfig");
    return res.json({ success: true, config: user.widgetConfig || {} });
  } catch (err) {
    return res.status(500).json({ success: false });
  }
};

module.exports.saveWidgetConfig = async (req, res) => {
  try {
    await userModel.findByIdAndUpdate(req.user.id, { widgetConfig: req.body });
    return res.json({ success: true, message: "Widget config saved." });
  } catch (err) {
    return res.status(500).json({ success: false });
  }
};

// ── Domains ──
module.exports.getDomains = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id).select("domains");
    return res.json({ success: true, domains: user.domains || [] });
  } catch (err) {
    return res.status(500).json({ success: false });
  }
};

module.exports.addDomain = async (req, res) => {
  try {
    const { domain } = req.body;
    if (!domain)
      return res.status(400).json({ success: false, message: "Domain required." });
    await userModel.findByIdAndUpdate(req.user.id, { $addToSet: { domains: domain } });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false });
  }
};

module.exports.removeDomain = async (req, res) => {
  try {
    const { domain } = req.body;
    await userModel.findByIdAndUpdate(req.user.id, { $pull: { domains: domain } });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false });
  }
};



// ── Update Profile ──
module.exports.updateProfile = async (req, res) => {
  try {
    const { fullname } = req.body;
    await userModel.findByIdAndUpdate(req.user.id, { fullname });
    return res.json({ success: true, message: "Profile updated." });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Change Password ──
module.exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user  = await userModel.findById(req.user.id);
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(400).json({ success: false, message: "Current password incorrect." });
    const hash = await bcrypt.hash(newPassword, 10);
    await userModel.findByIdAndUpdate(req.user.id, { password: hash });
    return res.json({ success: true, message: "Password changed." });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get All Conversations (ChatLogs) ──
module.exports.getAllConversations = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const query  = { userId };
    if (search) query.visitorId = { $regex: search, $options: "i" };
    const total = await conversationModel.countDocuments(query);
    const conversations = await conversationModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select("sessionId visitorId page messageCount status createdAt");
    return res.json({ success: true, conversations, total, page: parseInt(page) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Analytics ──
module.exports.getAnalytics = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const totalConversations = await conversationModel.countDocuments({ userId });
    const agg = await conversationModel.aggregate([
      { $match: { userId } },
      { $group: { _id: null, totalMessages: { $sum: "$messageCount" } } }
    ]);
    const totalMessages = agg[0]?.totalMessages || 0;
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const activeToday = await conversationModel.countDocuments({ userId, createdAt: { $gte: todayStart } });
    return res.json({ success: true, analytics: { totalConversations, totalMessages, activeToday } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};




// ── Weekly Activity ──
module.exports.getWeeklyActivity = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const now    = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    const results = await conversationModel.aggregate([
      { $match: { userId, createdAt: { $gte: monday } } },
      { $group: { _id: { $dayOfWeek: "$createdAt" }, count: { $sum: 1 } } }
    ]);

    const data = [0, 0, 0, 0, 0, 0, 0]; // Mon–Sun
    results.forEach(r => {
      const idx = r._id === 1 ? 6 : r._id - 2;
      if (idx >= 0 && idx < 7) data[idx] = r.count;
    });

    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};