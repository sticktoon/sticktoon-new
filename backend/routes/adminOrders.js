const express = require("express");
const router = express.Router();
const Order = require("../models/Order");

/* =========================
   GET ALL ORDERS (ADMIN)
========================= */
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("userId", "email")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    console.error("Admin orders error:", err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

module.exports = router;
