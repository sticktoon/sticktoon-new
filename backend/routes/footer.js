const express = require("express");
const router = express.Router();
const Setting = require("../models/Setting");

const defaultFooterData = {
  aboutTitle: "ABOUT US",
  aboutDescription:
    "Creators of bold, affordable pin badges and custom merch. Every design tells your story. Badge culture, redefined with unbeatable quality and prices.",
  contactEmail: "sticktoon.xyz@gmail.com",
  contactPhone: "",
  archiveTitle: "ARCHIVE",
  archiveLinks: [
    { label: "OUR STORY", url: "/about", enabled: true },
    { label: "ALL DROPS", url: "/categories", enabled: true },
    { label: "CUSTOM ORDER", url: "/custom-order", enabled: true },
    { label: "FAQ", url: "/faq", enabled: true },
  ],
  infoTitle: "INFORMATION",
  infoLinks: [
    { label: "PRIVACY POLICY", url: "/privacy-policy", enabled: true },
    { label: "TERMS & CONDITIONS", url: "/terms-conditions", enabled: true },
    { label: "REFUND POLICY", url: "/refund-cancellation", enabled: true },
    { label: "GET IN TOUCH", url: "/contact", enabled: true },
  ],
  followTitle: "FOLLOW",
  socialLinks: {
    instagram: { url: "https://www.instagram.com/sticktoon.shop", enabled: true },
    email: { url: "mailto:sticktoon.xyz@gmail.com", enabled: true },
    facebook: { url: "", enabled: false },
    youtube: { url: "", enabled: false },
    twitter: { url: "", enabled: false },
    linkedin: { url: "", enabled: false },
  },
  locationTitle: "MADE IN INDIA",
  locationIcon: "🇮🇳",
  locationText:
    "Proudly designed and produced in India—crafted with care, quality, and local talent.",
  copyrightText: "© 2026 StickToon",
  taglineText: "Where design meets personal identity.",
  securePaymentText: "100% Secure Payments",
  paymentMethods: ["VISA", "MASTERCARD", "UPI", "GPAY", "PAYTM", "RUPAY"],
};

/* ====================================
   GET PUBLIC FOOTER DATA (No Secrets)
==================================== */
router.get("/", async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: "footer_settings" });
    if (!setting || !setting.value) {
      return res.json(defaultFooterData);
    }
    // Deep merge defaults with stored settings
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
    console.error("Fetch public footer error:", err);
    res.json(defaultFooterData);
  }
});

module.exports = router;
module.exports.defaultFooterData = defaultFooterData;
