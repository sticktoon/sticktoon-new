const jwt = require("jsonwebtoken");

/**
 * Optional authentication middleware.
 * If a valid Bearer token is provided in the Authorization header,
 * decodes and attaches the user session to req.user.
 * If no token is provided or the token is invalid/expired, continues
 * as guest with req.user undefined.
 */
module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const secret = process.env.JWT_SECRET;
      if (secret) {
        const decoded = jwt.verify(token, secret);
        req.user = {
          id: decoded.id || decoded._id,
          _id: decoded.id || decoded._id,
          role: decoded.role,
          email: decoded.email,
        };
      }
    } catch (err) {
      // Token invalid or expired; proceed as guest
      req.user = null;
    }
  }

  next();
};
