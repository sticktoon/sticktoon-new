const express = require("express");
const Invoice = require("../models/Invoice");
const auth = require("../middleware/auth");

const router = express.Router();

const { adminOnly } = require("../middleware/roleMiddleware");

/* 🧾 GET INVOICE BY ID */
router.get("/:id", auth, adminOnly, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("userId", "email")
      .populate("orderId");

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    res.json(invoice);
  } catch (err) {
    console.error("❌ Invoice fetch failed:", err);
    res.status(500).json({ message: "Failed to fetch invoice" });
  }
});

module.exports = router;
