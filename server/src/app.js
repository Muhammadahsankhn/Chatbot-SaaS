const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const passport = require("./config/passport");
const path = require("path");

const app = express();

const usersRouter = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoute");
const authRoutes = require("./routes/authRoutes");

// ── CORS ──
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
  : ["http://192.168.1.142:5173", "http://192.168.1.142:3000", "http://localhost:5173"]; // Added localhost for safety

  
// app.use((req, res, next) => {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
//   res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key, x-internal-service-key");
//   if (req.method === "OPTIONS") {
//     return res.sendStatus(204);
//   }
//   next();
// });

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const isAllowed =
      allowedOrigins.includes(origin) ||
      /^http:\/\/(192\.168|10\.0|10\.1)\.\d+\.\d+(:\d+)?$/.test(origin) ||
      /^http:\/\/localhost(:\d+)?$/.test(origin) ||
      /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) ||   // ← ADD THIS LINE
      origin.includes("digicareproducts.com");
    if (isAllowed) callback(null, true);
    else callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key", "x-internal-service-key"],
  optionsSuccessStatus: 204,
}));

// ← DELETE the app.options("*", cors()) line

// ── Handle preflight for ALL routes (important for widget POST requests) ──

// ── Core Middleware ──
app.use(express.json({ limit: "10mb" }));   // 10mb for base64 logo uploads
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Session — needed for Passport Google OAuth handshake only ──
app.use(session({
  secret: process.env.SESSION_SECRET || "cb_session_secret",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 5 * 60 * 1000 }, // 5 min
}));

// ── Passport ──
app.use(passport.initialize());
app.use(passport.session());

// ── Serve widget.js ──
app.get("/widget.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Cache-Control", "no-cache");          // no-cache so config changes reflect immediately
  // res.setHeader("Access-Control-Allow-Origin", "*");   // widget.js must be loadable from ANY site
  res.sendFile(path.join(__dirname, "..", "widget.js"));
});

// ── Routes ──
app.get("/", (req, res) => res.json({ status: "ok", message: "Digichat API running" }));
app.use("/users", usersRouter);
app.use("/api/v1/chat", chatRoutes);
app.use("/auth", authRoutes);

module.exports = app;