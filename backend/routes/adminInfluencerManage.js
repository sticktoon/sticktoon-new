const express = require("express");
const router = express.Router();
const User = require("../models/User");
const PromoCode = require("../models/PromoCode");
const InfluencerEarning = require("../models/InfluencerEarning");
const WithdrawalRequest = require("../models/WithdrawalRequest");
const auth = require("../middleware/auth");
const sendEmail = require("../utils/sendEmail");

/* Admin only middleware */
const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }
  next();
};

/* =========================
   GET ALL INFLUENCERS
========================= */
router.get("/", auth, adminOnly, async (req, res) => {
  try {
    const influencers = await User.find({ role: "influencer" })
      .populate("influencerProfile.promoCodeId")
      .sort({ createdAt: -1 });

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
      "influencerProfile.isApproved": false,
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
      { "influencerProfile.isApproved": true },
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
            <h1 style="color: #10b981;">Congratulations, ${user.name}!</h1>
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
    const { reason } = req.body;

    const user = await User.findByIdAndDelete(req.params.id);

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
            <p>Hi ${user.name},</p>
            <p>Unfortunately, your influencer application was not approved at this time.</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
            <p>You can try again later or contact us for more information.</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("Rejection email error:", emailErr);
    }

    res.json({ message: "Influencer rejected and removed" });
  } catch (err) {
    console.error("Reject error:", err);
    res.status(500).json({ message: "Failed to reject" });
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

    // Get withdrawals
    const withdrawals = await WithdrawalRequest.find({ influencerId: req.params.id })
      .sort({ createdAt: -1 });

    res.json({ user, earnings, withdrawals });
  } catch (err) {
    console.error("Get influencer error:", err);
    res.status(500).json({ message: "Failed to fetch influencer" });
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
   PROCESS WITHDRAWAL
========================= */
router.patch("/withdrawals/:id/process", auth, adminOnly, async (req, res) => {
  try {
    const { status, transactionId, adminNote } = req.body;

    if (!["approved", "rejected", "paid"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const withdrawal = await WithdrawalRequest.findById(req.params.id)
      .populate("influencerId", "name email influencerProfile");

    if (!withdrawal) {
      return res.status(404).json({ message: "Withdrawal not found" });
    }

    const previousStatus = withdrawal.status;
    withdrawal.status = status;
    withdrawal.adminNote = adminNote || "";
    withdrawal.processedAt = new Date();
    withdrawal.processedBy = req.user.id;

    if (transactionId) {
      withdrawal.transactionId = transactionId;
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
              <p>Hi ${withdrawal.influencerId.name},</p>
              <p>Your withdrawal request has been processed.</p>
              <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-size: 24px; font-weight: bold; color: #10b981;">Rs${withdrawal.amount}</p>
                <p style="margin: 5px 0 0; color: #6b7280;">Transaction ID: ${transactionId || "N/A"}</p>
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
      "influencerProfile.isApproved": false,
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

module.exports = router;
