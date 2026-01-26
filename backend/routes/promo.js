const express = require("express");
const router = express.Router();
const PromoCode = require("../models/PromoCode");
const auth = require("../middleware/auth");

/* =========================
   VALIDATE PROMO CODE
========================= */
router.post("/validate", auth, async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    const deliveryCharges = 99; // Fixed delivery charge
    const totalBeforeDiscount = subtotal + deliveryCharges;

    if (!code) {
      return res.status(400).json({ message: "Promo code is required" });
    }

    const promo = await PromoCode.findOne({
      code: code.toUpperCase().trim(),
      isActive: true,
    });

    if (!promo) {
      return res.status(404).json({ message: "Invalid promo code" });
    }

    // Check validity dates
    const now = new Date();
    if (now < promo.validFrom) {
      return res.status(400).json({ message: "Promo code is not yet active" });
    }

    if (now > promo.validUntil) {
      return res.status(400).json({ message: "Promo code has expired" });
    }

    // Check usage limit
    if (promo.usageLimit && promo.usedCount >= promo.usageLimit) {
      return res.status(400).json({ message: "Promo code usage limit reached" });
    }

    // Check minimum order amount
    if (subtotal < promo.minOrderAmount) {
      return res.status(400).json({
        message: `Minimum order of ₹${promo.minOrderAmount} required`,
      });
    }

    // Calculate discount on TOTAL PRICE (subtotal + delivery)
    let discount = 0;
    if (promo.discountType === "percentage") {
      discount = (totalBeforeDiscount * promo.discountValue) / 100;
      // Apply max discount cap if set
      if (promo.maxDiscount && discount > promo.maxDiscount) {
        discount = promo.maxDiscount;
      }
    } else {
      discount = promo.discountValue;
    }

    // Discount cannot exceed total
    if (discount > totalBeforeDiscount) {
      discount = totalBeforeDiscount;
    }

    return res.json({
      success: true,
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      discount: Math.round(discount),
      description: promo.description,
    });
  } catch (err) {
    console.error("Promo validation error:", err);
    return res.status(500).json({ message: "Failed to validate promo code" });
  }
});

module.exports = router;
