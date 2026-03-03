const express      = require("express");
const cors         = require("cors");
const cookieParser = require("cookie-parser");
const session      = require("express-session");
const passport     = require("./config/passport");
const path         = require("path");

const app = express();

const usersRouter = require("./routes/userRoutes");
const chatRoutes  = require("./routes/chatRoute");
const authRoutes  = require("./routes/authRoutes");

// ── CORS ──
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:5173", "http://localhost:3000"];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes("*")) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

// ── Core Middleware ──
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Session — needed for Passport Google OAuth handshake ──
app.use(session({
  secret:            process.env.SESSION_SECRET || "cb_session_secret",
  resave:            false,
  saveUninitialized: false,
  cookie:            { secure: false, maxAge: 5 * 60 * 1000 }, // 5 min only
}));

// ── Passport ──
app.use(passport.initialize());
app.use(passport.session());

// ── Serve widget.js ──
app.get("/widget.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.sendFile(path.join(__dirname, "..", "widget.js"));
});

// ── Routes ──
app.get("/", (req, res) => res.json({ status: "ok", message: "ChatBase API running" }));
app.use("/users",       usersRouter);
app.use("/api/v1/chat", chatRoutes);
app.use("/auth",        authRoutes);   // /auth/google  +  /auth/google/callback

module.exports = app;