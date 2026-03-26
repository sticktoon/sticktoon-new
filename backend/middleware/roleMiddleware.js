const User = require("../models/User");

/**
 * Helper to check if an email is a super admin
 */
const isSuperAdmin = (email) => {
  return email === process.env.ADMIN_EMAIL;
};

/**
 * Middleware: Restrict access to admin only
 */
const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only access required" });
  }
  next();
};

/**
 * Middleware: Restrict access to super admin only
 */
const superAdminOnly = (req, res, next) => {
  if (req.user.role !== "admin" || !isSuperAdmin(req.user.email)) {
    return res.status(403).json({ message: "Super admin access required" });
  }
  next();
};

/**
 * Middleware: Restrict access to influencers only
 */
const influencerOnly = (req, res, next) => {
  if (req.user.role !== "influencer") {
    return res.status(403).json({ message: "Influencer access only" });
  }
  next();
};

/**
 * Middleware: Restrict access to approved influencers only
 */
const approvedInfluencerOnly = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== "influencer") {
      return res.status(403).json({ message: "Influencer access only" });
    }
    if (!user.influencerProfile?.isApproved) {
      return res.status(403).json({ 
        message: "Your account is pending admin approval. You'll be able to access the dashboard once approved." 
      });
    }
    next();
  } catch (err) {
    console.error("RBAC Middleware Error:", err);
    res.status(500).json({ message: "Error verifying access permissions" });
  }
};

module.exports = {
  adminOnly,
  superAdminOnly,
  isSuperAdmin,
  influencerOnly,
  approvedInfluencerOnly
};
