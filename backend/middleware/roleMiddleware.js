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

const getSuperAdminEmails = () => {
  const envValues = [
    process.env.DEV_EMAIL || "",
    process.env.SUPER_ADMIN_EMAILS || "",
    process.env.SUPER_ADMIN_EMAIL || "",
    process.env.VITE_DEV_EMAIL || "",
    process.env.VITE_SUPER_ADMIN_EMAILS || "",
    process.env.VITE_SUPER_ADMIN_EMAIL || "",
    "anishpatankar974@gmail.com",
  ].join(",");

  return parseEmailList(envValues).map(normalizeEmail).filter((email, index, array) => array.indexOf(email) === index);
};

const getAdminAccessEmails = () => {
  const envValues = [
    process.env.DEV_EMAIL || "",
    process.env.ADMIN_EMAIL || "",
    process.env.ORDERS_EMAIL || "",
    process.env.ADMIN_ACCESS_EMAILS || "",
    process.env.ADMIN_EMAILS || "",
    process.env.SUPER_ADMIN_EMAILS || "",
    process.env.SUPER_ADMIN_EMAIL || "",
    getSuperAdminEmails().join(","),
  ].join(",");

  return parseEmailList(envValues).map(normalizeEmail).filter((email, index, array) => array.indexOf(email) === index);
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
 * Async helper to definitively check if a request user is super admin,
 * with database fallback if the JWT token lacks email or fresh role.
 */
const checkIsSuperAdmin = async (reqUser) => {
  if (!reqUser) return false;
  if (reqUser.role === "superadmin") return true;
  if (reqUser.email && isSuperAdmin(reqUser.email)) return true;

  const userId = reqUser.id || reqUser._id;
  if (userId) {
    try {
      const dbUser = await User.findById(userId).select("role email");
      if (dbUser) {
        if (dbUser.role === "superadmin" || isSuperAdmin(dbUser.email)) {
          if (dbUser.role !== "superadmin") {
            dbUser.role = "superadmin";
            await dbUser.save();
          }
          reqUser.role = "superadmin";
          reqUser.email = dbUser.email;
          return true;
        }
      }
    } catch (err) {
      console.error("checkIsSuperAdmin database lookup error:", err);
    }
  }

  return false;
};

/**
 * Middleware: Restrict access to admin only
 */
const adminOnly = async (req, res, next) => {
  if (isAdminAccount(req.user)) {
    return next();
  }

  const userId = req.user?.id || req.user?._id;
  if (userId) {
    try {
      const dbUser = await User.findById(userId).select("role email");
      if (dbUser && isAdminAccount(dbUser)) {
        req.user.role = dbUser.role;
        req.user.email = dbUser.email;
        return next();
      }
    } catch (err) {
      console.error("adminOnly database lookup error:", err);
    }
  }

  return res.status(403).json({ message: "Admin only access required" });
};

/**
 * Admin panel sections an admin account can be granted access to.
 * The dashboard is intentionally absent - every admin can see it.
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
  if (await checkIsSuperAdmin(reqUser)) return true;

  const userId = reqUser?.id || reqUser?._id;
  if (!userId) return false;

  const account = await User.findById(userId).select("role email adminPermissions");
  if (!account) return false;

  if (account.role === "superadmin" || isSuperAdmin(account.email)) return true;
  if (!isAdminAccount(account)) return false;

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
const superAdminOnly = async (req, res, next) => {
  if (await checkIsSuperAdmin(req.user)) {
    return next();
  }
  return res.status(403).json({ message: "Super admin access required" });
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
  checkIsSuperAdmin,
  isSuperAdmin,
  isSuperAdminUser,
  isAdminEmail,
  isOrdersEmail,
  isAdminAccount,
  influencerOnly,
  approvedInfluencerOnly
};
