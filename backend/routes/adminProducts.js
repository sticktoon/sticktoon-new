const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Product = require("../models/Product");

// Admin only middleware
const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

const ALLOWED_CATEGORIES = [
  "Positive Vibes",
  "Moody",
  "Sports",
  "Religious",
  "Entertainment",
  "Events",
  "Pet",
  "Couple",
  "Anime",
  "Custom",
];

const normalizeCategory = (value) => {
  if (!value) return null;
  const trimmed = String(value).trim();
  const exact = ALLOWED_CATEGORIES.find((c) => c === trimmed);
  if (exact) return exact;

  const lower = trimmed.toLowerCase();
  const lookup = {
    "positive vibe": "Positive Vibes",
    "positive vibes": "Positive Vibes",
    "moody": "Moody",
    "sports": "Sports",
    "religious": "Religious",
    "entertainment": "Entertainment",
    "events": "Events",
    "pet": "Pet",
    "couple": "Couple",
    "anime": "Anime",
    "custom": "Custom",
  };

  return lookup[lower] || null;
};

/* ========================
   GET ALL PRODUCTS (WITH PAGINATION)
======================== */
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100; // Increased default limit
    const skip = (page - 1) * limit;
    const all = req.query.all === 'true';

    // Set cache headers for better performance
    res.set('Cache-Control', 'public, max-age=300'); // 5 minutes cache

    // Only select necessary fields for list view
    const selectFields = 'name price category image imageMagnetic description isActive stock';

    let query = Product.find({ isActive: true })
      .select(selectFields)
      .sort("-createdAt")
      .lean(); // Use lean() for faster reads

    if (!all) {
      query = query.skip(skip).limit(limit);
    }

    const products = await query;
    const total = await Product.countDocuments({ isActive: true });

    res.json({
      products,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================
   GET PRODUCTS BY CATEGORY (WITH PAGINATION)
======================== */
router.get("/category/:category", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50; // Increased limit
    const skip = (page - 1) * limit;

    // Set cache headers
    res.set('Cache-Control', 'public, max-age=300');

    const selectFields = 'name price category image imageMagnetic description isActive stock';

    const products = await Product.find({
      category: req.params.category,
      isActive: true,
    })
      .select(selectFields)
      .sort("-createdAt")
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Product.countDocuments({
      category: req.params.category,
      isActive: true,
    });

    res.json({
      products,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================
   GET SINGLE PRODUCT
======================== */
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================
   CREATE PRODUCT (ADMIN)
======================== */
router.post("/", auth, adminOnly, async (req, res) => {
  try {
    const { name, price, description, category, image, stock } = req.body;
    const normalizedCategory = normalizeCategory(category);

    // Validation
    if (!name || !price || !description || !category || !image) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (!normalizedCategory) {
      return res.status(400).json({ error: "Invalid category" });
    }

    const product = new Product({
      name,
      price: parseFloat(price),
      description,
      category: normalizedCategory,
      image,
      stock: parseInt(stock) || 0,
    });

    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================
   UPDATE PRODUCT (ADMIN)
======================== */
router.patch("/:id", auth, adminOnly, async (req, res) => {
  try {
    const { name, price, description, category, image, stock, isActive } =
      req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Update fields if provided
    if (name) product.name = name;
    if (price !== undefined) product.price = parseFloat(price);
    if (description) product.description = description;
    if (category) {
      const normalizedCategory = normalizeCategory(category);
      if (!normalizedCategory) {
        return res.status(400).json({ error: "Invalid category" });
      }
      product.category = normalizedCategory;
    }
    if (image) product.image = image;
    if (stock !== undefined) product.stock = parseInt(stock);
    if (isActive !== undefined) product.isActive = isActive;

    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================
   DELETE PRODUCT (ADMIN)
======================== */
router.delete("/:id", auth, adminOnly, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
