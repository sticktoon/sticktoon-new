const express = require("express");
const router = express.Router();
const InfluencerEarning = require("../models/InfluencerEarning");
const PromoCode = require("../models/PromoCode");
const User = require("../models/User");
const auth = require("../middleware/auth");

/* Admin only middleware */
const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }
  next();
};

/* =========================
   GET ALL INFLUENCER EARNINGS
========================= */
router.get("/", auth, adminOnly, async (req, res) => {
  try {
    const earnings = await InfluencerEarning.find()
      .populate("influencerId", "name email")
      .populate("promoCodeId", "code")
      .populate("orderId", "amount status createdAt")
      .sort({ createdAt: -1 });

    res.json(earnings);
  } catch (err) {
    console.error("Get earnings error:", err);
    res.status(500).json({ message: "Failed to fetch earnings" });
  }
});

/* =========================
   GET EARNINGS SUMMARY BY INFLUENCER
========================= */
router.get("/summary", auth, adminOnly, async (req, res) => {
  try {
    const summary = await InfluencerEarning.aggregate([
      {
        $group: {
          _id: "$influencerId",
          totalEarnings: { $sum: "$totalEarning" },
          totalUnits: { $sum: "$totalUnits" },
          totalOrders: { $sum: 1 },
          pendingEarnings: {
            $sum: {
              $cond: [{ $eq: ["$status", "pending"] }, "$totalEarning", 0],
            },
          },
          paidEarnings: {
            $sum: {
              $cond: [{ $eq: ["$status", "paid"] }, "$totalEarning", 0],
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "influencer",
        },
      },
      {
        $unwind: "$influencer",
      },
      {
        $project: {
          _id: 1,
          influencerName: "$influencer.name",
          influencerEmail: "$influencer.email",
          totalEarnings: 1,
          totalUnits: 1,
          totalOrders: 1,
          pendingEarnings: 1,
          paidEarnings: 1,
        },
      },
      {
        $sort: { totalEarnings: -1 },
      },
    ]);

    res.json(summary);
  } catch (err) {
    console.error("Get earnings summary error:", err);
    res.status(500).json({ message: "Failed to fetch earnings summary" });
  }
});

/* =========================
   GET EARNINGS FOR A SPECIFIC INFLUENCER
========================= */
router.get("/influencer/:id", auth, adminOnly, async (req, res) => {
  try {
    const earnings = await InfluencerEarning.find({
      influencerId: req.params.id,
    })
      .populate("promoCodeId", "code")
      .populate("orderId", "amount status createdAt")
      .populate("customerId", "name email")
      .sort({ createdAt: -1 });

    // Calculate totals
    const totals = earnings.reduce(
      (acc, e) => {
        acc.totalEarnings += e.totalEarning;
        acc.totalUnits += e.totalUnits;
        if (e.status === "pending") acc.pendingEarnings += e.totalEarning;
        if (e.status === "paid") acc.paidEarnings += e.totalEarning;
        return acc;
      },
      { totalEarnings: 0, totalUnits: 0, pendingEarnings: 0, paidEarnings: 0 }
    );

    res.json({ earnings, totals });
  } catch (err) {
    console.error("Get influencer earnings error:", err);
    res.status(500).json({ message: "Failed to fetch earnings" });
  }
});

/* =========================
   MARK EARNINGS AS PAID
========================= */
router.patch("/pay/:id", auth, adminOnly, async (req, res) => {
  try {
    const { paymentReference } = req.body;

    const earning = await InfluencerEarning.findByIdAndUpdate(
      req.params.id,
      {
        status: "paid",
        paidAt: new Date(),
        paymentReference: paymentReference || null,
      },
      { new: true }
    );

    if (!earning) {
      return res.status(404).json({ message: "Earning not found" });
    }

    res.json(earning);
  } catch (err) {
    console.error("Pay earning error:", err);
    res.status(500).json({ message: "Failed to mark as paid" });
  }
});

/* =========================
   BULK MARK EARNINGS AS PAID
========================= */
router.patch("/pay-bulk", auth, adminOnly, async (req, res) => {
  try {
    const { earningIds, paymentReference } = req.body;

    if (!earningIds || !Array.isArray(earningIds)) {
      return res.status(400).json({ message: "earningIds array required" });
    }

    const result = await InfluencerEarning.updateMany(
      { _id: { $in: earningIds }, status: "pending" },
      {
        status: "paid",
        paidAt: new Date(),
        paymentReference: paymentReference || null,
      }
    );

    res.json({
      message: `${result.modifiedCount} earnings marked as paid`,
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    console.error("Bulk pay error:", err);
    res.status(500).json({ message: "Failed to mark as paid" });
  }
});

/* =========================
   GET OVERALL STATS
========================= */
router.get("/stats", auth, adminOnly, async (req, res) => {
  try {
    const stats = await InfluencerEarning.aggregate([
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: "$totalEarning" },
          totalUnits: { $sum: "$totalUnits" },
          totalOrders: { $sum: 1 },
          pendingEarnings: {
            $sum: {
              $cond: [{ $eq: ["$status", "pending"] }, "$totalEarning", 0],
            },
          },
          paidEarnings: {
            $sum: {
              $cond: [{ $eq: ["$status", "paid"] }, "$totalEarning", 0],
            },
          },
        },
      },
    ]);

    const influencerCount = await PromoCode.countDocuments({
      promoType: "influencer",
    });

    res.json({
      ...(stats[0] || {
        totalEarnings: 0,
        totalUnits: 0,
        totalOrders: 0,
        pendingEarnings: 0,
        paidEarnings: 0,
      }),
      influencerCount,
    });
  } catch (err) {
    console.error("Get stats error:", err);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

module.exports = router;
