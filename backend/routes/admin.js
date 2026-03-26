const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Order = require("../models/Order");
const UserOrders = require("../models/User_Orders");

const router = express.Router();

const auth = require("../middleware/auth");
const { adminOnly, superAdminOnly, isSuperAdmin } = require("../middleware/roleMiddleware");

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
    const user = await User.findOne({ 
      email: cleanEmail,
      role: "admin"
    }).select("+password");

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // If no password set (Google account), ask to reset password
    if (!user.password) {
      return res.status(400).json({ 
        message: "No password set for this admin account. Please reset your password first." 
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

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
        role: "admin",
      });
    } else {
      // User exists - ensure they are admin
      if (user.role !== "admin") {
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

    // Only super admin can delete admin users
    if (user.role === "admin" && !isSuperAdmin(req.user.email)) {
      return res.status(403).json({ message: "Only super admin can delete admin users" });
    }

    await User.findByIdAndDelete(req.params.id);
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

    // Only super admin can change admin roles or make someone admin
    if ((targetUser.role === "admin" || role === "admin") && !isSuperAdmin(req.user.email)) {
      return res.status(403).json({ message: "Only super admin can manage admin roles" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("_id name email role");

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

    res.json({ message: "User updated successfully by super admin", user });
  } catch (err) {
    console.error("Super admin edit user error:", err);
    res.status(500).json({ message: "Failed to update user" });
  }
});

module.exports = router;
