const jwt = require("jsonwebtoken");

const generateToken = (user) => {
  return jwt.sign(
    {
      id:     user._id,     // ← authMiddleware reads req.user.id
      userID: user._id,     // ← keep for backward compatibility
      email:  user.email,
    },
    process.env.JWT_KEY,
    { expiresIn: "7d" }
  );
};

module.exports.generateToken = generateToken;