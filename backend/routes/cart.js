const express = require("express");
const router = express.Router();
const Cart = require("../models/Cart");
const auth = require("../middleware/auth");

/* =========================
   GET CART
========================= */
router.get("/", auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.id });
    res.json({ items: cart?.items || [] });
  } catch (err) {
    console.error("Get cart error:", err);
    res.status(500).json({ message: "Failed to get cart" });
  }
});

/* =========================
   SYNC CART (Replace Logic)
   Replaces database cart with localStorage cart
========================= */
router.post("/sync", auth, async (req, res) => {
  try {
    const { localCart } = req.body; // Cart from localStorage
    const userId = req.user.id;

    // Replace database cart with localStorage cart
    const dbCart = await Cart.findOneAndUpdate(
      { userId },
      { items: localCart || [] },
      { new: true, upsert: true } // Create if not exists
    );

    res.json({ items: dbCart.items });
  } catch (err) {
    console.error("Sync cart error:", err);
    res.status(500).json({ message: "Failed to sync cart" });
  }
});

/* =========================
   ADD TO CART
========================= */
router.post("/add", auth, async (req, res) => {
  try {
    const { item, quantity = 1 } = req.body;
    const userId = req.user.id;

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = await Cart.create({
        userId,
        items: [{ ...item, quantity }],
      });
    } else {
      const existingIndex = cart.items.findIndex((i) => i.id === item.id);
      if (existingIndex >= 0) {
        cart.items[existingIndex].quantity += quantity;
      } else {
        cart.items.push({ ...item, quantity });
      }
      await cart.save();
    }

    res.json({ items: cart.items });
  } catch (err) {
    console.error("Add to cart error:", err);
    res.status(500).json({ message: "Failed to add to cart" });
  }
});

/* =========================
   UPDATE QUANTITY
========================= */
router.put("/update/:itemId", auth, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const userId = req.user.id;

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex((i) => i.id === itemId);
    if (itemIndex < 0) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    if (quantity <= 0) {
      // Remove item if quantity is 0 or less
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
    }

    await cart.save();
    res.json({ items: cart.items });
  } catch (err) {
    console.error("Update cart error:", err);
    res.status(500).json({ message: "Failed to update cart" });
  }
});

/* =========================
   REMOVE FROM CART
========================= */
router.delete("/remove/:itemId", auth, async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user.id;

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.items = cart.items.filter((i) => i.id !== itemId);
    await cart.save();

    res.json({ items: cart.items });
  } catch (err) {
    console.error("Remove from cart error:", err);
    res.status(500).json({ message: "Failed to remove from cart" });
  }
});

/* =========================
   CLEAR CART
========================= */
router.delete("/clear", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    await Cart.findOneAndUpdate({ userId }, { items: [] });

    res.json({ items: [] });
  } catch (err) {
    console.error("Clear cart error:", err);
    res.status(500).json({ message: "Failed to clear cart" });
  }
});

module.exports = router;
