const express = require("express");
const router = express.Router();
const generateBadgeDoc = require("../utils/generateBadgeDoc");

// POST /api/badge-doc/download
// Accepts badge image data and returns a Word document for download
router.post("/download", async (req, res) => {
  try {
    const { image, printImage, name, quantity } = req.body;

    if (!image && !printImage) {
      return res.status(400).json({ error: "No badge image provided" });
    }

    const customBadges = [
      {
        name: name || "Custom Badge",
        quantity: quantity || 1,
        image: image || null,
        printImage: printImage || null,
      },
    ];

    const docBuffer = await generateBadgeDoc({
      orderId: `PREVIEW-${Date.now()}`,
      customBadges,
    });

    if (!docBuffer) {
      return res.status(500).json({ error: "Failed to generate document" });
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="StickToon-Badge-Print.docx"`
    );
    res.send(docBuffer);
  } catch (err) {
    console.error("Badge doc download error:", err);
    res.status(500).json({ error: "Failed to generate badge document" });
  }
});

module.exports = router;
