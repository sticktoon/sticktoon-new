const express = require("express");
const router = express.Router();
const PromoCode = require("../models/PromoCode");
const auth = require("../middleware/auth");

/* 👑 ADMIN ONLY */
const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }
  next();
};

/* =========================
   GET ALL PROMO CODES
========================= */
router.get("/", auth, adminOnly, async (req, res) => {
  try {
    const promos = await PromoCode.find().sort({ createdAt: -1 });
    res.json(promos);
  } catch (err) {
    console.error("Get promos error:", err);
    res.status(500).json({ message: "Failed to fetch promo codes" });
  }
});

/* =========================
   CREATE PROMO CODE
========================= */
router.post("/", auth, adminOnly, async (req, res) => {
  try {
    const {
      code,
      promoType,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscount,
      usageLimit,
      validFrom,
      validUntil,
      description,
      earningPerUnit,
    } = req.body;

    if (!code || !discountType || !discountValue || !validUntil) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const existing = await PromoCode.findOne({ code: code.toUpperCase().trim() });
    if (existing) {
      return res.status(400).json({ message: "Promo code already exists" });
    }

    const promo = await PromoCode.create({
      code: code.toUpperCase().trim(),
      promoType: promoType || "company",
      discountType,
      discountValue,
      minOrderAmount: minOrderAmount || 0,
      maxDiscount: maxDiscount || null,
      usageLimit: usageLimit || null,
      validFrom: validFrom || new Date(),
      validUntil,
      description: description || "",
      earningPerUnit: earningPerUnit || 5,
      createdBy: req.user.id, // Track which admin/influencer created this
    });

    res.status(201).json(promo);
  } catch (err) {
    console.error("Create promo error:", err);
    res.status(500).json({ message: "Failed to create promo code" });
  }
});

/* =========================
   UPDATE PROMO CODE
========================= */
router.put("/:id", auth, adminOnly, async (req, res) => {
  try {
    const promo = await PromoCode.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!promo) {
      return res.status(404).json({ message: "Promo code not found" });
    }

    res.json(promo);
  } catch (err) {
    console.error("Update promo error:", err);
    res.status(500).json({ message: "Failed to update promo code" });
  }
});

/* =========================
   DELETE PROMO CODE
========================= */
router.delete("/:id", auth, adminOnly, async (req, res) => {
  try {
    const promo = await PromoCode.findByIdAndDelete(req.params.id);

    if (!promo) {
      return res.status(404).json({ message: "Promo code not found" });
    }

    res.json({ message: "Promo code deleted" });
  } catch (err) {
    console.error("Delete promo error:", err);
    res.status(500).json({ message: "Failed to delete promo code" });
  }
});

/* =========================
   TOGGLE PROMO STATUS
========================= */
router.patch("/:id/toggle", auth, adminOnly, async (req, res) => {
  try {
    const promo = await PromoCode.findById(req.params.id);

    if (!promo) {
      return res.status(404).json({ message: "Promo code not found" });
    }

    promo.isActive = !promo.isActive;
    await promo.save();

    res.json(promo);
  } catch (err) {
    console.error("Toggle promo error:", err);
    res.status(500).json({ message: "Failed to toggle promo code" });
  }
});

/* =========================
   GET PROMO USAGE HISTORY
========================= */
router.get("/:id/history", auth, adminOnly, async (req, res) => {
  try {
    const promo = await PromoCode.findById(req.params.id)
      .populate("usageHistory.userId", "name email")
      .populate("usageHistory.orderId", "amount status createdAt");

    if (!promo) {
      return res.status(404).json({ message: "Promo code not found" });
    }

    res.json({
      code: promo.code,
      usedCount: promo.usedCount,
      usageLimit: promo.usageLimit,
      history: promo.usageHistory || [],
    });
  } catch (err) {
    console.error("Get promo history error:", err);
    res.status(500).json({ message: "Failed to fetch usage history" });
  }
});

module.exports = router;
