const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { adminOnly } = require("../middleware/roleMiddleware");
const Setting = require("../models/Setting");
const { defaultFooterData } = require("./footer");

// URL Validator helper
function isValidUrlOrPath(str) {
  if (!str || typeof str !== "string") return true; // empty strings allowed
  const trimmed = str.trim();
  if (trimmed === "") return true;
  if (trimmed.startsWith("/") || trimmed.startsWith("mailto:") || trimmed.startsWith("tel:")) {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (e) {
    return false;
  }
}

/* ====================================
   GET ADMIN FOOTER SETTINGS (ADMIN ONLY)
==================================== */
router.get("/", auth, adminOnly, async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: "footer_settings" });
    if (!setting || !setting.value) {
      return res.json(defaultFooterData);
    }
    const stored = setting.value || {};
    const data = {
      ...defaultFooterData,
      ...stored,
      socialLinks: {
        ...defaultFooterData.socialLinks,
        ...(stored.socialLinks || {}),
      },
    };
    res.json(data);
  } catch (err) {
    console.error("Fetch admin footer settings error:", err);
    res.status(500).json({ message: "Failed to fetch footer settings" });
  }
});

/* ====================================
   UPDATE ADMIN FOOTER SETTINGS (ADMIN ONLY)
==================================== */
router.post("/", auth, adminOnly, async (req, res) => {
  try {
    const footerData = req.body;
    if (!footerData || typeof footerData !== "object") {
      return res.status(400).json({ message: "Invalid footer data provided" });
    }

    // Validate social URLs if enabled
    if (footerData.socialLinks && typeof footerData.socialLinks === "object") {
      for (const [key, obj] of Object.entries(footerData.socialLinks)) {
        if (obj && obj.enabled && obj.url) {
          if (!isValidUrlOrPath(obj.url)) {
            return res.status(400).json({
              message: `Invalid URL format for social link "${key}": ${obj.url}`,
            });
          }
        }
      }
    }

    // Validate navigation link URLs
    const navLists = [footerData.archiveLinks, footerData.infoLinks];
    for (const list of navLists) {
      if (Array.isArray(list)) {
        for (const item of list) {
          if (item && item.url && !isValidUrlOrPath(item.url)) {
            return res.status(400).json({
              message: `Invalid URL or path format for link "${item.label}": ${item.url}`,
            });
          }
        }
      }
    }

    const updated = await Setting.findOneAndUpdate(
      { key: "footer_settings" },
      { value: footerData },
      { new: true, upsert: true }
    );

    res.json({
      message: "Footer settings saved successfully",
      footer: updated.value,
    });
  } catch (err) {
    console.error("Update admin footer settings error:", err);
    res.status(500).json({ message: "Failed to save footer settings" });
  }
});

module.exports = router;
