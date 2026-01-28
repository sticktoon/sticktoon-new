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

/* ========================
   GET ALL PRODUCTS
======================== */
router.get("/", async (req, res) => {
  try {
    const products = await Product.find({ isActive: true }).sort("-createdAt");
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================
   GET PRODUCTS BY CATEGORY
======================== */
router.get("/category/:category", async (req, res) => {
  try {
    const products = await Product.find({
      category: req.params.category,
      isActive: true,
    }).sort("-createdAt");
    res.json(products);
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

    // Validation
    if (!name || !price || !description || !category || !image) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (!["Moody", "Sports", "Religious", "Entertainment", "Events", "Animal", "Couple", "Anime", "Custom"].includes(category)) {
      return res.status(400).json({ error: "Invalid category" });
    }

    const product = new Product({
      name,
      price: parseFloat(price),
      description,
      category,
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
      if (!["Moody", "Sports", "Religious", "Entertainment", "Events", "Animal", "Couple", "Anime", "Custom"].includes(category)) {
        return res.status(400).json({ error: "Invalid category" });
      }
      product.category = category;
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
