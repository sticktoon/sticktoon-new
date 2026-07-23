const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Order = require("../models/Order");
const UserOrders = require("../models/User_Orders");

const router = express.Router();

const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const auth = require("../middleware/auth");
const { adminOnly, superAdminOnly, isSuperAdmin, isAdminEmail, isOrdersEmail } = require("../middleware/roleMiddleware");
const { logActivity } = require("../utils/activityLogger");

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

    if (user.role !== "admin" && !isAdminEmail(user.email)) {
      await logFailure("not_an_admin");
      return res.status(403).json({ message: "Access denied. This account is not an admin account." });
    }

    if (user.role !== "admin") {
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

    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    logActivity({
      req,
      actor: { id: user._id, name: user.name, email: user.email, role: user.role },
      action: "auth.admin_login",
      category: "auth",
      message: `${user.email} signed in to the admin panel`,
      meta: { provider: "credentials", superAdmin: isSuperAdmin(user.email) },
    });

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ message: "Login failed" });
  }
});

/* ======================
   ADMIN GOOGLE LOGIN
====================== */
router.post("/google-login", async (req, res) => {
  try {
    const { name, email, avatar } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Google login failed" });
    }

    let user = await User.findOne({ email });

    // If user doesn't exist, create with admin role
    if (!user) {
      user = await User.create({
        name: name?.trim() || email.split("@")[0],
        email,
        provider: "google",
        avatar,
        role: isAdminEmail(email) ? "admin" : "user",
      });
    } else {
      // User exists - ensure they are admin if their email is allowed
      if (user.role !== "admin" && isAdminEmail(user.email)) {
        user.role = "admin";
      } else if (user.role !== "admin") {
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

    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    logActivity({
      req,
      actor: { id: user._id, name: user.name, email: user.email, role: user.role },
      action: "auth.admin_login",
      category: "auth",
      message: `${user.email} signed in to the admin panel via Google`,
      meta: { provider: "google", superAdmin: isSuperAdmin(user.email) },
    });

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      },
    });
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
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
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

    const revenue = await Order.aggregate([
      { $match: { status: "SUCCESS" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    res.json({
      users: usersCount,
      orders: ordersCount,       // untouched
      userOrders: userOrdersCount,
      revenue: revenue[0]?.total || 0,
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

/* ======================
   ADMIN USERS LIST
====================== */
router.get("/users", auth, adminOnly, async (req, res) => {
  const users = await User.find().select(
    "_id name email role provider createdAt"
  );

  res.json(users);
});

/* ======================
   USER ORDERS (GROUPED ✅)
====================== */
router.get("/user-orders", auth, adminOnly, async (req, res) => {
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
router.delete("/users/:id", auth, adminOnly, async (req, res) => {
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
    if (user.role === "admin" && !isSuperAdmin(req.user.email)) {
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
router.patch("/users/:id/role", auth, adminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!["user", "influencer", "admin"].includes(role)) {
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
    if ((targetUser.role === "admin" || role === "admin") && !isSuperAdmin(req.user.email)) {
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

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { password: hashedPassword },
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
router.patch("/users/:id", auth, adminOnly, async (req, res) => {
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
    if (targetUser.role === "admin" && targetUser._id.toString() !== req.user.id && !isSuperAdmin(req.user.email)) {
      return res.status(403).json({ message: "Only super admin can edit other admin accounts" });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select("_id name email role provider createdAt");

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
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      updateData.password = await bcrypt.hash(password, 10);
      updateData.provider = "credentials";
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
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
    console.error("Super admin edit user error:", err);
    res.status(500).json({ message: "Failed to update user" });
  }
});

/* ======================
   SEND RESET PASSWORD EMAIL TO USER
====================== */
router.post("/users/:id/send-reset-email", auth, adminOnly, async (req, res) => {
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
router.post("/users/create", auth, adminOnly, async (req, res) => {
  try {
    const { name, email, password, role = "user", phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: ["user", "influencer", "admin"].includes(role) ? role : "user",
      phone: phone ? phone.trim() : "",
      influencerProfile: role === "influencer" ? { isApproved: true, applicationStatus: "approved" } : undefined,
    });

    await newUser.save();

    logActivity({
      req,
      action: "user.create",
      category: "user",
      message: `Admin created new ${role} account: ${newUser.email}`,
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

module.exports = router;
