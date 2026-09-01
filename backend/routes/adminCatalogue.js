const express = require("express");
const mongoose = require("mongoose");
const Catalogue = require("../models/Catalogue");
const auth = require("../middleware/auth");
const { adminOnly } = require("../middleware/roleMiddleware");

const router = express.Router();

/* 📚 GET ALL CATALOGUES */
router.get("/", auth, adminOnly, async (req, res) => {
  try {
    const catalogues = await Catalogue.find().sort({ createdAt: -1 });
    res.json(catalogues);
  } catch (err) {
    console.error("❌ Fetch catalogues failed:", err);
    res.status(500).json({ message: "Failed to fetch catalogues" });
  }
});

/* 📚 GET CATALOGUE BY ID */
router.get("/:id", auth, adminOnly, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid catalogue ID format" });
    }

    const catalogue = await Catalogue.findById(req.params.id).populate("leadId");

    if (!catalogue) {
      return res.status(404).json({ message: "Catalogue not found" });
    }

    res.json(catalogue);
  } catch (err) {
    console.error("❌ Catalogue fetch failed:", err);
    res.status(500).json({ message: "Failed to fetch catalogue" });
  }
});

/* 📚 CREATE NEW CATALOGUE */
router.post("/", auth, adminOnly, async (req, res) => {
  try {
    const {
      catalogueNumber,
      leadId,
      title,
      tagline,
      highlightLine,
      customerEmail,
      customerPhone,
      quotationDate,
      items,
      gstEnabled,
      gstin,
      gstRate,
      deliveryCharges,
      subtotal,
      gstAmount,
      total,
      overviewPoints,
      officeLocation,
      contactChannels,
      curationNote,
      footerNote,
      customCardTitle,
      customCardCopy,
      showCustomCard,
      status,
    } = req.body;

    const numDelivery = Math.max(0, Number(deliveryCharges || 0));
    const numSubtotal = Number(subtotal || 0);
    const numGstAmount = gstEnabled ? Number(gstAmount || 0) : 0;
    const numTotal = Number(total || numSubtotal + numGstAmount + numDelivery);

    let finalNumber = catalogueNumber || `ST/CAT/${Date.now()}`;
    const existing = await Catalogue.findOne({ catalogueNumber: finalNumber });
    if (existing) {
      finalNumber = `${finalNumber}-${Math.floor(100 + Math.random() * 900)}`;
    }

    const validLeadId = (leadId && mongoose.Types.ObjectId.isValid(leadId)) ? leadId : null;

    const newCatalogue = new Catalogue({
      catalogueNumber: finalNumber,
      leadId: validLeadId,
      title: title || "Advantage Club Collection",
      tagline: tagline || "Limited Edition",
      highlightLine: highlightLine || "Smart Magnetic 58mm Pin Badges - Designed to Stick Anywhere in Your Office",
      customerEmail: customerEmail || "",
      customerPhone: customerPhone || "",
      quotationDate: quotationDate || new Date().toISOString().slice(0, 10),
      items: Array.isArray(items)
        ? items.map((item) => ({
            id: String(item.id || ""),
            description: String(item.description || ""),
            unitPrice: Math.max(0, Number(item.unitPrice || 0)),
            quantity: Math.max(1, Number(item.quantity || 1)),
            image: String(item.image || ""),
            defaultImage: String(item.defaultImage || ""),
            finishLabel: String(item.finishLabel || ""),
          }))
        : [],
      gstEnabled: Boolean(gstEnabled),
      gstin: gstin || "",
      gstRate: Number(gstRate || 18),
      deliveryCharges: numDelivery,
      subtotal: numSubtotal,
      gstAmount: numGstAmount,
      total: numTotal,
      overviewPoints: overviewPoints || "",
      officeLocation: officeLocation || "",
      contactChannels: contactChannels || "",
      curationNote: curationNote || "",
      footerNote: footerNote || "",
      customCardTitle: customCardTitle || "",
      customCardCopy: customCardCopy || "",
      showCustomCard: typeof showCustomCard === "boolean" ? showCustomCard : true,
      status: status || "Saved",
    });

    await newCatalogue.save();
    res.status(201).json(newCatalogue);
  } catch (err) {
    console.error("❌ Create catalogue failed:", err);
    res.status(500).json({ message: "Failed to save catalogue", error: err.message });
  }
});

/* 📚 UPDATE EXISTING CATALOGUE */
router.put("/:id", auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid catalogue ID format" });
    }

    const existingCatalogue = await Catalogue.findById(id);

    if (!existingCatalogue) {
      return res.status(404).json({ message: "Catalogue not found" });
    }

    const {
      catalogueNumber,
      leadId,
      title,
      tagline,
      highlightLine,
      customerEmail,
      customerPhone,
      quotationDate,
      items,
      gstEnabled,
      gstin,
      gstRate,
      deliveryCharges,
      subtotal,
      gstAmount,
      total,
      overviewPoints,
      officeLocation,
      contactChannels,
      curationNote,
      footerNote,
      customCardTitle,
      customCardCopy,
      showCustomCard,
      status,
    } = req.body;

    const numDelivery = Math.max(0, Number(deliveryCharges || 0));
    const numSubtotal = Number(subtotal || 0);
    const numGstAmount = gstEnabled ? Number(gstAmount || 0) : 0;
    const numTotal = Number(total || numSubtotal + numGstAmount + numDelivery);

    const validLeadId = (leadId && mongoose.Types.ObjectId.isValid(leadId))
      ? leadId
      : (existingCatalogue.leadId && mongoose.Types.ObjectId.isValid(existingCatalogue.leadId))
        ? existingCatalogue.leadId
        : null;

    const updateFields = {
      leadId: validLeadId,
      title: title ?? existingCatalogue.title,
      tagline: tagline ?? existingCatalogue.tagline,
      highlightLine: highlightLine ?? existingCatalogue.highlightLine,
      customerEmail: customerEmail ?? existingCatalogue.customerEmail,
      customerPhone: customerPhone ?? existingCatalogue.customerPhone,
      quotationDate: quotationDate || existingCatalogue.quotationDate,
      items: Array.isArray(items)
        ? items.map((item) => ({
            id: String(item.id || ""),
            description: String(item.description || ""),
            unitPrice: Math.max(0, Number(item.unitPrice || 0)),
            quantity: Math.max(1, Number(item.quantity || 1)),
            image: String(item.image || ""),
            defaultImage: String(item.defaultImage || ""),
            finishLabel: String(item.finishLabel || ""),
          }))
        : existingCatalogue.items,
      gstEnabled: typeof gstEnabled === "boolean" ? gstEnabled : existingCatalogue.gstEnabled,
      gstin: gstin ?? existingCatalogue.gstin,
      gstRate: Number(gstRate ?? existingCatalogue.gstRate ?? 18),
      deliveryCharges: numDelivery,
      subtotal: numSubtotal,
      gstAmount: numGstAmount,
      total: numTotal,
      overviewPoints: overviewPoints ?? existingCatalogue.overviewPoints,
      officeLocation: officeLocation ?? existingCatalogue.officeLocation,
      contactChannels: contactChannels ?? existingCatalogue.contactChannels,
      curationNote: curationNote ?? existingCatalogue.curationNote,
      footerNote: footerNote ?? existingCatalogue.footerNote,
      customCardTitle: customCardTitle ?? existingCatalogue.customCardTitle,
      customCardCopy: customCardCopy ?? existingCatalogue.customCardCopy,
      showCustomCard: typeof showCustomCard === "boolean" ? showCustomCard : existingCatalogue.showCustomCard,
      status: status || existingCatalogue.status,
    };

    if (catalogueNumber && catalogueNumber !== existingCatalogue.catalogueNumber) {
      let candidateNumber = catalogueNumber;
      let duplicate = await Catalogue.findOne({ catalogueNumber: candidateNumber, _id: { $ne: id } });
      while (duplicate) {
        candidateNumber = `${catalogueNumber}-${Math.floor(1000 + Math.random() * 9000)}`;
        duplicate = await Catalogue.findOne({ catalogueNumber: candidateNumber, _id: { $ne: id } });
      }
      updateFields.catalogueNumber = candidateNumber;
    }

    const updated = await Catalogue.findByIdAndUpdate(id, updateFields, {
      new: true,
      runValidators: true,
    });

    res.json(updated);
  } catch (err) {
    console.error("❌ Update catalogue failed:", err);
    res.status(500).json({ message: "Failed to update catalogue", error: err.message });
  }
});

/* 📚 BULK DELETE CATALOGUES */
router.post("/bulk-delete", auth, adminOnly, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No catalogue IDs provided for deletion" });
    }
    const result = await Catalogue.deleteMany({ _id: { $in: ids } });
    res.json({ message: `${result.deletedCount} catalogues deleted successfully`, count: result.deletedCount });
  } catch (err) {
    console.error("❌ Bulk delete catalogues failed:", err);
    res.status(500).json({ message: "Failed to delete catalogues" });
  }
});

/* 📚 DELETE CATALOGUE */
router.delete("/:id", auth, adminOnly, async (req, res) => {
  try {
    const deleted = await Catalogue.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Catalogue not found" });
    }
    res.json({ message: "Catalogue deleted successfully" });
  } catch (err) {
    console.error("❌ Delete catalogue failed:", err);
    res.status(500).json({ message: "Failed to delete catalogue" });
  }
});

module.exports = router;
