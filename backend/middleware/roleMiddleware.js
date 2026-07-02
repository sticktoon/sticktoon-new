const User = require("../models/User");

const normalizeEmail = (email) => {
  if (typeof email !== "string") return "";
  return email.toLowerCase().trim();
};

const parseEmailList = (value) => {
  if (!value) return [];
  return value
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
};

const getAdminAccessEmails = () => {
  const envValues = [
    process.env.DEV_EMAIL || "",
    process.env.ADMIN_EMAIL || "",
    process.env.ORDERS_EMAIL || "",
    process.env.ADMIN_ACCESS_EMAILS || "",
    process.env.ADMIN_EMAILS || "",
  ].join(",");

  return parseEmailList(envValues).map(normalizeEmail).filter((email, index, array) => array.indexOf(email) === index);
};

const getSuperAdminEmails = () => {
  const configured = process.env.DEV_EMAIL || process.env.SUPER_ADMIN_EMAILS || "";
  return parseEmailList(configured).map(normalizeEmail).filter((email, index, array) => array.indexOf(email) === index);
};

const getOrdersEmails = () => {
  const configured = process.env.ORDERS_EMAIL || "";
  return parseEmailList(configured).map(normalizeEmail).filter((email, index, array) => array.indexOf(email) === index);
};

/**
 * Helper to check if an email is allowed to access admin features
 */
const isAdminEmail = (email) => getAdminAccessEmails().includes(normalizeEmail(email));

/**
 * Helper to check if an email is a super admin (developer)
 */
const isSuperAdmin = (email) => getSuperAdminEmails().includes(normalizeEmail(email));

const isOrdersEmail = (email) => getOrdersEmails().includes(normalizeEmail(email));

const isAdminAccount = (user) => {
  if (!user) return false;
  return user.role === "admin" || isAdminEmail(user.email);
};

/**
 * Middleware: Restrict access to admin only
 */
const adminOnly = (req, res, next) => {
  if (!isAdminAccount(req.user)) {
    return res.status(403).json({ message: "Admin only access required" });
  }
  next();
};

/**
 * Middleware: Restrict access to super admin only
 */
const superAdminOnly = (req, res, next) => {
  if (!isAdminAccount(req.user) || !isSuperAdmin(req.user.email)) {
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
  isAdminEmail,
  isOrdersEmail,
  isAdminAccount,
  influencerOnly,
  approvedInfluencerOnly
};
