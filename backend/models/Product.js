const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
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
      enum: ["Positive Vibes", "Moody", "Sports", "Religious", "Entertainment", "Events", "Animal", "Pet", "Couple", "Anime", "Custom"],
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
