const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const userSchema = mongoose.Schema({
  fullname: {
    type: String,
    minLength: 3,
    trim: true
  },
  email: { type: String, unique: true },
  password: String,

  generatedApiKey: {
    type: String,
    unique: true,
    default: () => uuidv4()
  },

  // Plan & usage
  plan: { type: String, default: "starter" },
  messageCount: { type: Number, default: 0 },
  usageLimit: { type: Number, default: 100 },
  billingCycleStart: { type: Date, default: Date.now },

  // Widget customization
  widgetConfig: { type: mongoose.Schema.Types.Mixed, default: {} },

  // Allowed domains
  domains: { type: [String], default: [] },

}, { timestamps: true });

module.exports = mongoose.model("user", userSchema);