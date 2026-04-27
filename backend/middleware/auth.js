const jwt = require("jsonwebtoken");

const getJwtInvalidBefore = () => {
  const raw = process.env.JWT_INVALID_BEFORE;
  if (!raw) return 0;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;

  return Math.floor(parsed);
};

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("CRITICAL: JWT_SECRET not set in environment");
      return res.status(500).json({ message: "Server configuration error" });
    }
    
    const decoded = jwt.verify(token, secret);
    const invalidBefore = getJwtInvalidBefore();

    if (invalidBefore > 0) {
      const issuedAt = Number(decoded.iat || 0);
      if (!issuedAt || issuedAt < invalidBefore) {
        return res
          .status(401)
          .json({ message: "Session expired. Please login again" });
      }
    }

    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email,
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
