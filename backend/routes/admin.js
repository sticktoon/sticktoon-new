const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Order = require("../models/Order");
const UserOrders = require("../models/User_Orders");

const router = express.Router();

const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const handleValidationError = require("../utils/handleValidationError");
const auth = require("../middleware/auth");
const { adminOnly, superAdminOnly, requirePermission, hasPermission, ADMIN_PERMISSIONS, checkIsSuperAdmin, isSuperAdmin, isAdminEmail, isOrdersEmail, isAdminAccount } = require("../middleware/roleMiddleware");
const { logActivity } = require("../utils/activityLogger");
const {
  newLoginCode,
  codeMatches,
  maskEmail,
  loginCodeEmail,
  RESEND_AFTER_MS,
  MAX_ATTEMPTS,
} = require("../utils/loginCode");
const { adminPasswordError, passwordErrorForRole, passwordExpired } = require("../utils/passwordPolicy");
const { verifyGoogleAccessToken, GoogleSignInError } = require("../utils/googleIdentity");

/* ======================
   ADMIN SIGN-IN STEPS
   1. Password, or Google (verified with Google on the server).
   2. Password sign-in only: replace the password if it's weak or over a year old.
   3. 2-step verification code, emailed to the admin.
   Only step 3 issues an admin token. It carries `mfa: true`, which
   roleMiddleware requires on every admin route.
====================== */
const CHALLENGE_TTL = "10m";

const SIGN_IN_TIMED_OUT = { message: "Your sign-in timed out. Please sign in again." };

const signChallenge = (user, stage, via) =>
  jwt.sign(
    { id: user._id, purpose: "admin_signin", stage, via, jti: crypto.randomUUID() },
    process.env.JWT_SECRET,
    { expiresIn: CHALLENGE_TTL }
  );

const readChallenge = (token, stage) => {
  try {
    const data = jwt.verify(String(token || ""), process.env.JWT_SECRET);
    return data.purpose === "admin_signin" && data.stage === stage ? data : null;
  } catch {
    return null;
  }
};

// The email goes out before the code is saved: if sending fails, nothing is
// stored, so the admin can try again at once instead of waiting out the resend
// cooldown for a code that never arrived.
const sendAdminLoginCode = async (user, via) => {
  const { code, hash, expiresAt } = newLoginCode(process.env.JWT_SECRET);

  const sent = await sendEmail({
    to: user.email,
    subject: "Your StickToon admin sign-in code",
    html: loginCodeEmail(code),
  });
  if (!sent?.ok) {
    throw new Error(typeof sent?.error === "string" ? sent.error : "the email service rejected it");
  }

  user.loginCode = {
    hash,
    expiresAt,
    sentAt: new Date(),
    attempts: 0,
  };
  await user.save();

  return {
    step: "verify_email_code",
    challengeToken: signChallenge(user, "2fa", via),
    email: maskEmail(user.email),
  };
};

// A code that never left must not look like one that did.
const respondWithCode = async (res, user, via) => {
  try {
    res.json(await sendAdminLoginCode(user, via));
  } catch (err) {
    console.error("Admin sign-in code failed:", err.message);
    res.status(502).json({ message: "Couldn't email your sign-in code. Please try again in a minute." });
  }
};

const adminUserJson = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  role: user.role,
  adminPermissions: user.role === "superadmin" ? ADMIN_PERMISSIONS : user.adminPermissions || [],
});

/* ======================
   ADMIN LOGIN
====================== */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail }).select("+password");

    // Rejected admin-panel attempts are a security signal worth keeping.
    const logFailure = (reason) =>
      logActivity({
        req,
        actor: { email: cleanEmail, role: "guest" },
        action: "auth.admin_login",
        category: "auth",
        status: "failure",
        message: `Failed admin login for ${cleanEmail}`,
        meta: { reason },
      });

    if (!user) {
      await logFailure("no_such_user");
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (user.role !== "admin" && user.role !== "superadmin" && !isAdminEmail(user.email)) {
      await logFailure("not_an_admin");
      return res.status(403).json({ message: "Access denied. This account is not an admin account." });
    }

    if (isSuperAdmin(user.email)) {
      if (user.role !== "superadmin") {
        user.role = "superadmin";
        await user.save();
      }
    } else if (user.role !== "admin" && user.role !== "superadmin") {
      user.role = "admin";
      await user.save();
    }

    // If no password set (Google account), ask to reset password
    if (!user.password) {
      await logFailure("no_password_set");
      return res.status(400).json({
        message: "No password set for this admin account. Please reset your password first."
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      await logFailure("wrong_password");
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Password is right. Still needed: a strong, current password, then the 2-step code.
    const weak = adminPasswordError(password, user.email);
    if (weak || passwordExpired(user.passwordChangedAt)) {
      return res.json({
        step: "change_password",
        reason: weak ? "weak" : "expired",
        challengeToken: signChallenge(user, "password", "credentials"),
      });
    }

    await respondWithCode(res, user, "credentials");
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ message: "Login failed" });
  }
});

/* ======================
   SIGN-IN: REPLACE WEAK / EXPIRED PASSWORD
====================== */
router.post("/login/change-password", async (req, res) => {
  const challenge = readChallenge(req.body?.challengeToken, "password");
  if (!challenge) return res.status(401).json(SIGN_IN_TIMED_OUT);

  try {
    const user = await User.findById(challenge.id).select("+password");
    if (!user || !isAdminAccount(user)) return res.status(401).json(SIGN_IN_TIMED_OUT);

    const { newPassword } = req.body;
    const problem = adminPasswordError(newPassword, user.email);
    if (problem) return res.status(400).json({ message: problem });
    if (user.password && (await bcrypt.compare(newPassword, user.password))) {
      return res.status(400).json({ message: "Choose a password you haven't used here before" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordChangedAt = new Date();
    await user.save();

    logActivity({
      req,
      actor: { id: user._id, name: user.name, email: user.email, role: user.role },
      action: "auth.password_change",
      category: "auth",
      message: `${user.email} set a new admin password while signing in`,
    });

    await respondWithCode(res, user, challenge.via);
  } catch (err) {
    if (handleValidationError(res, err)) return;
    console.error("Sign-in password change error:", err);
    res.status(500).json({ message: "Failed to save the new password" });
  }
});

/* ======================
   SIGN-IN: RESEND EMAIL CODE
====================== */
router.post("/login/email-code/resend", async (req, res) => {
  const challenge = readChallenge(req.body?.challengeToken, "2fa");
  if (!challenge) return res.status(401).json(SIGN_IN_TIMED_OUT);

  try {
    const user = await User.findById(challenge.id).select(
      "+loginCode.hash +loginCode.expiresAt +loginCode.sentAt +loginCode.attempts"
    );
    if (!user || !isAdminAccount(user)) return res.status(401).json(SIGN_IN_TIMED_OUT);

    const sentAt = user.loginCode?.sentAt ? new Date(user.loginCode.sentAt).getTime() : 0;
    const elapsed = Date.now() - sentAt;
    if (elapsed < RESEND_AFTER_MS) {
      const retryAfter = Math.ceil((RESEND_AFTER_MS - elapsed) / 1000);
      return res.status(429).json({
        message: `Please wait ${retryAfter}s before requesting a new code`,
        retryAfter,
      });
    }

    await respondWithCode(res, user, challenge.via);
  } catch (err) {
    console.error("Resend sign-in code error:", err);
    res.status(500).json({ message: "Failed to resend sign-in code" });
  }
});

/* ======================
   SIGN-IN: CHECK EMAIL CODE -> ADMIN TOKEN
====================== */
router.post("/login/2fa", async (req, res) => {
  const challenge = readChallenge(req.body?.challengeToken, "2fa");
  if (!challenge) return res.status(401).json(SIGN_IN_TIMED_OUT);

  try {
    const user = await User.findById(challenge.id).select(
      "+loginCode.hash +loginCode.expiresAt +loginCode.attempts"
    );
    if (!user || !isAdminAccount(user)) return res.status(401).json(SIGN_IN_TIMED_OUT);

    if (!user.loginCode?.hash || !user.loginCode?.expiresAt) {
      return res.status(400).json({ message: "No active sign-in code. Please sign in again." });
    }

    if (Date.now() > new Date(user.loginCode.expiresAt).getTime()) {
      return res.status(400).json({ message: "That code has expired. Request a new code to sign in." });
    }

    if ((user.loginCode.attempts || 0) >= MAX_ATTEMPTS) {
      return res.status(429).json({ message: "Too many wrong codes. Please sign in again." });
    }

    const matched = codeMatches(req.body?.code, user.loginCode.hash, process.env.JWT_SECRET);
    if (!matched) {
      user.loginCode.attempts = (user.loginCode.attempts || 0) + 1;
      await user.save();

      logActivity({
        req,
        actor: { id: user._id, name: user.name, email: user.email, role: user.role },
        action: "auth.admin_2fa",
        category: "auth",
        status: "failure",
        message: `Wrong sign-in code for ${user.email}`,
        meta: { attempt: user.loginCode.attempts },
      });
      return res.status(400).json({ message: "That code didn't work. Check your email or request a new code." });
    }

    user.loginCode = undefined;
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email, mfa: true },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const actor = { id: user._id, name: user.name, email: user.email, role: user.role };
    logActivity({
      req,
      actor,
      action: "auth.admin_login",
      category: "auth",
      message: `${user.email} signed in to the admin panel${challenge.via === "google" ? " via Google" : ""}`,
      meta: { provider: challenge.via, superAdmin: user.role === "superadmin", twoFactor: true },
    });

    res.json({ token, user: adminUserJson(user) });
  } catch (err) {
    if (handleValidationError(res, err)) return;
    console.error("2FA verify error:", err);
    res.status(500).json({ message: "Sign-in failed" });
  }
});

/* ======================
   ADMIN GOOGLE LOGIN
====================== */
router.post("/google-login", async (req, res) => {
  try {
    const { name, avatar, accessToken } = req.body;

    // The email comes from Google, never from the browser.
    let cleanEmail;
    try {
      ({ email: cleanEmail } = await verifyGoogleAccessToken(accessToken));
    } catch (err) {
      if (err instanceof GoogleSignInError) return res.status(401).json({ message: err.message });
      throw err;
    }

    let user = await User.findOne({ email: cleanEmail });

    // If user doesn't exist, create with appropriate admin/superadmin role
    if (!user) {
      const initialRole = isSuperAdmin(cleanEmail)
        ? "superadmin"
        : isAdminEmail(cleanEmail)
        ? "admin"
        : "user";

      if (initialRole === "user") {
        return res.status(403).json({ 
          message: "Access denied. This account is not an admin account." 
        });
      }

      user = await User.create({
        name: name?.trim() || cleanEmail.split("@")[0],
        email: cleanEmail,
        provider: "google",
        avatar,
        role: initialRole,
      });
    } else {
      // User exists - ensure proper role based on email configuration
      if (isSuperAdmin(user.email)) {
        if (user.role !== "superadmin") {
          user.role = "superadmin";
        }
      } else if (isAdminEmail(user.email)) {
        if (user.role !== "admin" && user.role !== "superadmin") {
          user.role = "admin";
        }
      } else if (user.role !== "admin" && user.role !== "superadmin") {
        return res.status(403).json({ 
          message: "Access denied. This account is not an admin account." 
        });
      }
      
      // Update provider to Google if it was credentials
      if (user.provider === "credentials") {
        user.provider = "google";
      }
      // Update avatar if provided
      if (avatar) {
        user.avatar = avatar;
      }
      await user.save();
    }

    // Google proved the email; the 2-step code is still required.
    await respondWithCode(res, user, "google");
  } catch (err) {
    console.error("Admin Google login error:", err);
    res.status(500).json({ message: "Google login failed" });
  }
});

/* ======================
   UPDATE ADMIN PROFILE
====================== */
router.put("/profile", auth, adminOnly, async (req, res) => {
  try {
    const { name, email, avatar, currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update basic info
    if (name) user.name = name.trim();
    if (email) {
      const emailExists = await User.findOne({ 
        email: email.toLowerCase().trim(),
        _id: { $ne: user._id }
      });
      if (emailExists) {
        return res.status(400).json({ message: "Email already in use" });
      }
      user.email = email.toLowerCase().trim();
    }
    
    // Update avatar
    if (avatar !== undefined) {
      user.avatar = avatar.trim() || null;
    }

    // Update password if provided
    if (newPassword) {
      const problem = adminPasswordError(newPassword, user.email);
      if (problem) {
        return res.status(400).json({ message: problem });
      }

      // Only verify current password for non-super admins
      const isSuper = isSuperAdmin(req.user.email);
      if (!isSuper && user.password) {
        if (!currentPassword) {
          return res.status(400).json({ message: "Current password is required" });
        }
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
          return res.status(400).json({ message: "Current password is incorrect" });
        }
      }

      // Hash and set new password
      user.password = await bcrypt.hash(newPassword, 10);
      user.passwordChangedAt = new Date();
      // Update provider to credentials if it was Google
      if (user.provider === "google") {
        user.provider = "credentials";
      }
    }

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (err) {
    if (handleValidationError(res, err)) return;
    console.error("Update profile error:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

/* ======================
   ADMIN STATS
====================== */
router.get("/stats", auth, adminOnly, async (req, res) => {
  try {
    const usersCount = await User.countDocuments();
    const ordersCount = await Order.countDocuments();
    const userOrdersCount = await UserOrders.countDocuments();

    // The panel calls this endpoint to validate its session, so it doubles as
    // the identity refresh: the browser must never decide its own role or
    // permissions from a stale localStorage copy.
    const account = await User.findById(req.user.id).select("email role adminPermissions");
    let isSuper = await checkIsSuperAdmin(req.user);
    if (!isSuper && account && (account.role === "superadmin" || isSuperAdmin(account.email))) {
      isSuper = true;
    }
    if (account && isSuper && account.role !== "superadmin") {
      account.role = "superadmin";
      await account.save();
    }
    const permissions = isSuper ? ADMIN_PERMISSIONS : account?.adminPermissions || [];

    // The dashboard is open to every admin, but its revenue figure is not -
    // that stays behind the same permission as the revenue section.
    const canSeeRevenue = permissions.includes("revenue");
    const revenue = canSeeRevenue
      ? await Order.aggregate([
          { $match: { status: "SUCCESS" } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ])
      : [];

    res.json({
      users: usersCount,
      orders: ordersCount,       // untouched
      userOrders: userOrdersCount,
      revenue: revenue[0]?.total || 0,
      revenueVisible: canSeeRevenue,
      me: {
        _id: account?._id || req.user.id,
        email: account?.email || req.user.email,
        role: isSuper ? "superadmin" : account?.role || req.user.role,
        adminPermissions: permissions,
      },
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

/* ======================
   ADMIN USERS LIST
====================== */
router.get("/users", auth, requirePermission("users"), async (req, res) => {
  const users = await User.find().select(
    "_id name email role provider createdAt adminPermissions"
  );

  res.json(users);
});

/* ======================
   ADMIN SECTION PERMISSIONS
====================== */

// Catalog of grantable sections, so the panel never drifts from the backend.
router.get("/permissions", auth, adminOnly, (req, res) => {
  res.json({ permissions: ADMIN_PERMISSIONS });
});

router.patch("/users/:id/permissions", auth, superAdminOnly, async (req, res) => {
  try {
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ message: "permissions must be an array" });
    }

    const invalid = permissions.filter((item) => !ADMIN_PERMISSIONS.includes(item));
    if (invalid.length) {
      return res.status(400).json({ message: `Unknown permissions: ${invalid.join(", ")}` });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (targetUser.role !== "admin") {
      return res.status(400).json({ message: "Permissions apply to admin accounts only" });
    }

    const cleaned = [...new Set(permissions)];
    const before = targetUser.adminPermissions || [];
    targetUser.adminPermissions = cleaned;
    await targetUser.save();

    logActivity({
      req,
      action: "user.permissions_change",
      category: "user",
      message: `Updated admin permissions for ${targetUser.email}`,
      target: { type: "User", id: targetUser._id, label: targetUser.email },
      meta: { before, after: cleaned },
    });

    res.json({
      message: "Permissions updated",
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        adminPermissions: cleaned,
      },
    });
  } catch (err) {
    console.error("Update permissions error:", err);
    res.status(500).json({ message: "Failed to update permissions" });
  }
});

/* ======================
   USER ORDERS (GROUPED ✅)
====================== */
router.get("/user-orders", auth, requirePermission("users"), async (req, res) => {
  try {
    const rows = await UserOrders.find()
      .populate("userId", "name email")
      .populate("orderId", "amount createdAt")
      .populate("invoiceId", "invoiceNumber");

    // 🔑 GROUP BY USER (with null checks)
    const grouped = {};

    rows.forEach((row) => {
      // Skip rows with missing data
      if (!row.userId || !row.orderId) return;
      const uid = row.userId._id.toString();

      if (!grouped[uid]) {
        grouped[uid] = {
          user: row.userId,
          orders: [],
        };
      }

      grouped[uid].orders.push({
        orderId: row.orderId._id,
        amount: row.orderId.amount,
        createdAt: row.orderId.createdAt,
        invoice: row.invoiceId,
      });
    });

    res.json(Object.values(grouped));
  } catch (err) {
    console.error("User orders error:", err);
    res.status(500).json({ message: "Failed to fetch user orders" });
  }
});

/* ======================
   DELETE USER
====================== */
router.delete("/users/:id", auth, requirePermission("users"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent deleting yourself (safety measure)
    if (user._id.toString() === req.user.id) {
      return res.status(403).json({ message: "Cannot delete yourself" });
    }

    // Orders account cannot manage users
    if (isOrdersEmail(req.user.email)) {
      return res.status(403).json({ message: "Orders account cannot manage users" });
    }

    // Only super admin can delete admin users
    const isSuper = await checkIsSuperAdmin(req.user);
    if ((user.role === "admin" || user.role === "superadmin") && !isSuper) {
      return res.status(403).json({ message: "Only super admin can delete admin users" });
    }

    await User.findByIdAndDelete(req.params.id);

    logActivity({
      req,
      action: "user.delete",
      category: "user",
      message: `Deleted user ${user.email}`,
      target: { type: "User", id: user._id, label: user.email },
      meta: { deletedRole: user.role, deletedName: user.name },
    });

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

/* ======================
   UPDATE USER ROLE
====================== */
router.patch("/users/:id/role", auth, requirePermission("users"), async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!["user", "influencer", "admin", "superadmin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Orders account cannot manage users
    if (isOrdersEmail(req.user.email)) {
      return res.status(403).json({ message: "Orders account cannot manage users" });
    }

    // Only super admin can change admin roles or make someone admin
    const isSuper = await checkIsSuperAdmin(req.user);
    if ((targetUser.role === "admin" || targetUser.role === "superadmin" || role === "admin" || role === "superadmin") && !isSuper) {
      return res.status(403).json({ message: "Only super admin can manage admin roles" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("_id name email role");

    logActivity({
      req,
      action: "user.role_change",
      category: "user",
      message: `Changed role of ${user.email} from ${targetUser.role} to ${role}`,
      target: { type: "User", id: user._id, label: user.email },
      meta: { from: targetUser.role, to: role },
    });

    res.json({ message: "Role updated successfully", user });
  } catch (err) {
    console.error("Update role error:", err);
    res.status(500).json({ message: "Failed to update role" });
  }
});

/* ======================
   RESET USER PASSWORD
====================== */
router.patch("/users/:id/reset-password", auth, superAdminOnly, async (req, res) => {
  try {
    const { newPassword } = req.body;

    const target = await User.findById(req.params.id).select("role email");
    if (!target) {
      return res.status(404).json({ message: "User not found" });
    }

    const problem = passwordErrorForRole(target.role, newPassword, target.email);
    if (problem) {
      return res.status(400).json({ message: problem });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Set by someone else, so an admin has to replace it at their next sign-in.
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { password: hashedPassword, passwordChangedAt: null },
      { new: true }
    ).select("_id name email");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    logActivity({
      req,
      action: "user.password_reset",
      category: "user",
      message: `Reset the password of ${user.email}`,
      target: { type: "User", id: user._id, label: user.email },
    });

    res.json({ message: "Password reset successfully", user });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Failed to reset password" });
  }
});

/* ======================
   UPDATE USER INFO
====================== */
router.patch("/users/:id", auth, requirePermission("users"), async (req, res) => {
  try {
    const { name, email } = req.body;
    
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Orders account cannot manage users
    if (isOrdersEmail(req.user.email)) {
      return res.status(403).json({ message: "Orders account cannot manage users" });
    }

    // Super admin can edit ANYONE, regular admins can only edit non-admins
    const isSuper = await checkIsSuperAdmin(req.user);
    if ((targetUser.role === "admin" || targetUser.role === "superadmin") && targetUser._id.toString() !== req.user.id && !isSuper) {
      return res.status(403).json({ message: "Only super admin can edit other admin accounts" });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) {
      const nextEmail = email.toLowerCase().trim();
      // Claiming a privileged env-listed address would grant access the actor
      // does not have, so only a super admin may assign one.
      if (
        nextEmail !== targetUser.email &&
        (isSuperAdmin(nextEmail) || isAdminEmail(nextEmail)) &&
        !isSuper
      ) {
        return res.status(403).json({ message: "Only super admin can assign a privileged email address" });
      }
      updateData.email = nextEmail;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select("_id name email role provider createdAt adminPermissions");

    logActivity({
      req,
      action: "user.update",
      category: "user",
      message: `Updated user ${user.email}`,
      target: { type: "User", id: user._id, label: user.email },
      meta: {
        fields: Object.keys(updateData),
        before: { name: targetUser.name, email: targetUser.email },
        after: updateData,
      },
    });

    res.json({ message: "User updated successfully", user });
  } catch (err) {
    if (handleValidationError(res, err)) return;
    console.error("Update user error:", err);
    res.status(500).json({ message: "Failed to update user" });
  }
});

/* ======================
   SUPER ADMIN EDIT ANY USER (COMPLETE ACCESS)
====================== */
router.put("/users/:id/super-edit", auth, superAdminOnly, async (req, res) => {
  try {
    const { name, email, password, avatar } = req.body;
    
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const updateData = {};
    
    if (name) updateData.name = name.trim();
    
    if (email) {
      const emailExists = await User.findOne({ 
        email: email.toLowerCase().trim(),
        _id: { $ne: targetUser._id }
      });
      if (emailExists) {
        return res.status(400).json({ message: "Email already in use" });
      }
      updateData.email = email.toLowerCase().trim();
    }
    
    if (avatar !== undefined) {
      updateData.avatar = avatar.trim() || null;
    }
    
    // Super admin can change password without verification
    if (password) {
      const problem = passwordErrorForRole(targetUser.role, password, updateData.email || targetUser.email);
      if (problem) {
        return res.status(400).json({ message: problem });
      }
      updateData.password = await bcrypt.hash(password, 10);
      // Set by someone else, so an admin has to replace it at their next sign-in.
      updateData.passwordChangedAt = null;
      updateData.provider = "credentials";
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select("_id name email role provider avatar createdAt");

    logActivity({
      req,
      action: "user.super_edit",
      category: "user",
      message: `Super-admin edited user ${user.email}`,
      target: { type: "User", id: user._id, label: user.email },
      // `fields` is safe to log; the password value itself is redacted by the logger.
      meta: { fields: Object.keys(updateData) },
    });

    res.json({ message: "User updated successfully by super admin", user });
  } catch (err) {
    if (handleValidationError(res, err)) return;
    console.error("Super admin edit user error:", err);
    res.status(500).json({ message: "Failed to update user" });
  }
});

/* ======================
   SEND RESET PASSWORD EMAIL TO USER
====================== */
router.post("/users/:id/send-reset-email", auth, requirePermission("users"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    const { resetPasswordEmail } = require("../utils/emailTemplates");
    await sendEmail({
      to: user.email,
      subject: "Reset your StickToon password",
      html: resetPasswordEmail({ resetUrl }),
    });

    logActivity({
      req,
      action: "user.reset_email_sent",
      category: "user",
      message: `Admin sent password reset email to ${user.email}`,
      target: { type: "User", id: user._id, label: user.email },
    });

    res.json({ message: `Password reset email sent to ${user.email}` });
  } catch (err) {
    console.error("Send reset email error:", err);
    res.status(500).json({ message: "Failed to send reset email" });
  }
});

/* ======================
   CREATE NEW USER WITH ROLE
====================== */
router.post("/users/create", auth, requirePermission("users"), async (req, res) => {
  try {
    const { name, email, password, role = "user", phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const passwordProblem = passwordErrorForRole(role, password, email);
    if (passwordProblem) {
      return res.status(400).json({ message: passwordProblem });
    }

    // Only a super admin may mint admin accounts, otherwise any admin could
    // create a second admin for themselves and escalate around the role guards.
    const isSuper = await checkIsSuperAdmin(req.user);
    if ((role === "admin" || role === "superadmin") && !isSuper) {
      return res.status(403).json({ message: "Only super admin can create admin accounts" });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const assignedRole = ["user", "influencer", "admin", "superadmin"].includes(role) ? role : "user";

    const newUser = new User({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: assignedRole,
      phone: phone ? phone.trim() : "",
      adminPermissions: assignedRole === "admin" ? (req.body.adminPermissions || ADMIN_PERMISSIONS) : undefined,
      influencerProfile: assignedRole === "influencer" ? { isApproved: true, applicationStatus: "approved" } : undefined,
    });

    await newUser.save();

    logActivity({
      req,
      action: "user.create",
      category: "user",
      message: `Admin created new ${assignedRole} account: ${newUser.email}`,
      target: { type: "User", id: newUser._id, label: newUser.email },
    });

    res.status(201).json({
      message: "User created successfully",
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt,
      },
    });
  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ message: "Failed to create user" });
  }
});

/* ======================
   👑 CREATE NEW ADMIN (SUPER ADMIN ONLY)
====================== */
router.post("/users/create-admin", auth, superAdminOnly, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const passwordProblem = adminPasswordError(password, email);
    if (passwordProblem) {
      return res.status(400).json({ message: passwordProblem });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: cleanEmail });

    if (existingUser) {
      if (existingUser.role === "admin" || existingUser.role === "superadmin") {
        return res.status(400).json({ message: "An admin with this email already exists" });
      }

      // Promote existing user to admin
      existingUser.role = "admin";
      existingUser.adminPermissions = ADMIN_PERMISSIONS;
      if (name?.trim()) existingUser.name = name.trim();
      const updated = await existingUser.save();
      const result = updated.toObject();
      delete result.password;

      logActivity({
        req,
        action: "user.role_change",
        category: "user",
        message: `Super Admin promoted existing user to Admin: ${existingUser.email}`,
        target: { type: "User", id: existingUser._id, label: existingUser.email },
      });

      return res.json({ message: "Existing user promoted to Admin", user: result });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await User.create({
      name: name?.trim() || cleanEmail.split("@")[0],
      email: cleanEmail,
      password: hashedPassword,
      role: "admin",
      adminPermissions: ADMIN_PERMISSIONS,
      provider: "credentials",
    });

    const result = newAdmin.toObject();
    delete result.password;

    logActivity({
      req,
      action: "user.create",
      category: "user",
      message: `Super Admin created new admin account: ${newAdmin.email}`,
      target: { type: "User", id: newAdmin._id, label: newAdmin.email },
    });

    res.status(201).json({ message: "Admin account created successfully", user: result });
  } catch (err) {
    if (handleValidationError(res, err)) return;
    console.error("Create admin error:", err);
    res.status(500).json({ message: "Failed to create admin user" });
  }
});

/* ======================
   👑 PROMOTE USER TO ADMIN (SUPER ADMIN ONLY)
====================== */
router.patch("/users/:id/promote", auth, superAdminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: "admin", adminPermissions: ADMIN_PERMISSIONS },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    logActivity({
      req,
      action: "user.role_change",
      category: "user",
      message: `Super Admin promoted user to Admin: ${user.email}`,
      target: { type: "User", id: user._id, label: user.email },
    });

    res.json({ message: "User promoted to Admin", user });
  } catch (err) {
    console.error("Promote user error:", err);
    res.status(500).json({ message: "Failed to promote user" });
  }
});

/* ======================
   👑 DEMOTE ADMIN TO USER (SUPER ADMIN ONLY)
====================== */
router.patch("/users/:id/demote", auth, superAdminOnly, async (req, res) => {
  try {
    if (req.user.id === req.params.id) {
      return res.status(400).json({ message: "You cannot demote your own account" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: "user", adminPermissions: [] },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    logActivity({
      req,
      action: "user.role_change",
      category: "user",
      message: `Super Admin demoted admin to user: ${user.email}`,
      target: { type: "User", id: user._id, label: user.email },
    });

    res.json({ message: "Admin privileges removed (demoted to user)", user });
  } catch (err) {
    console.error("Demote user error:", err);
    res.status(500).json({ message: "Failed to demote admin user" });
  }
});

module.exports = router;
