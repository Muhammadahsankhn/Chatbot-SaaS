const passport       = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const userModel      = require("../model/userModels");
const { v4: uuidv4 } = require("uuid");

passport.use(
  new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email    = profile.emails[0].value;
        const fullname = profile.displayName;

        // Check if user already exists
        let user = await userModel.findOne({ email });

        if (user) {
          // Already registered — just log in
          return done(null, user);
        }

        // New user — create account (no password needed for Google users)
        user = await userModel.create({
          fullname,
          email,
          password:   "google_oauth_" + uuidv4(), // placeholder, never used
          googleId:   profile.id,
          profilepic: profile.photos?.[0]?.value || "",
        });

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user._id));

passport.deserializeUser(async (id, done) => {
  try {
    const user = await userModel.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;