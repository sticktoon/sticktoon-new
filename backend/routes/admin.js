const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Order = require("../models/Order");
const UserOrders = require("../models/User_Orders");

const router = express.Router();

/* ======================
   AUTH MIDDLEWARE
====================== */
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};

/* ======================
   ADMIN ONLY
====================== */
const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }
  next();
};

/* ======================
   ADMIN LOGIN
====================== */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ 
      email: email.toLowerCase().trim(),
      role: "admin"
    }).select("+password");

    if (!user) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
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

    // Prevent deleting admin users
    if (user.role === "admin") {
      return res.status(403).json({ message: "Cannot delete admin users" });
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

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("_id name email role");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Role updated successfully", user });
  } catch (err) {
    console.error("Update role error:", err);
    res.status(500).json({ message: "Failed to update role" });
  }
});

/* ======================
   RESET USER PASSWORD
====================== */
router.patch("/users/:id/reset-password", auth, adminOnly, async (req, res) => {
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
   UPDATE USER DETAILS
====================== */
router.patch("/users/:id", auth, adminOnly, async (req, res) => {
  try {
    const { name, email } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select("_id name email role provider createdAt");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User updated successfully", user });
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ message: "Failed to update user" });
  }
});

module.exports = router;
