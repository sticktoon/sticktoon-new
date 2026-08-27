const express = require("express");
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

    const newCatalogue = new Catalogue({
      catalogueNumber: finalNumber,
      leadId: leadId || null,
      title: title || "Advantage Club Collection",
      tagline: tagline || "Limited Edition",
      highlightLine: highlightLine || "Smart Magnetic 58mm Pin Badges - Designed to Stick Anywhere in Your Office",
      customerEmail: customerEmail || "",
      customerPhone: customerPhone || "",
      quotationDate: quotationDate || new Date().toISOString().slice(0, 10),
      items: Array.isArray(items) ? items : [],
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

    const updateFields = {
      catalogueNumber: catalogueNumber || existingCatalogue.catalogueNumber,
      leadId: leadId || existingCatalogue.leadId,
      title: title ?? existingCatalogue.title,
      tagline: tagline ?? existingCatalogue.tagline,
      highlightLine: highlightLine ?? existingCatalogue.highlightLine,
      customerEmail: customerEmail ?? existingCatalogue.customerEmail,
      customerPhone: customerPhone ?? existingCatalogue.customerPhone,
      quotationDate: quotationDate || existingCatalogue.quotationDate,
      items: Array.isArray(items) ? items : existingCatalogue.items,
      gstEnabled: typeof gstEnabled === "boolean" ? gstEnabled : existingCatalogue.gstEnabled,
      gstin: gstin ?? existingCatalogue.gstin,
      gstRate: gstRate ?? existingCatalogue.gstRate,
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
