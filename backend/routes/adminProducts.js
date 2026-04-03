const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Product = require("../models/Product");

const { adminOnly } = require("../middleware/roleMiddleware");

const ALLOWED_CATEGORIES = [
  "Positive Vibes",
  "Moody",
  "Sports",
  "Religious",
  "Entertainment",
  "Events",
  "Animal",
  "Couple",
  "Anime",
  "Custom",
];

const normalizeCategory = (value) => {
  if (!value) return null;
  const trimmed = String(value).trim();
  const lower = trimmed.toLowerCase();
  const lookup = {
    "positive vibe": "Positive Vibes",
    "positive vibes": "Positive Vibes",
    "positive-vibes": "Positive Vibes",
    positive_vibes: "Positive Vibes",
    "moody": "Moody",
    "sports": "Sports",
    "religious": "Religious",
    "entertainment": "Entertainment",
    "events": "Events",
    "animal": "Animal",
    "pet": "Animal",
    "couple": "Couple",
    "anime": "Anime",
    "custom": "Custom",
  };

  if (lookup[lower]) return lookup[lower];

  const exact = ALLOWED_CATEGORIES.find((c) => c.toLowerCase() === lower);
  return exact || null;
};

const SUBCATEGORY_MAX_LENGTH = 60;
const normalizeSubcategory = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim().slice(0, SUBCATEGORY_MAX_LENGTH);
};

/* ========================
   GET ALL PRODUCTS (WITH PAGINATION)
======================== */
// In-memory product cache
let productCache = null;
let productCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const invalidateProductCache = () => {
  productCache = null;
  productCacheTime = 0;
};

router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;
    const all = req.query.all === 'true';

    // Set cache headers for better performance
    res.set('Cache-Control', 'public, max-age=300');

    const selectFields = 'name price category subcategory image imageMagnetic description isActive stock';

    // Use server-side cache for "all" queries
    if (all && productCache && (Date.now() - productCacheTime < CACHE_TTL)) {
      return res.json({
        products: productCache,
        pagination: { total: productCache.length, page: 1, limit: productCache.length, pages: 1 },
      });
    }

    let query = Product.find({ isActive: true })
      .select(selectFields)
      .sort("-createdAt")
      .lean();

    if (!all) {
      query = query.skip(skip).limit(limit);
    }

    // Run find and count in parallel
    const [products, total] = await Promise.all([
      query,
      Product.countDocuments({ isActive: true }),
    ]);

    // Cache the "all" result
    if (all) {
      productCache = products;
      productCacheTime = Date.now();
    }

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

    const selectFields = 'name price category subcategory image imageMagnetic description isActive stock';

    const normalizedCategory = normalizeCategory(req.params.category);
    if (!normalizedCategory) {
      return res.status(400).json({ error: "Invalid category" });
    }

    const normalizedSubcategory = normalizeSubcategory(req.query.subcategory);

    const filter = { category: normalizedCategory, isActive: true };
    if (normalizedSubcategory) {
      filter.subcategory = normalizedSubcategory;
    }

    // Run find and count in parallel
    const [products, total] = await Promise.all([
      Product.find(filter)
        .select(selectFields)
        .sort("-createdAt")
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

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
    res.set('Cache-Control', 'public, max-age=300');
    const product = await Product.findById(req.params.id).lean();
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
    const { name, price, description, category, subcategory, image, stock } = req.body;
    const normalizedCategory = normalizeCategory(category);
    const normalizedSubcategory = normalizeSubcategory(subcategory);

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
      subcategory: normalizedSubcategory,
      image,
      stock: parseInt(stock) || 0,
    });

    await product.save();
    invalidateProductCache();
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
    const { name, price, description, category, subcategory, image, stock, isActive } =
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
    if (subcategory !== undefined) {
      product.subcategory = normalizeSubcategory(subcategory);
    }
    if (image) product.image = image;
    if (stock !== undefined) product.stock = parseInt(stock);
    if (isActive !== undefined) product.isActive = isActive;

    await product.save();
    invalidateProductCache();
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
    invalidateProductCache();
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
