const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Product = require("../models/Product");

const { adminOnly } = require("../middleware/roleMiddleware");
const { logActivity } = require("../utils/activityLogger");

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

const normalizeProductImagePath = (value) => {
  if (value === undefined || value === null) return "";

  let normalized = String(value).trim();
  if (!normalized) return "";
  if (/^https?:\/\//i.test(normalized) || /^data:/i.test(normalized)) {
    return normalized;
  }

  normalized = normalized.replace(/\\/g, "/").replace(/\/+/g, "/");
  const lower = normalized.toLowerCase();

  if (lower.includes("/public/")) {
    normalized = normalized.slice(lower.lastIndexOf("/public/") + "/public".length);
  } else if (lower.startsWith("public/")) {
    normalized = normalized.slice("public".length);
  } else if (lower.startsWith("./public/")) {
    normalized = normalized.slice("./public".length);
  } else if (lower.startsWith("../public/")) {
    normalized = normalized.slice("../public".length);
  }

  normalized = normalized.replace(/^\.\//, "");

  if (!normalized.startsWith("/") && /^(badge|images|sticker)\//i.test(normalized)) {
    normalized = `/${normalized}`;
  }

  if (!normalized.startsWith("/")) {
    normalized = `/badge/${normalized}`;
  }

  return normalized;
};

// A combo item is a snapshot of a member badge: enough to render the breakdown
// without a join. Entries missing an id or name are dropped.
const normalizeComboItems = (items) => {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && item.id && item.name)
    .map((item) => ({
      id: String(item.id),
      name: String(item.name),
      image: item.image ? normalizeProductImagePath(item.image) : "",
    }));
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

    const selectFields =
      'name price category subcategory image printImage imageMagnetic images description isActive stock weight length width height sku isCombo comboItems createdAt';

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

    const selectFields =
      'name price category subcategory image printImage imageMagnetic images description isActive stock weight length width height sku isCombo comboItems createdAt';

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
    const { name, price, description, category, subcategory, image, printImage, images, stock, weight, length, width, height, sku, isCombo, comboItems } = req.body;
    const normalizedCategory = normalizeCategory(category);
    const normalizedSubcategory = normalizeSubcategory(subcategory);
    const normalizedImage = normalizeProductImagePath(image);
    // Print image is optional; only normalize when one was supplied.
    const normalizedPrintImage = printImage ? normalizeProductImagePath(printImage) : "";
    const normalizedImages = Array.isArray(images)
      ? images.map((img) => normalizeProductImagePath(img)).filter(Boolean)
      : [];

    // Validation
    if (!name || !price || !description || !category || !normalizedImage) {
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
      image: normalizedImage,
      printImage: normalizedPrintImage,
      images: normalizedImages,
      isCombo: Boolean(isCombo),
      comboItems: isCombo ? normalizeComboItems(comboItems) : [],
      stock: parseInt(stock) || 0,
      weight: weight !== undefined && !isNaN(parseFloat(weight)) ? parseFloat(weight) : 0.1,
      length: length !== undefined && !isNaN(parseFloat(length)) ? parseFloat(length) : 10,
      width: width !== undefined && !isNaN(parseFloat(width)) ? parseFloat(width) : 10,
      height: height !== undefined && !isNaN(parseFloat(height)) ? parseFloat(height) : 5,
      sku: sku || "",
    });

    await product.save();
    invalidateProductCache();

    logActivity({
      req,
      action: "product.create",
      category: "product",
      message: `Created product "${product.name}"`,
      target: { type: "Product", id: product._id, label: product.name },
      meta: { price: product.price, category: product.category, stock: product.stock },
    });

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
    const { name, price, description, category, subcategory, image, printImage, images, stock, isActive, weight, length, width, height, sku, isCombo, comboItems } =
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
    if (image !== undefined) {
      const normalizedImage = normalizeProductImagePath(image);
      if (!normalizedImage) {
        return res.status(400).json({ error: "Invalid image path" });
      }
      product.image = normalizedImage;
    }
    if (printImage !== undefined) {
      // Allow clearing the print image by sending an empty string.
      product.printImage = printImage ? normalizeProductImagePath(printImage) : "";
    }
    if (images !== undefined) {
      product.images = Array.isArray(images)
        ? images.map((img) => normalizeProductImagePath(img)).filter(Boolean)
        : [];
    }
    if (isCombo !== undefined) product.isCombo = Boolean(isCombo);
    if (comboItems !== undefined) {
      product.comboItems = normalizeComboItems(comboItems);
    }
    // Un-flagging a combo must not leave a stale breakdown behind.
    if (!product.isCombo) product.comboItems = [];

    if (stock !== undefined) product.stock = parseInt(stock);
    if (isActive !== undefined) product.isActive = isActive;
    
    if (weight !== undefined) product.weight = parseFloat(weight);
    if (length !== undefined) product.length = parseFloat(length);
    if (width !== undefined) product.width = parseFloat(width);
    if (height !== undefined) product.height = parseFloat(height);
    if (sku !== undefined) product.sku = sku;

    await product.save();
    invalidateProductCache();

    logActivity({
      req,
      action: "product.update",
      category: "product",
      message: `Updated product "${product.name}"`,
      target: { type: "Product", id: product._id, label: product.name },
      meta: { fields: Object.keys(req.body || {}) },
    });

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

    logActivity({
      req,
      action: "product.delete",
      category: "product",
      message: `Deleted product "${product.name}"`,
      target: { type: "Product", id: product._id, label: product.name },
      meta: { price: product.price, category: product.category },
    });

    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
