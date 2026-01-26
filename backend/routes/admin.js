const express = require("express");
const jwt = require("jsonwebtoken");
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

module.exports = router;
