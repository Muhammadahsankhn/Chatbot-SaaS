const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    // 1. Check Authorization header — frontend sends "Bearer <token>"
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token   = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_KEY);
      // Support both old (userID) and new (id) token formats
      req.user = { id: decoded.id || decoded.userID };
      return next();
    }

    // 2. Fallback: check cookie
    const cookieToken = req.cookies?.token;
    if (cookieToken) {
      const decoded = jwt.verify(cookieToken, process.env.JWT_KEY);
      req.user = { id: decoded.id || decoded.userID };
      return next();
    }

    return res.status(401).json({ success: false, message: "No token provided." });
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
};