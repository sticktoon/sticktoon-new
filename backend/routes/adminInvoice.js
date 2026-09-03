const express = require("express");
const Invoice = require("../models/Invoice");
const auth = require("../middleware/auth");
const { adminOnly } = require("../middleware/roleMiddleware");
const sendEmail = require("../utils/sendEmail");
const generateInvoicePDF = require("../utils/generateInvoicePDF");

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

    // If invoiceNumber already exists, generate unique suffix
    let finalNumber = invoiceNumber || `ST/INV/${Date.now()}`;
    let existing = await Invoice.findOne({ invoiceNumber: finalNumber });
    while (existing) {
      finalNumber = `${finalNumber}-${Math.floor(100 + Math.random() * 900)}`;
      existing = await Invoice.findOne({ invoiceNumber: finalNumber });
    }

    const newInvoiceData = {
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
    };

    if (leadId) newInvoiceData.leadId = leadId;
    if (req.body.orderId) newInvoiceData.orderId = req.body.orderId;

    const newInvoice = new Invoice(newInvoiceData);

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

    let finalNumber = invoiceNumber || existingInvoice.invoiceNumber;
    if (finalNumber !== existingInvoice.invoiceNumber) {
      let existing = await Invoice.findOne({ invoiceNumber: finalNumber, _id: { $ne: id } });
      while (existing) {
        finalNumber = `${finalNumber}-${Math.floor(100 + Math.random() * 900)}`;
        existing = await Invoice.findOne({ invoiceNumber: finalNumber, _id: { $ne: id } });
      }
    }

    const updateFields = {
      leadId: leadId || existingInvoice.leadId,
      docType: docType || existingInvoice.docType,
      customerName: customerName ?? existingInvoice.customerName,
      company: company ?? existingInvoice.company,
      email: email ?? existingInvoice.email,
      phone: phone ?? existingInvoice.phone,
      address: address ?? existingInvoice.address,
      invoiceNumber: finalNumber,
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

/* 🧾 BULK DELETE INVOICES */
router.post("/bulk-delete", auth, adminOnly, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No invoice IDs provided for deletion" });
    }
    const result = await Invoice.deleteMany({ _id: { $in: ids } });
    res.json({ message: `${result.deletedCount} invoices deleted successfully`, count: result.deletedCount });
  } catch (err) {
    console.error("❌ Bulk delete invoices failed:", err);
    res.status(500).json({ message: "Failed to delete invoices" });
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

/* 🧾 SEND INVOICE / QUOTATION EMAIL */
router.post("/:id/send-email", auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { pdfData } = req.body || {};
    const invoice = await Invoice.findById(id).populate("leadId");

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const recipientEmail = invoice.email || invoice.leadId?.email;

    if (!recipientEmail || !recipientEmail.trim()) {
      return res.status(400).json({ message: "Customer email address is not available." });
    }

    const isInvoice = invoice.docType === "invoice";
    const docLabel = isInvoice ? "Invoice" : "Quotation";
    const docNumber = invoice.invoiceNumber || "N/A";
    const customerName = invoice.customerName || invoice.company || "Valued Customer";
    const totalAmount = invoice.amount || 0;
    const currency = invoice.currencyCode || "INR";

    let pdfBuffer = null;

    if (pdfData && typeof pdfData === "string") {
      try {
        const base64Content = pdfData.includes(",") ? pdfData.split(",")[1] : pdfData;
        pdfBuffer = Buffer.from(base64Content.trim(), "base64");
      } catch (err) {
        console.error("❌ Failed to parse base64 pdfData:", err);
      }
    }

    if (!pdfBuffer) {
      try {
        pdfBuffer = await generateInvoicePDF({ invoice });
      } catch (pdfErr) {
        console.error("❌ PDF generation failed for invoice email:", pdfErr);
      }
    }

    const emailSubject = `${docLabel} #${docNumber} from StickToon`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; margin-top: 0;">StickToon ${docLabel}</h2>
        <p>Dear ${customerName},</p>
        <p>Please find attached your ${docLabel.toLowerCase()} #${docNumber} from StickToon.</p>
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p style="margin: 5px 0;"><b>${docLabel} Number:</b> ${docNumber}</p>
          <p style="margin: 5px 0;"><b>Date:</b> ${invoice.quotationDate || new Date().toISOString().slice(0, 10)}</p>
          <p style="margin: 5px 0;"><b>Total Amount:</b> ${currency} ${totalAmount.toLocaleString('en-IN')}</p>
        </div>
        <p>If you have any questions or require custom orders, feel free to contact us.</p>
        <br/>
        <p style="font-weight: bold; color: #475569;">Best regards,<br/>StickToon Team</p>
        <hr style="border: none; border-top: 1px solid #cbd5e1; margin-top: 20px;" />
        <p style="font-size: 12px; color: #94a3b8;">This email was sent automatically from StickToon Admin.</p>
      </div>
    `;

    const attachments = [];
    if (pdfBuffer) {
      attachments.push({
        name: `${docLabel}-${docNumber.replace(/[\\/:*?"<>|]+/g, "-")}.pdf`,
        content: pdfBuffer,
      });
    }

    const result = await sendEmail({
      to: recipientEmail.trim(),
      subject: emailSubject,
      html: emailHtml,
      attachments,
    });

    if (!result.ok) {
      return res.status(500).json({ message: `Email sending failed: ${result.error?.message || result.error || "Unknown error"}` });
    }

    invoice.status = "Sent";
    await invoice.save();

    return res.json({
      success: true,
      message: "Invoice sent successfully.",
    });
  } catch (err) {
    console.error("❌ Send invoice email error:", err);
    return res.status(500).json({ message: "Failed to send invoice." });
  }
});

module.exports = router;

