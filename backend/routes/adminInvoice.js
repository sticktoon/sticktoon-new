const express = require("express");
const Invoice = require("../models/Invoice");
const auth = require("../middleware/auth");
const { adminOnly } = require("../middleware/roleMiddleware");

const router = express.Router();

/* 🧾 GET ALL INVOICES & QUOTATIONS */
router.get("/", auth, adminOnly, async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    res.json(invoices);
  } catch (err) {
    console.error("❌ Fetch invoices failed:", err);
    res.status(500).json({ message: "Failed to fetch invoices" });
  }
});

/* 🧾 GET INVOICE BY ID */
router.get("/:id", auth, adminOnly, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("userId", "email")
      .populate("orderId")
      .populate("leadId");

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    res.json(invoice);
  } catch (err) {
    console.error("❌ Invoice fetch failed:", err);
    res.status(500).json({ message: "Failed to fetch invoice" });
  }
});

/* 🧾 CREATE NEW INVOICE / QUOTATION */
router.post("/", auth, adminOnly, async (req, res) => {
  try {
    const {
      leadId,
      docType,
      customerName,
      company,
      email,
      phone,
      address,
      invoiceNumber,
      quotationDate,
      validityDays,
      currencyCode,
      subject,
      intro,
      companyGstin,
      companyUdyam,
      companyEmail,
      companyContact,
      items,
      gstEnabled,
      gstin,
      gstRate,
      subtotal,
      gstAmount,
      deliveryCharges,
      amount,
      discount,
      promoCode,
      termsText,
      bankDetails,
      operationalAddress,
      headquartersAddress,
      authorizedSignatory,
      signatureBrand,
      status,
    } = req.body;

    const numDelivery = Math.max(0, Number(deliveryCharges || 0));
    const numSubtotal = Number(subtotal || 0);
    const numGstAmount = gstEnabled ? Number(gstAmount || 0) : 0;
    const numDiscount = Number(discount || 0);
    const numTotal = Number(amount || numSubtotal + numGstAmount + numDelivery - numDiscount);

    // If invoiceNumber already exists, throw or generate unique suffix
    let finalNumber = invoiceNumber || `ST/INV/${Date.now()}`;
    const existing = await Invoice.findOne({ invoiceNumber: finalNumber });
    if (existing) {
      finalNumber = `${finalNumber}-${Math.floor(100 + Math.random() * 900)}`;
    }

    const newInvoice = new Invoice({
      leadId: leadId || null,
      docType: docType || "invoice",
      customerName: customerName || "",
      company: company || "",
      email: email || "",
      phone: phone || "",
      address: address || "",
      invoiceNumber: finalNumber,
      quotationDate: quotationDate || new Date().toISOString().slice(0, 10),
      validityDays: Number(validityDays || 30),
      currencyCode: currencyCode || "INR",
      subject: subject || "",
      intro: intro || "",
      companyGstin: companyGstin || "",
      companyUdyam: companyUdyam || "",
      companyEmail: companyEmail || "",
      companyContact: companyContact || "",
      items: Array.isArray(items) ? items : [],
      gstEnabled: Boolean(gstEnabled),
      gstin: gstin || "",
      gstRate: Number(gstRate || 18),
      subtotal: numSubtotal,
      gstAmount: numGstAmount,
      deliveryCharges: numDelivery,
      amount: numTotal,
      discount: numDiscount,
      promoCode: promoCode || null,
      termsText: termsText || "",
      bankDetails: bankDetails || {},
      operationalAddress: operationalAddress || "",
      headquartersAddress: headquartersAddress || "",
      authorizedSignatory: authorizedSignatory || "",
      signatureBrand: signatureBrand || "",
      status: status || "Saved",
    });

    await newInvoice.save();
    res.status(201).json(newInvoice);
  } catch (err) {
    console.error("❌ Create invoice failed:", err);
    res.status(500).json({ message: "Failed to save invoice", error: err.message });
  }
});

/* 🧾 UPDATE EXISTING INVOICE / QUOTATION */
router.put("/:id", auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const existingInvoice = await Invoice.findById(id);

    if (!existingInvoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const {
      leadId,
      docType,
      customerName,
      company,
      email,
      phone,
      address,
      invoiceNumber,
      quotationDate,
      validityDays,
      currencyCode,
      subject,
      intro,
      companyGstin,
      companyUdyam,
      companyEmail,
      companyContact,
      items,
      gstEnabled,
      gstin,
      gstRate,
      subtotal,
      gstAmount,
      deliveryCharges,
      amount,
      discount,
      promoCode,
      termsText,
      bankDetails,
      operationalAddress,
      headquartersAddress,
      authorizedSignatory,
      signatureBrand,
      status,
    } = req.body;

    const numDelivery = Math.max(0, Number(deliveryCharges || 0));
    const numSubtotal = Number(subtotal || 0);
    const numGstAmount = gstEnabled ? Number(gstAmount || 0) : 0;
    const numDiscount = Number(discount || 0);
    const numTotal = Number(amount || numSubtotal + numGstAmount + numDelivery - numDiscount);

    const updateFields = {
      leadId: leadId || existingInvoice.leadId,
      docType: docType || existingInvoice.docType,
      customerName: customerName ?? existingInvoice.customerName,
      company: company ?? existingInvoice.company,
      email: email ?? existingInvoice.email,
      phone: phone ?? existingInvoice.phone,
      address: address ?? existingInvoice.address,
      invoiceNumber: invoiceNumber || existingInvoice.invoiceNumber,
      quotationDate: quotationDate || existingInvoice.quotationDate,
      validityDays: validityDays ?? existingInvoice.validityDays,
      currencyCode: currencyCode || existingInvoice.currencyCode,
      subject: subject ?? existingInvoice.subject,
      intro: intro ?? existingInvoice.intro,
      companyGstin: companyGstin ?? existingInvoice.companyGstin,
      companyUdyam: companyUdyam ?? existingInvoice.companyUdyam,
      companyEmail: companyEmail ?? existingInvoice.companyEmail,
      companyContact: companyContact ?? existingInvoice.companyContact,
      items: Array.isArray(items) ? items : existingInvoice.items,
      gstEnabled: typeof gstEnabled === "boolean" ? gstEnabled : existingInvoice.gstEnabled,
      gstin: gstin ?? existingInvoice.gstin,
      gstRate: gstRate ?? existingInvoice.gstRate,
      subtotal: numSubtotal,
      gstAmount: numGstAmount,
      deliveryCharges: numDelivery,
      amount: numTotal,
      discount: numDiscount,
      promoCode: promoCode ?? existingInvoice.promoCode,
      termsText: termsText ?? existingInvoice.termsText,
      bankDetails: bankDetails ?? existingInvoice.bankDetails,
      operationalAddress: operationalAddress ?? existingInvoice.operationalAddress,
      headquartersAddress: headquartersAddress ?? existingInvoice.headquartersAddress,
      authorizedSignatory: authorizedSignatory ?? existingInvoice.authorizedSignatory,
      signatureBrand: signatureBrand ?? existingInvoice.signatureBrand,
      status: status || existingInvoice.status,
    };

    const updated = await Invoice.findByIdAndUpdate(id, updateFields, {
      new: true,
      runValidators: true,
    });

    res.json(updated);
  } catch (err) {
    console.error("❌ Update invoice failed:", err);
    res.status(500).json({ message: "Failed to update invoice", error: err.message });
  }
});

/* 🧾 DELETE INVOICE */
router.delete("/:id", auth, adminOnly, async (req, res) => {
  try {
    const deleted = await Invoice.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    res.json({ message: "Invoice deleted successfully" });
  } catch (err) {
    console.error("❌ Delete invoice failed:", err);
    res.status(500).json({ message: "Failed to delete invoice" });
  }
});

module.exports = router;

