const express = require("express");
const router = express.Router();
const Invoice = require("../models/Invoice");

/* =========================
   GET INVOICE (BY INVOICE ID OR ORDER ID)
========================= */
router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;

    // 🔎 Try invoiceId first
    let invoice = await Invoice.findById(id)
      .populate("userId", "name email")
      .populate("orderId");

    // 🔁 If not found, try orderId (BACKWARD COMPATIBILITY)
    if (!invoice) {
      invoice = await Invoice.findOne({ orderId: id })
        .populate("userId", "name email")
        .populate("orderId");
    }

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    return res.json(invoice);
  } catch (err) {
    console.error("❌ Invoice fetch error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
