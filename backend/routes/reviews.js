const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Review = require("../models/Review");
const Order = require("../models/Order");
const User = require("../models/User");

// Mirrors the linked-account + dedupe logic in routes/userOrders.js so that
// legacy/duplicate accounts sharing an email are all checked for a purchase.
async function userHasPurchasedProduct(userId, productId) {
  const currentUser = await User.findById(userId);
  if (!currentUser) return false;

  const linkedUsers = await User.find({ email: currentUser.email }).select("_id");
  const userIds = linkedUsers.map((u) => u._id);

  const order = await Order.findOne({
    userId: { $in: userIds },
    "items.badgeId": String(productId),
    status: "SUCCESS",
  });

  return !!order;
}

/* ===============================
   GET REVIEWS FOR A PRODUCT (Public)
================================ */
router.get("/:productId", async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.productId })
      .sort({ createdAt: -1 })
      .lean();

    const count = reviews.length;
    const average = count
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / count
      : 0;

    res.json({ reviews, average, count });
  } catch (err) {
    console.error("Fetch reviews error:", err);
    res.status(500).json({ message: "Failed to fetch reviews" });
  }
});

/* ===============================
   CHECK REVIEW ELIGIBILITY (Auth)
================================ */
router.get("/:productId/eligibility", auth, async (req, res) => {
  try {
    const canReview = await userHasPurchasedProduct(req.user.id, req.params.productId);
    const myReview = await Review.findOne({
      productId: req.params.productId,
      userId: req.user.id,
    }).lean();

    res.json({ canReview, myReview: myReview || null });
  } catch (err) {
    console.error("Review eligibility error:", err);
    res.status(500).json({ message: "Failed to check review eligibility" });
  }
});

/* ===============================
   CREATE / UPDATE REVIEW (Auth + Verified Purchase)
================================ */
router.post("/:productId", auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const numericRating = Number(rating);

    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const canReview = await userHasPurchasedProduct(req.user.id, req.params.productId);
    if (!canReview) {
      return res.status(403).json({
        message: "Only customers who have ordered this product can leave a review",
      });
    }

    const user = await User.findById(req.user.id);

    const review = await Review.findOneAndUpdate(
      { productId: req.params.productId, userId: req.user.id },
      {
        productId: req.params.productId,
        userId: req.user.id,
        userName: user?.name || "",
        rating: numericRating,
        comment: comment ? String(comment).trim().slice(0, 1000) : "",
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(201).json(review);
  } catch (err) {
    console.error("Create review error:", err);
    res.status(500).json({ message: "Failed to save review" });
  }
});

module.exports = router;
