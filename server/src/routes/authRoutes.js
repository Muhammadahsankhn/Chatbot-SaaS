const express  = require("express");
const router   = express.Router();
const passport = require("../config/passport");
const { generateToken } = require("../utils/generateToken");

// Step 1 — redirect to Google
router.get("/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Step 2 — Google sends user back here
router.get("/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_URL}/digichat/login?error=google_failed`,
    session: false,
  }),
  (req, res) => {
    const token = generateToken(req.user);
    const user  = {
      id:       req.user._id,
      fullname: req.user.fullname,
      email:    req.user.email,
      plan:     req.user.plan || "starter",
    };

    const params = new URLSearchParams({
      token,
      user: JSON.stringify(user),
    });

    // ← /digichat/auth/callback because basename="/digichat"
    res.redirect(`${process.env.FRONTEND_URL}/digichat/auth/callback?${params}`);
  }
);

module.exports = router;