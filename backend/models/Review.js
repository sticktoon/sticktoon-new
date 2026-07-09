const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema(
  {
    // A String, not an ObjectId: reviewable products come from three places —
    // Mongo `Product` documents (ObjectId hex), the hardcoded badges in
    // constants.tsx, and the hardcoded stickers ("sticker-1"). Orders already
    // store the same loose id in `items.badgeId`, so this matches how a
    // purchase is recorded.
    productId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userName: {
      type: String,
      trim: true,
      default: "",
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

// One review per user per product; resubmitting updates it instead of duplicating.
ReviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Review", ReviewSchema);
