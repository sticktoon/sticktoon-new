const express = require("express");
const router = express.Router();
const Invoice = require("../models/Invoice");
const generateInvoicePDF = require("../utils/generateInvoicePDF");

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

/* =========================
   DOWNLOAD INVOICE PDF
========================= */
router.get("/:id/download", async (req, res) => {
  try {
    const id = req.params.id;

    // 🔎 Try invoiceId first
    let invoice = await Invoice.findById(id)
      .populate("userId", "name email")
      .populate("orderId");

    // 🔁 If not found, try orderId
    if (!invoice) {
      invoice = await Invoice.findOne({ orderId: id })
        .populate("userId", "name email")
        .populate("orderId");
    }

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF({
      invoice,
      order: invoice.orderId,
    });

    // Set headers for PDF download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`
    );
    res.setHeader("Content-Length", pdfBuffer.length);

    return res.send(pdfBuffer);
  } catch (err) {
    console.error("❌ Invoice download error:", err);
    console.error("❌ Error details:", err.message, err.stack);
    return res.status(500).json({ message: "Failed to generate PDF", error: err.message });
  }
});

module.exports = router;
