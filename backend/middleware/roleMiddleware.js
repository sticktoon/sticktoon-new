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

const isOrdersEmail = (email) => getOrdersEmails().includes(normalizeEmail(email));

/**
 * Helper to check if an email is a super admin (developer)
 */
const isSuperAdmin = (email) => getSuperAdminEmails().includes(normalizeEmail(email));

const isSuperAdminUser = (user) => {
  if (!user) return false;
  if (user.role === "superadmin") return true;
  return isSuperAdmin(user.email);
};

const isAdminAccount = (user) => {
  if (!user) return false;
  return user.role === "admin" || user.role === "superadmin" || isAdminEmail(user.email);
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
 * Admin panel sections an admin account can be granted access to.
 * The dashboard is intentionally absent - every admin can see it.
 *
 * Deliberately coarse: image upload rides on "products" and the Shiprocket
 * setting rides on "orders" because those APIs are called from inside those
 * screens. Splitting them out would let a grant look complete while the
 * screen it belongs to still half-fails.
 */
const ADMIN_PERMISSIONS = [
  "orders",
  "products",
  "users",
  "influencers",
  "promo",
  "revenue",
  "leads",
  "tasks",
  "support",
  "logs",
];

/**
 * Does this account hold a given section permission? Super admins hold all of
 * them. Read from the database rather than the token so a revoked permission
 * takes effect immediately, without waiting for a re-login.
 */
const hasPermission = async (reqUser, permission) => {
  if (!isAdminAccount(reqUser)) return false;
  if (isSuperAdminUser(reqUser)) return true;

  const account = await User.findById(reqUser.id).select("role email adminPermissions");
  if (!account) return false;

  if (account.role === "superadmin" || isSuperAdmin(account.email)) return true;

  return (account.adminPermissions || []).includes(permission);
};

/**
 * Middleware factory: require an admin to hold a specific section permission.
 */
const requirePermission = (permission) => async (req, res, next) => {
  try {
    if (await hasPermission(req.user, permission)) return next();

    return res.status(403).json({
      message: isAdminAccount(req.user)
        ? `Your admin account does not have access to ${permission}`
        : "Admin only access required",
    });
  } catch (err) {
    console.error("Permission check error:", err);
    return res.status(500).json({ message: "Error verifying access permissions" });
  }
};

/**
 * Middleware: Restrict access to super admin only
 */
const superAdminOnly = (req, res, next) => {
  if (!isSuperAdminUser(req.user)) {
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
  ADMIN_PERMISSIONS,
  hasPermission,
  requirePermission,
  adminOnly,
  superAdminOnly,
  isSuperAdmin,
  isSuperAdminUser,
  isAdminEmail,
  isOrdersEmail,
  isAdminAccount,
  influencerOnly,
  approvedInfluencerOnly
};
