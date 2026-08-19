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

/* ====================================
   GET QUOTATION NUMBER (AUTO-INCREMENT)
==================================== */
router.get("/quotation-number", async (req, res) => {
  try {
    let setting = await Setting.findOne({ key: "quotation_counter" });
    if (!setting) {
      setting = await Setting.create({ key: "quotation_counter", value: 812 });
    }

    const counter = Number(setting.value || 812);
    const now = new Date();
    const formattedCounter = String(counter).padStart(4, "0");
    const quotationNo = `ST/QTN/${now.getFullYear()}/${formattedCounter}`;

    res.json({ quotationNo, counter });
  } catch (err) {
    console.error("Fetch quotation number error:", err);
    res.status(500).json({ message: "Failed to fetch quotation number" });
  }
});

/* ====================================
   INCREMENT QUOTATION COUNTER BY 1
==================================== */
router.post("/quotation-number/increment", async (req, res) => {
  try {
    const updated = await Setting.findOneAndUpdate(
      { key: "quotation_counter" },
      { $inc: { value: 1 } },
      { new: true, upsert: true }
    );

    const counter = Number(updated.value || 812);
    const now = new Date();
    const formattedCounter = String(counter).padStart(4, "0");
    const quotationNo = `ST/QTN/${now.getFullYear()}/${formattedCounter}`;

    res.json({ success: true, quotationNo, counter });
  } catch (err) {
    console.error("Increment quotation counter error:", err);
    res.status(500).json({ message: "Failed to increment quotation counter" });
  }
});

module.exports = router;
