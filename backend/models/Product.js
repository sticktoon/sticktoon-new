const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // What kind of product this is. Badges and stickers share one collection
    // but have separate category sets and storefront pages.
    type: {
      type: String,
      enum: ["badge", "sticker"],
      default: "badge",
      index: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        // Badge categories
        "Positive Vibes", "Moody", "Sports", "Religious", "Entertainment", "Events", "Animal", "Pet", "Couple", "Anime", "Custom",
        // Sticker categories (kebab ids, match STICKER_CATEGORIES in constants)
        "sticker-pack", "marvel", "dc-universe", "pet", "love", "anime", "cartoon", "sports", "random",
      ],
      required: true,
    },
    subcategory: {
      type: String,
      trim: true,
      default: "",
    },
    image: {
      type: String,
      required: true,
    },
    // Print-ready artwork. Shown ONLY to admins / attached to the order email
    // so the badge can be printed directly. Not exposed to customers.
    printImage: {
      type: String,
      default: "",
    },
    imageMagnetic: {
      type: String,
      required: false,
    },
    // Extra preview images shown as a gallery on the product detail page.
    images: {
      type: [String],
      default: [],
    },
    // Combo pack: one SKU bundling several badges. `comboItems` is the
    // customer-visible breakdown, snapshotted at save time so renaming a member
    // badge later does not rewrite what past orders say was in the box.
    isCombo: {
      type: Boolean,
      default: false,
    },
    comboItems: {
      type: [
        {
          _id: false,
          id: { type: String, required: true },
          name: { type: String, required: true },
          image: { type: String, default: "" },
        },
      ],
      default: [],
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    weight: {
      type: Number,
      default: 0.1,
    },
    length: {
      type: Number,
      default: 10,
    },
    width: {
      type: Number,
      default: 10,
    },
    height: {
      type: Number,
      default: 5,
    },
    sku: {
      type: String,
      default: "",
    },
    // Sticker-only display info (issue #20: "how many sticker? size width?").
    // size: physical dimensions e.g. "5×5 cm". packCount: stickers in a pack (0 = single).
    size: {
      type: String,
      default: "",
    },
    packCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes for faster queries
ProductSchema.index({ category: 1, isActive: 1 }); // For category filtering
ProductSchema.index({ category: 1, subcategory: 1, isActive: 1 }); // For category + subcategory filtering
ProductSchema.index({ isActive: 1 }); // For active products
ProductSchema.index({ createdAt: -1 }); // For sorting by newest

module.exports = mongoose.model("Product", ProductSchema);
