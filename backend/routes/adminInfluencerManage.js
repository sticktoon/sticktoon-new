const express = require("express");
const router = express.Router();
const User = require("../models/User");
const PromoCode = require("../models/PromoCode");
const InfluencerEarning = require("../models/InfluencerEarning");
const WithdrawalRequest = require("../models/WithdrawalRequest");
const auth = require("../middleware/auth");
const sendEmail = require("../utils/sendEmail");
const esc = require("../utils/escapeHtml");

const { adminOnly } = require("../middleware/roleMiddleware");

/* =========================
   GET ALL INFLUENCERS
========================= */
router.get("/", auth, adminOnly, async (req, res) => {
  try {
    const rawInfluencers = await User.find({ role: "influencer" })
      .populate("influencerProfile.promoCodeId")
      .sort({ createdAt: -1 })
      .lean();

    const influencerIds = rawInfluencers.map((i) => i._id);
    const allPromos = await PromoCode.find({
      $or: [
        { createdBy: { $in: influencerIds } },
        { assignedInfluencers: { $in: influencerIds } },
        { promoType: "influencer" }
      ]
    })
      .populate("assignedInfluencers", "name email")
      .populate("createdBy", "name email")
      .lean();

    const influencers = rawInfluencers.map((inf) => {
      const userPromos = allPromos.filter(
        (p) =>
          String(p.createdBy?._id || p.createdBy) === String(inf._id) ||
          (Array.isArray(p.assignedInfluencers) &&
            p.assignedInfluencers.some((ai) => String(ai._id || ai) === String(inf._id))) ||
          (inf.influencerProfile?.promoCodeId &&
            String(p._id) ===
              String(inf.influencerProfile.promoCodeId._id || inf.influencerProfile.promoCodeId))
      );
      return {
        ...inf,
        allPromoCodes: userPromos,
      };
    });

    res.json(influencers);
  } catch (err) {
    console.error("Get influencers error:", err);
    res.status(500).json({ message: "Failed to fetch influencers" });
  }
});

/* =========================
   GET PENDING APPROVALS
========================= */
router.get("/pending", auth, adminOnly, async (req, res) => {
  try {
    const pending = await User.find({
      role: "influencer",
      $or: [
        { "influencerProfile.applicationStatus": "pending" },
        {
          "influencerProfile.applicationStatus": { $exists: false },
          "influencerProfile.isApproved": false,
        },
      ],
    }).sort({ createdAt: -1 });

    res.json(pending);
  } catch (err) {
    console.error("Get pending error:", err);
    res.status(500).json({ message: "Failed to fetch pending" });
  }
});

/* =========================
   APPROVE INFLUENCER
========================= */
router.patch("/:id/approve", auth, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        "influencerProfile.isApproved": true,
        "influencerProfile.applicationStatus": "approved",
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "Influencer not found" });
    }

    // Send approval email
    try {
      await sendEmail({
        to: user.email,
        subject: "Your Influencer Account is Approved!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #10b981;">Congratulations, ${esc(user.name)}!</h1>
            <p>Your influencer account on StickToon has been approved.</p>
            <p>You can now:</p>
            <ul>
              <li>Create your unique promo code</li>
              <li>Share it with your followers</li>
              <li>Earn Rs5 for every sticker sold!</li>
            </ul>
            <a href="${process.env.FRONTEND_URL}/#/influencer/login" 
               style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">
              Login to Dashboard
            </a>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("Approval email error:", emailErr);
    }

    res.json({ message: "Influencer approved", user });
  } catch (err) {
    console.error("Approve error:", err);
    res.status(500).json({ message: "Failed to approve" });
  }
});

/* =========================
   REJECT INFLUENCER
========================= */
router.patch("/:id/reject", auth, adminOnly, async (req, res) => {
  try {
    const { reason } = req.body || {};

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        "influencerProfile.isApproved": false,
        "influencerProfile.applicationStatus": "rejected",
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "Influencer not found" });
    }

    // Send rejection email
    try {
      await sendEmail({
        to: user.email,
        subject: "Influencer Application Update",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #ef4444;">Application Not Approved</h1>
            <p>Hi ${esc(user.name)},</p>
            <p>Unfortunately, your influencer application was not approved at this time.</p>
            ${reason ? `<p><strong>Reason:</strong> ${esc(reason)}</p>` : ""}
            <p>You can try again later or contact us for more information.</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("Rejection email error:", emailErr);
    }

    res.json({ message: "Influencer rejected", user });
  } catch (err) {
    console.error("Reject error:", err);
    res.status(500).json({ message: "Failed to reject" });
  }
});

/* =========================
   STATS OVERVIEW
========================= */
router.get("/stats/overview", auth, adminOnly, async (req, res) => {
  try {
    const totalInfluencers = await User.countDocuments({ role: "influencer" });
    const approvedInfluencers = await User.countDocuments({
      role: "influencer",
      "influencerProfile.isApproved": true,
    });
    const pendingApprovals = await User.countDocuments({
      role: "influencer",
      $or: [
        { "influencerProfile.applicationStatus": "pending" },
        {
          "influencerProfile.applicationStatus": { $exists: false },
          "influencerProfile.isApproved": false,
        },
      ],
    });

    const earningsStats = await InfluencerEarning.aggregate([
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: "$totalEarning" },
          totalUnits: { $sum: "$totalUnits" },
          totalOrders: { $sum: 1 },
        },
      },
    ]);

    const pendingWithdrawals = await WithdrawalRequest.aggregate([
      { $match: { status: "pending" } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]);

    res.json({
      totalInfluencers,
      approvedInfluencers,
      pendingApprovals,
      earnings: earningsStats[0] || { totalEarnings: 0, totalUnits: 0, totalOrders: 0 },
      pendingWithdrawals: pendingWithdrawals[0] || { total: 0, count: 0 },
    });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ message: "Failed to get stats" });
  }
});

/* =========================
   GET ALL WITHDRAWAL REQUESTS
========================= */
router.get("/withdrawals/all", auth, adminOnly, async (req, res) => {
  try {
    const { status } = req.query;

    const query = {};
    if (status) query.status = status;

    const withdrawals = await WithdrawalRequest.find(query)
      .populate("influencerId", "name email influencerProfile")
      .sort({ createdAt: -1 });

    res.json(withdrawals);
  } catch (err) {
    console.error("Get withdrawals error:", err);
    res.status(500).json({ message: "Failed to fetch withdrawals" });
  }
});

/* =========================
   GET INFLUENCER DETAILS
========================= */
router.get("/:id", auth, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate("influencerProfile.promoCodeId");

    if (!user || user.role !== "influencer") {
      return res.status(404).json({ message: "Influencer not found" });
    }

    // Get earnings
    const earnings = await InfluencerEarning.find({ influencerId: req.params.id })
      .populate("orderId", "amount status createdAt")
      .populate("customerId", "name email")
      .sort({ createdAt: -1 })
      .limit(50);

    // Get all promo codes assigned/created by this influencer
    const promoCodes = await PromoCode.find({
      $or: [
        { createdBy: user._id },
        { _id: user.influencerProfile?.promoCodeId }
      ]
    }).sort({ createdAt: -1 });

    res.json({ user, earnings, withdrawals, promoCodes });
  } catch (err) {
    console.error("Get influencer error:", err);
    res.status(500).json({ message: "Failed to fetch influencer" });
  }
});

/* =========================
   PROCESS WITHDRAWAL
========================= */
router.patch("/withdrawals/:id/process", auth, adminOnly, async (req, res) => {
  try {
    const { status, transactionId, adminNote, upiId } = req.body;

    if (!["pending", "approved", "rejected", "paid"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const withdrawal = await WithdrawalRequest.findById(req.params.id)
      .populate("influencerId", "name email influencerProfile");

    if (!withdrawal) {
      return res.status(404).json({ message: "Withdrawal not found" });
    }

    // Allow updating/correcting UPI ID
    if (upiId && String(upiId).trim()) {
      withdrawal.paymentDetails = withdrawal.paymentDetails || {};
      withdrawal.paymentDetails.upiId = String(upiId).trim();
      await User.findByIdAndUpdate(withdrawal.influencerId._id, {
        "influencerProfile.upiId": String(upiId).trim(),
      });
    }

    const previousStatus = withdrawal.status;
    withdrawal.status = status;
    withdrawal.adminNote = adminNote || "";
    withdrawal.processedAt = status === "pending" ? null : new Date();
    withdrawal.processedBy = status === "pending" ? null : req.user.id;

    if (transactionId) {
      withdrawal.transactionId = transactionId;
    } else if (status === "pending") {
      withdrawal.transactionId = null;
    }

    await withdrawal.save();

    // If paid, update user's withdrawn amount
    if (status === "paid") {
      await User.findByIdAndUpdate(withdrawal.influencerId._id, {
        $inc: { "influencerProfile.withdrawnAmount": withdrawal.amount },
      });

      // Send payment confirmation email
      try {
        await sendEmail({
          to: withdrawal.influencerId.email,
          subject: `Payment of Rs${withdrawal.amount} Processed!`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #10b981;">Payment Successful!</h1>
              <p>Hi ${esc(withdrawal.influencerId.name)},</p>
              <p>Your withdrawal request has been processed.</p>
              <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-size: 24px; font-weight: bold; color: #10b981;">Rs${withdrawal.amount}</p>
                <p style="margin: 5px 0 0; color: #6b7280;">Transaction ID: ${esc(transactionId || "N/A")}</p>
              </div>
              <p>Thank you for being a StickToon influencer!</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("Payment email error:", emailErr);
      }
    }

    // If rejected, refund the pending amount
    if (status === "rejected" && previousStatus === "pending") {
      await User.findByIdAndUpdate(withdrawal.influencerId._id, {
        $inc: { "influencerProfile.pendingEarnings": withdrawal.amount },
      });
    }

    res.json({ message: `Withdrawal ${status}`, withdrawal });
  } catch (err) {
    console.error("Process withdrawal error:", err);
    res.status(500).json({ message: "Failed to process" });
  }
});

/* =========================
   UPDATE EARNING PER UNIT
========================= */
router.patch("/:id/earning-rate", auth, adminOnly, async (req, res) => {
  try {
    const { earningPerUnit } = req.body;

    const user = await User.findById(req.params.id);
    if (!user || user.role !== "influencer") {
      return res.status(404).json({ message: "Influencer not found" });
    }

    // Update promo code earning rate
    if (user.influencerProfile?.promoCodeId) {
      await PromoCode.findByIdAndUpdate(user.influencerProfile.promoCodeId, {
        earningPerUnit,
      });
    }

    res.json({ message: "Earning rate updated" });
  } catch (err) {
    console.error("Update earning rate error:", err);
    res.status(500).json({ message: "Failed to update" });
  }
});

/* =========================
   ASSIGN / EDIT INFLUENCER PROMO CODE
========================= */
router.patch("/:id/assign-promo", auth, adminOnly, async (req, res) => {
  try {
    const { promoCodeId, code, discountType, discountValue, earningPerUnit, validUntil } = req.body;

    const user = await User.findById(req.params.id);
    if (!user || user.role !== "influencer") {
      return res.status(404).json({ message: "Influencer not found" });
    }

    let promo;

    if (promoCodeId) {
      // Assigning an existing promo code by ID
      promo = await PromoCode.findById(promoCodeId);
      if (!promo) {
        return res.status(404).json({ message: "Promo code not found" });
      }
      promo.promoType = "influencer";
      if (!promo.assignedInfluencers.some((id) => String(id._id || id) === String(user._id))) {
        promo.assignedInfluencers.push(user._id);
      }
      await promo.save();
    } else {
      const cleanCode = code ? code.toUpperCase().trim() : `INF_${user.name.replace(/\s+/g, "").toUpperCase()}`;

      // Check if code already exists
      const existing = await PromoCode.findOne({ code: cleanCode });

      if (existing) {
        existing.discountType = discountType || existing.discountType || "percentage";
        existing.discountValue = discountValue !== undefined ? discountValue : existing.discountValue;
        existing.earningPerUnit = earningPerUnit !== undefined ? earningPerUnit : existing.earningPerUnit;
        if (validUntil) existing.validUntil = validUntil;
        existing.isActive = true;
        existing.promoType = "influencer";
        if (!existing.assignedInfluencers.some((id) => String(id._id || id) === String(user._id))) {
          existing.assignedInfluencers.push(user._id);
        }
        await existing.save();
        promo = existing;
      } else {
        const farFuture = new Date();
        farFuture.setFullYear(farFuture.getFullYear() + 5);

        promo = await PromoCode.create({
          code: cleanCode,
          promoType: "influencer",
          discountType: discountType || "percentage",
          discountValue: discountValue !== undefined ? discountValue : 10,
          earningPerUnit: earningPerUnit !== undefined ? earningPerUnit : 5,
          validUntil: validUntil || farFuture,
          createdBy: user._id,
          assignedInfluencers: [user._id],
          isActive: true,
        });
      }
    }

    // Link to user profile
    user.influencerProfile = user.influencerProfile || {};
    user.influencerProfile.promoCodeId = promo._id;
    await user.save();

    const populatedPromo = await PromoCode.findById(promo._id)
      .populate("assignedInfluencers", "name email")
      .populate("createdBy", "name email");

    res.json({ message: "Promo code assigned successfully", promo: populatedPromo, user });
  } catch (err) {
    console.error("Assign promo error:", err);
    res.status(500).json({ message: "Failed to assign promo code" });
  }
});

/* =========================
   UNASSIGN / REMOVE INFLUENCER PROMO CODE
   (Disassociates the promo code from the influencer without deleting the promo code itself)
========================= */
router.post("/:id/unassign-promo", auth, adminOnly, async (req, res) => {
  try {
    const { promoId } = req.body;
    if (!promoId) {
      return res.status(400).json({ message: "Promo code ID is required" });
    }

    const user = await User.findById(req.params.id);
    if (!user || user.role !== "influencer") {
      return res.status(404).json({ message: "Influencer not found" });
    }

    const promo = await PromoCode.findById(promoId);
    if (!promo) {
      return res.status(404).json({ message: "Promo code not found" });
    }

    // Remove influencer from promo's assignedInfluencers list
    promo.assignedInfluencers = (promo.assignedInfluencers || []).filter(
      (id) => String(id._id || id) !== String(user._id)
    );

    if (String(promo.createdBy) === String(user._id)) {
      promo.createdBy = null;
    }

    await promo.save();

    // If this promo code was set on the user profile, update it to remaining promo or null
    if (user.influencerProfile?.promoCodeId?.toString() === String(promo._id)) {
      const remainingPromo = await PromoCode.findOne({
        $or: [
          { assignedInfluencers: user._id },
          { createdBy: user._id },
        ],
      });
      user.influencerProfile.promoCodeId = remainingPromo?._id || null;
      await user.save();
    }

    res.json({ message: `Promo code '${promo.code}' unassigned from ${user.name}` });
  } catch (err) {
    console.error("Unassign promo error:", err);
    res.status(500).json({ message: "Failed to unassign promo code" });
  }
});

module.exports = router;
