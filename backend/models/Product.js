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
      enum: ["Positive Vibes", "Moody", "Sports", "Religious", "Entertainment", "Events", "Animal", "Couple", "Anime", "Custom"],
      required: true,
    },
    image: {
      type: String,
      required: true,
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
  },
  {
    timestamps: true,
  }
);

// Add indexes for faster queries
ProductSchema.index({ category: 1, isActive: 1 }); // For category filtering
ProductSchema.index({ isActive: 1 }); // For active products
ProductSchema.index({ createdAt: -1 }); // For sorting by newest

module.exports = mongoose.model("Product", ProductSchema);
