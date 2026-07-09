const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Review = require("../models/Review");
const Order = require("../models/Order");
const User = require("../models/User");
const { logActivity } = require("../utils/activityLogger");

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
   BULK RATING SUMMARY (Public)

   GET /api/reviews/summary?ids=a,b,c
   Lets listing pages show stars without one request per card.

   Declared before "/:productId" so that "summary" is not read as an id.
================================ */
router.get("/summary", async (req, res) => {
  try {
    const ids = String(req.query.ids || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, 200); // cap the fan-out

    if (!ids.length) return res.json({});

    const rows = await Review.aggregate([
      { $match: { productId: { $in: ids } } },
      {
        $group: {
          _id: "$productId",
          average: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Shape: { [productId]: { average, count } } — products with no reviews
    // are simply absent, and the client treats that as zero.
    const summary = {};
    rows.forEach((row) => {
      summary[row._id] = {
        average: Math.round(row.average * 10) / 10,
        count: row.count,
      };
    });

    res.json(summary);
  } catch (err) {
    console.error("Review summary error:", err);
    res.status(500).json({ message: "Failed to fetch review summary" });
  }
});

/* ===============================
   GET REVIEWS FOR A PRODUCT (Public)
================================ */
router.get("/:productId", async (req, res) => {
  try {
    const reviews = await Review.find({ productId: String(req.params.productId) })
      .sort({ createdAt: -1 })
      .lean();

    const count = reviews.length;
    const average = count
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / count
      : 0;

    res.json({
      reviews,
      average: Math.round(average * 10) / 10,
      count,
    });
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
      productId: String(req.params.productId),
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
    const productId = String(req.params.productId);

    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const canReview = await userHasPurchasedProduct(req.user.id, productId);
    if (!canReview) {
      return res.status(403).json({
        message: "Only customers who have ordered this product can leave a review",
      });
    }

    const user = await User.findById(req.user.id);
    const existing = await Review.findOne({ productId, userId: req.user.id }).lean();

    const review = await Review.findOneAndUpdate(
      { productId, userId: req.user.id },
      {
        productId,
        userId: req.user.id,
        userName: user?.name || "",
        rating: numericRating,
        comment: comment ? String(comment).trim().slice(0, 1000) : "",
      },
      { upsert: true, new: true, runValidators: true }
    );

    logActivity({
      req,
      actor: { id: req.user.id, name: user?.name, email: user?.email, role: req.user.role },
      action: existing ? "review.update" : "review.create",
      category: "review",
      message: `${user?.email || "A customer"} rated product ${productId} ${numericRating}/5`,
      target: { type: "Product", id: productId, label: productId },
      meta: { rating: numericRating, hasComment: Boolean(review.comment) },
    });

    res.status(201).json(review);
  } catch (err) {
    console.error("Create review error:", err);
    res.status(500).json({ message: "Failed to save review" });
  }
});

/* ===============================
   DELETE OWN REVIEW (Auth)
================================ */
router.delete("/:productId", auth, async (req, res) => {
  try {
    const productId = String(req.params.productId);
    const review = await Review.findOneAndDelete({ productId, userId: req.user.id });

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    logActivity({
      req,
      action: "review.delete",
      category: "review",
      message: `Deleted own review for product ${productId}`,
      target: { type: "Product", id: productId, label: productId },
    });

    res.json({ message: "Review deleted" });
  } catch (err) {
    console.error("Delete review error:", err);
    res.status(500).json({ message: "Failed to delete review" });
  }
});

module.exports = router;
