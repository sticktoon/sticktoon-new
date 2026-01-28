const express = require("express");
const router = express.Router();
const Order = require("../models/Order");

/* =========================
   MIDDLEWARE (from admin.js pattern)
========================= */
const jwt = require("jsonwebtoken");

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

const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }
  next();
};

/* =========================
   GET ALL ORDERS (ADMIN)
========================= */
router.get("/", auth, adminOnly, async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    
    const orders = await Order.find(query)
      .populate("userId", "email name")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    console.error("Admin orders error:", err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

/* =========================
   UPDATE ORDER STATUS
========================= */
router.patch("/:id/status", auth, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    
    const validStatuses = ["PENDING", "PROCESSING", "SUCCESS", "FAILED", "REFUNDED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate("userId", "email name");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ message: "Order status updated", order });
  } catch (err) {
    console.error("Update order error:", err);
    res.status(500).json({ message: "Failed to update order" });
  }
});

/* =========================
   DELETE ORDER
========================= */
router.delete("/:id", auth, adminOnly, async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ message: "Order deleted successfully" });
  } catch (err) {
    console.error("Delete order error:", err);
    res.status(500).json({ message: "Failed to delete order" });
  }
});

module.exports = router;
