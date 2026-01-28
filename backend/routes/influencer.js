const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const PromoCode = require("../models/PromoCode");
const InfluencerEarning = require("../models/InfluencerEarning");
const WithdrawalRequest = require("../models/WithdrawalRequest");
const auth = require("../middleware/auth");
const sendEmail = require("../utils/sendEmail");

/* Influencer only middleware */
const influencerOnly = (req, res, next) => {
  if (req.user.role !== "influencer") {
    return res.status(403).json({ message: "Influencer access only" });
  }
  next();
};

/* =========================
   INFLUENCER SIGNUP
========================= */
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, phone, instagram, youtube, bio } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create influencer user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "influencer",
      provider: "credentials",
      influencerProfile: {
        isApproved: true, // Auto-approved - no admin approval needed
        phone,
        instagram,
        youtube,
        bio,
        totalEarnings: 0,
        pendingEarnings: 0,
        withdrawnAmount: 0,
        minWithdrawalAmount: 100,
      },
    });

    // Generate token so user can login immediately
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Influencer account created successfully!",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        influencerProfile: user.influencerProfile,
      },
    });
  } catch (err) {
    console.error("Influencer signup error:", err);
    res.status(500).json({ message: "Failed to create account" });
  }
});

/* =========================
   INFLUENCER LOGIN
========================= */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // Find influencer
    const user = await User.findOne({
      email: email.toLowerCase(),
      role: "influencer",
    }).select("+password");

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials or not an influencer account" });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        influencerProfile: user.influencerProfile,
      },
    });
  } catch (err) {
    console.error("Influencer login error:", err);
    res.status(500).json({ message: "Login failed" });
  }
});

/* =========================
   GET INFLUENCER PROFILE
========================= */
router.get("/profile", auth, influencerOnly, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate("influencerProfile.promoCodeId");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      influencerProfile: user.influencerProfile,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ message: "Failed to get profile" });
  }
});

/* =========================
   UPDATE PAYMENT DETAILS
========================= */
router.put("/payment-details", auth, influencerOnly, async (req, res) => {
  try {
    const { upiId, bankDetails, phone } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        "influencerProfile.upiId": upiId,
        "influencerProfile.bankDetails": bankDetails,
        "influencerProfile.phone": phone,
      },
      { new: true }
    );

    res.json({
      message: "Payment details updated",
      influencerProfile: user.influencerProfile,
    });
  } catch (err) {
    console.error("Update payment details error:", err);
    res.status(500).json({ message: "Failed to update" });
  }
});

/* =========================
   CREATE PROMO CODE
========================= */
router.post("/create-promo", auth, influencerOnly, async (req, res) => {
  try {
    const { code, discountType, discountValue, description } = req.body;

    const user = await User.findById(req.user.id);

    // Check if influencer already has 2 promo codes (limit)
    const existingPromos = await PromoCode.countDocuments({ createdBy: req.user.id });
    if (existingPromos >= 2) {
      return res.status(400).json({
        message: "You can only have 2 promo codes. Delete an existing one or contact admin.",
      });
    }

    if (!code) {
      return res.status(400).json({ message: "Promo code is required" });
    }

    // Validate discount - only 5%, 10%, 15%, or 99% allowed for influencers
    const allowedDiscounts = [5, 10, 15, 99];
    const discount = parseInt(discountValue) || 10;
    if (!allowedDiscounts.includes(discount)) {
      return res.status(400).json({ message: "Discount must be 5%, 10%, 15%, or 99%" });
    }

    // Check if code exists
    const existing = await PromoCode.findOne({ code: code.toUpperCase().trim() });
    if (existing) {
      return res.status(400).json({ message: "This promo code already exists. Try another." });
    }

    // Create promo code
    const promo = await PromoCode.create({
      code: code.toUpperCase().trim(),
      promoType: "influencer",
      discountType: "percentage", // Always percentage for influencers
      discountValue: discount, // Only 5, 10, 15 or 99
      minOrderAmount: 0,
      maxDiscount: null,
      usageLimit: null,
      validFrom: new Date(),
      validUntil: new Date("2030-12-31"), // Long validity
      description: description || `${user.name}'s promo code`,
      earningPerUnit: 5, // ₹5 per unit
      createdBy: user._id,
      isActive: true,
    });

    // Link promo to user (keep for backwards compatibility)
    await User.findByIdAndUpdate(req.user.id, {
      "influencerProfile.promoCodeId": promo._id,
    });

    res.status(201).json({
      message: "Promo code created successfully!",
      promo: promo,
    });
  } catch (err) {
    console.error("Create promo error:", err);
    res.status(500).json({ message: "Failed to create promo code" });
  }
});

/* =========================
   GET MY PROMO CODES (all promo codes by this influencer)
========================= */
router.get("/my-promo", auth, influencerOnly, async (req, res) => {
  try {
    // Get all promo codes created by this influencer
    const promos = await PromoCode.find({ createdBy: req.user.id }).sort({ createdAt: -1 });
    
    // For backwards compatibility, also return single promo
    res.json({ 
      promo: promos.length > 0 ? promos[0] : null,
      promos: promos,
      count: promos.length,
      maxAllowed: 2
    });
  } catch (err) {
    console.error("Get promo error:", err);
    res.status(500).json({ message: "Failed to get promo codes" });
  }
});

/* =========================
   DELETE PROMO CODE
========================= */
router.delete("/delete-promo/:promoId", auth, influencerOnly, async (req, res) => {
  try {
    const { promoId } = req.params;
    
    // Find promo and verify ownership
    const promo = await PromoCode.findById(promoId);
    
    if (!promo) {
      return res.status(404).json({ message: "Promo code not found" });
    }
    
    // Check if this influencer owns this promo
    if (promo.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only delete your own promo codes" });
    }
    
    // Delete the promo code
    await PromoCode.findByIdAndDelete(promoId);
    
    // If this was the user's linked promo, unlink it
    const user = await User.findById(req.user.id);
    if (user.influencerProfile?.promoCodeId?.toString() === promoId) {
      // Link to another promo if exists, otherwise null
      const remainingPromo = await PromoCode.findOne({ createdBy: req.user.id });
      await User.findByIdAndUpdate(req.user.id, {
        "influencerProfile.promoCodeId": remainingPromo?._id || null,
      });
    }
    
    res.json({ success: true, message: "Promo code deleted successfully" });
  } catch (err) {
    console.error("Delete promo error:", err);
    res.status(500).json({ message: "Failed to delete promo code" });
  }
});

/* =========================
   GET EARNINGS DASHBOARD
========================= */
router.get("/earnings", auth, influencerOnly, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    // Get all promo codes for this influencer
    const promoCodes = await PromoCode.find({ createdBy: req.user.id });
    
    // For backward compatibility, also return single promoCode (first one)
    const promoCode = promoCodes.length > 0 ? promoCodes[0] : null;

    // Get earnings history
    const earnings = await InfluencerEarning.find({ influencerId: req.user.id })
      .populate("orderId", "amount status createdAt")
      .populate("customerId", "name email")
      .sort({ createdAt: -1 })
      .limit(50);

    // Calculate totals
    const totals = await InfluencerEarning.aggregate([
      { $match: { influencerId: user._id } },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: "$totalEarning" },
          totalUnits: { $sum: "$totalUnits" },
          totalOrders: { $sum: 1 },
        },
      },
    ]);

    const stats = totals[0] || { totalEarnings: 0, totalUnits: 0, totalOrders: 0 };

    // Calculate withdrawnAmount as sum of all paid influencer earnings
    const paidEarnings = await InfluencerEarning.aggregate([
      { $match: { influencerId: user._id, status: "paid" } },
      { $group: { _id: null, withdrawnAmount: { $sum: "$totalEarning" } } }
    ]);
    const withdrawnAmount = paidEarnings[0]?.withdrawnAmount || 0;

    // Calculate availableToWithdraw: sum of all paid earnings - sum of all withdrawals (pending/approved/paid)
    const paidEarningsSum = await InfluencerEarning.aggregate([
      { $match: { influencerId: user._id, status: "paid" } },
      { $group: { _id: null, total: { $sum: "$totalEarning" } } }
    ]);
    const totalPaidEarnings = paidEarningsSum[0]?.total || 0;

    // Sum of all withdrawal requests (pending/approved/paid) - all active withdrawals
    const withdrawals = await WithdrawalRequest.find({ influencerId: user._id, status: { $in: ["pending", "approved", "paid"] } });
    const totalWithdrawRequested = withdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);

    const availableToWithdraw = totalPaidEarnings - totalWithdrawRequested;

    res.json({
      totalEarnings: user.influencerProfile?.totalEarnings || stats.totalEarnings || 0,
      pendingEarnings: user.influencerProfile?.pendingEarnings || 0,
      withdrawnAmount,
      minWithdrawalAmount: user.influencerProfile?.minWithdrawalAmount || 100,
      totalOrders: stats.totalOrders,
      totalUnits: stats.totalUnits,
      recentEarnings: earnings,
      promoCode: promoCode,
      promoCodes: promoCodes,
      availableToWithdraw,
    });
  } catch (err) {
    console.error("Get earnings error:", err);
    res.status(500).json({ message: "Failed to get earnings" });
  }
});

/* =========================
   REQUEST WITHDRAWAL
========================= */
router.post("/withdraw", auth, influencerOnly, async (req, res) => {
  try {
    const { amount, paymentMethod, paymentDetails } = req.body;

    const user = await User.findById(req.user.id);
    const minAmount = user.influencerProfile?.minWithdrawalAmount || 100;

    // Normalize payment method for backward compatibility
    const normalizedPaymentMethod = paymentMethod === "bank" ? "bank_transfer" : paymentMethod;

    // Calculate availableToWithdraw: sum of all paid earnings - sum of all withdrawals (pending/approved)
    const paidEarningsSum = await InfluencerEarning.aggregate([
      { $match: { influencerId: user._id, status: "paid" } },
      { $group: { _id: null, total: { $sum: "$totalEarning" } } }
    ]);
    const totalPaidEarnings = paidEarningsSum[0]?.total || 0;

    const withdrawals = await WithdrawalRequest.find({
      influencerId: user._id,
      status: { $in: ["pending", "approved"] }
    });
    const totalWithdrawRequested = withdrawals.reduce(
      (sum, w) => sum + (w.amount || 0),
      0
    );
    const availableToWithdraw = totalPaidEarnings - totalWithdrawRequested;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    if (amount > availableToWithdraw) {
      return res.status(400).json({
        message: `Insufficient balance. Available: ₹${availableToWithdraw}`,
      });
    }

    if (amount < minAmount) {
      return res.status(400).json({
        message: `Minimum withdrawal amount is ₹${minAmount}`,
      });
    }

    if (!normalizedPaymentMethod) {
      return res.status(400).json({ message: "Payment method required" });
    }

    // Create withdrawal request
    const withdrawal = await WithdrawalRequest.create({
      influencerId: req.user.id,
      amount,
      paymentMethod: normalizedPaymentMethod,
      paymentDetails,
      status: "pending",
    });

    // Notify admin via email
    const adminEmail = process.env.ADMIN_EMAIL || process.env.FROM_EMAIL || "sticktoon.xyz@gmail.com";
    try {
      await sendEmail({
        to: adminEmail,
        subject: `New Withdrawal Request: ₹${amount}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #7c3aed;">New Influencer Withdrawal Request</h2>
            <p><strong>Influencer:</strong> ${user.name} (${user.email})</p>
            <p><strong>Amount:</strong> ₹${amount}</p>
            <p><strong>Method:</strong> ${normalizedPaymentMethod}</p>
            <p><strong>Requested At:</strong> ${new Date().toLocaleString()}</p>
            <h3 style="margin-top: 20px;">Payment Details</h3>
            <pre style="background: #f3f4f6; padding: 12px; border-radius: 8px; overflow-x: auto;">${JSON.stringify(paymentDetails || {}, null, 2)}</pre>
            <p style="margin-top: 20px;">Please review and process this request in the admin panel.</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("Withdrawal email error:", emailErr);
    }

    res.status(201).json({
      message: "Withdrawal request submitted! It will be processed within 3-5 business days.",
      withdrawal,
    });
  } catch (err) {
    console.error("Withdrawal error:", err);
    res.status(500).json({ message: "Failed to submit withdrawal request" });
  }
});

/* =========================
   GET WITHDRAWAL HISTORY
========================= */
router.get("/withdrawals", auth, influencerOnly, async (req, res) => {
  try {
    const withdrawals = await WithdrawalRequest.find({ influencerId: req.user.id })
      .sort({ createdAt: -1 });

    res.json({ withdrawals });
  } catch (err) {
    console.error("Get withdrawals error:", err);
    res.status(500).json({ message: "Failed to get withdrawals" });
  }
});

module.exports = router;
