const express = require("express");
const router = express.Router();
const Invoice = require("../models/Invoice");
const generateInvoicePDF = require("../utils/generateInvoicePDF");
const auth = require("../middleware/auth");
const { hasPermission } = require("../middleware/roleMiddleware");

// An invoice carries the customer's name, email, phone and address, so only
// the buyer or an admin with order access may read it.
async function canSeeInvoice(user, invoice) {
  const order = invoice.orderId || {};
  const ownerId = String(order.userId || invoice.userId?._id || invoice.userId || "");
  if (user.id && ownerId === String(user.id)) return true;
  if (user.email && order.userEmail && order.userEmail === String(user.email).toLowerCase()) return true;
  return Boolean(user.mfa) && ((await hasPermission(user, "orders")) || (await hasPermission(user, "revenue")));
}

/* =========================
   GET INVOICE (BY INVOICE ID OR ORDER ID)
========================= */
router.get("/:id", auth, async (req, res) => {
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
    // Same answer as "missing", so invoice IDs can't be probed.
    if (!(await canSeeInvoice(req.user, invoice))) {
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
router.get("/:id/download", auth, async (req, res) => {
  try {
    const id = req.params.id;

    // 🔎 Try invoiceId first
    let invoice = await Invoice.findById(id)
      .populate("userId", "name email phone")
      .populate("orderId");

    // 🔁 If not found, try orderId
    if (!invoice) {
      invoice = await Invoice.findOne({ orderId: id })
        .populate("userId", "name email phone")
        .populate("orderId");
    }

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    // Same answer as "missing", so invoice IDs can't be probed.
    if (!(await canSeeInvoice(req.user, invoice))) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    // If userId is not populated but we have order, get user from order
    if (!invoice.userId && invoice.orderId) {
      const User = require("../models/User");
      const user = await User.findById(invoice.orderId.userId).select("name email phone");
      if (user) {
        invoice.userId = user;
      }
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
    return res.status(500).json({ message: "Failed to generate PDF" });
  }
});

module.exports = router;
