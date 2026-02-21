const express = require("express");
const router = express.Router();
const sendEmail = require("../utils/sendEmail");
const SupportMessage = require("../models/SupportMessage");

router.post("/", async (req, res) => {
  try {
    const { name, email, phone, inquiryType, message } = req.body || {};

    if (!name || !email || !phone || !inquiryType || !message) {
      return res.status(400).json({ message: "All fields are required" });
    }

    await SupportMessage.create({
      name,
      email,
      phone,
      inquiryType,
      message,
    });

    const adminEmail =
      process.env.ADMIN_EMAIL || process.env.FROM_EMAIL || "sticktoon.xyz@gmail.com";

    const subject = `New Contact Inquiry: ${inquiryType}`;
    const html = `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>Inquiry Type:</strong> ${inquiryType}</p>
      <p><strong>Message:</strong></p>
      <p>${message.replace(/\n/g, "<br/>")}</p>
    `;

    const result = await sendEmail({
      to: adminEmail,
      subject,
      html,
    });

    if (!result?.ok) {
      return res.status(500).json({ message: "Failed to send email" });
    }

    res.status(200).json({ message: "Inquiry sent successfully" });
  } catch (err) {
    console.error("Contact route error:", err);
    res.status(500).json({ message: "Failed to send inquiry" });
  }
});

module.exports = router;
