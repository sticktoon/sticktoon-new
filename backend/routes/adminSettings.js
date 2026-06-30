const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { adminOnly } = require("../middleware/roleMiddleware");
const Setting = require("../models/Setting");

/* =========================
   GET ALL SETTINGS (ADMIN)
========================= */
router.get("/", auth, adminOnly, async (req, res) => {
  try {
    const settingsList = await Setting.find({});
    // Convert array of settings into a nice key-value object
    const settingsObj = {};
    settingsList.forEach((s) => {
      settingsObj[s.key] = s.value;
    });

    // Default fallbacks if not in database yet
    if (settingsObj["shiprocket_auto_approve"] === undefined) {
      settingsObj["shiprocket_auto_approve"] = false;
    }

    res.json(settingsObj);
  } catch (err) {
    console.error("Fetch settings error:", err);
    res.status(500).json({ message: "Failed to fetch settings" });
  }
});

/* =========================
   UPDATE A SETTING (ADMIN)
========================= */
router.post("/", auth, adminOnly, async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) {
      return res.status(400).json({ message: "Setting key is required" });
    }

    const setting = await Setting.findOneAndUpdate(
      { key },
      { value },
      { new: true, upsert: true }
    );

    res.json({ message: "Setting updated successfully", setting });
  } catch (err) {
    console.error("Update setting error:", err);
    res.status(500).json({ message: "Failed to update setting" });
  }
});

module.exports = router;
