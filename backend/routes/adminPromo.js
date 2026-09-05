const express = require("express");
const router = express.Router();
const PromoCode = require("../models/PromoCode");
const User = require("../models/User");
const auth = require("../middleware/auth");

const { adminOnly } = require("../middleware/roleMiddleware");

/* =========================
   GET ALL PROMO CODES
========================= */
router.get("/", auth, adminOnly, async (req, res) => {
  try {
    const promos = await PromoCode.find()
      .populate("assignedInfluencers", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });
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
      assignedInfluencers,
    } = req.body;

    if (!code || !discountType || !discountValue || !validUntil) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const existing = await PromoCode.findOne({ code: code.toUpperCase().trim() });
    if (existing) {
      return res.status(400).json({ message: "Promo code already exists" });
    }

    const cleanInfluencerIds = Array.isArray(assignedInfluencers)
      ? assignedInfluencers.filter((id) => id && typeof id === "string")
      : [];

    const promo = await PromoCode.create({
      code: code.toUpperCase().trim(),
      promoType: promoType || (cleanInfluencerIds.length > 0 ? "influencer" : "company"),
      discountType,
      discountValue,
      minOrderAmount: minOrderAmount || 0,
      maxDiscount: maxDiscount || null,
      usageLimit: usageLimit || null,
      validFrom: validFrom || new Date(),
      validUntil,
      description: description || "",
      earningPerUnit: earningPerUnit || 5,
      assignedInfluencers: cleanInfluencerIds,
      createdBy: req.user.id, // Track which admin created this
    });

    if (cleanInfluencerIds.length > 0) {
      await User.updateMany(
        { _id: { $in: cleanInfluencerIds } },
        { "influencerProfile.promoCodeId": promo._id }
      );
    }

    const populated = await PromoCode.findById(promo._id)
      .populate("assignedInfluencers", "name email")
      .populate("createdBy", "name email");

    res.status(201).json(populated);
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
    const { assignedInfluencers, ...updateFields } = req.body;

    if (updateFields.code) {
      updateFields.code = updateFields.code.toUpperCase().trim();
    }

    let cleanInfluencerIds;
    if (Array.isArray(assignedInfluencers)) {
      cleanInfluencerIds = assignedInfluencers.filter((id) => id && typeof id === "string");
      updateFields.assignedInfluencers = cleanInfluencerIds;
      if (cleanInfluencerIds.length > 0) {
        updateFields.promoType = "influencer";
      }
    }

    const promo = await PromoCode.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    )
      .populate("assignedInfluencers", "name email")
      .populate("createdBy", "name email");

    if (!promo) {
      return res.status(404).json({ message: "Promo code not found" });
    }

    if (cleanInfluencerIds && cleanInfluencerIds.length > 0) {
      await User.updateMany(
        { _id: { $in: cleanInfluencerIds } },
        { "influencerProfile.promoCodeId": promo._id }
      );
    }

    res.json(promo);
  } catch (err) {
    console.error("Update promo error:", err);
    res.status(500).json({ message: "Failed to update promo code" });
  }
});

/* =========================
   ASSIGN INFLUENCER(S) TO PROMO CODE
========================= */
router.post("/:id/assign-influencers", auth, adminOnly, async (req, res) => {
  try {
    const { influencerIds } = req.body;
    const targetIds = Array.isArray(influencerIds) ? influencerIds : [influencerIds];
    const validIds = targetIds.filter((id) => id && typeof id === "string");

    if (validIds.length === 0) {
      return res.status(400).json({ message: "Influencer ID(s) required" });
    }

    // Verify influencers exist
    const influencers = await User.find({ _id: { $in: validIds }, role: "influencer" });
    if (influencers.length === 0) {
      return res.status(404).json({ message: "No valid influencers found" });
    }

    const promo = await PromoCode.findByIdAndUpdate(
      req.params.id,
      {
        $addToSet: { assignedInfluencers: { $each: validIds } },
        promoType: "influencer",
      },
      { new: true }
    )
      .populate("assignedInfluencers", "name email")
      .populate("createdBy", "name email");

    if (!promo) {
      return res.status(404).json({ message: "Promo code not found" });
    }

    await User.updateMany(
      { _id: { $in: validIds } },
      { "influencerProfile.promoCodeId": promo._id }
    );

    res.json({ message: "Influencer(s) assigned to promo code", promo });
  } catch (err) {
    console.error("Assign influencers to promo error:", err);
    res.status(500).json({ message: "Failed to assign influencers" });
  }
});

/* =========================
   UNASSIGN INFLUENCER FROM PROMO CODE
   (Removes relationship without deleting the promo code itself)
========================= */
router.post("/:id/unassign-influencer", auth, adminOnly, async (req, res) => {
  try {
    const { influencerId } = req.body;
    if (!influencerId) {
      return res.status(400).json({ message: "Influencer ID required" });
    }

    const promo = await PromoCode.findById(req.params.id);
    if (!promo) {
      return res.status(404).json({ message: "Promo code not found" });
    }

    // Pull influencer from assignedInfluencers
    promo.assignedInfluencers = promo.assignedInfluencers.filter(
      (id) => String(id._id || id) !== String(influencerId)
    );

    if (String(promo.createdBy) === String(influencerId)) {
      promo.createdBy = null;
    }

    await promo.save();

    // Reset user promoCodeId if it matches this promo
    const user = await User.findById(influencerId);
    if (user && user.influencerProfile?.promoCodeId?.toString() === String(promo._id)) {
      const remainingPromo = await PromoCode.findOne({
        $or: [
          { assignedInfluencers: user._id },
          { createdBy: user._id },
        ],
      });
      user.influencerProfile.promoCodeId = remainingPromo?._id || null;
      await user.save();
    }

    const updated = await PromoCode.findById(promo._id)
      .populate("assignedInfluencers", "name email")
      .populate("createdBy", "name email");

    res.json({ message: "Influencer unassigned from promo code successfully", promo: updated });
  } catch (err) {
    console.error("Unassign influencer error:", err);
    res.status(500).json({ message: "Failed to unassign influencer" });
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

    // Clean up references in User profiles
    await User.updateMany(
      { "influencerProfile.promoCodeId": req.params.id },
      { $unset: { "influencerProfile.promoCodeId": "" } }
    );

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
    const promo = await PromoCode.findById(req.params.id)
      .populate("assignedInfluencers", "name email")
      .populate("createdBy", "name email");

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

