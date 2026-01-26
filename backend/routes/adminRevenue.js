const express = require("express");
const Order = require("../models/Order");
const auth = require("../middleware/auth");

const router = express.Router();

/* 👑 ADMIN ONLY */
const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }
  next();
};

/* 📊 DAY-WISE REVENUE */
router.get("/daily", auth, adminOnly, async (req, res) => {
  try {
    const revenue = await Order.aggregate([
      {
        // only successful payments count as revenue
        $match: { status: "SUCCESS" },
      },
      {
        // group by DATE (YYYY-MM-DD)
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              timezone: "Asia/Kolkata"
            },
          },
          totalRevenue: { $sum: "$amount" },
          ordersCount: { $sum: 1 },
        },
      },
      {
        // newest day first
        $sort: { _id: -1 },
      },
    ]);

    res.json(revenue);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch revenue" });
  }
});

module.exports = router;