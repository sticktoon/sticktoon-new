const express = require("express");
const router = express.Router();
const sendEmail = require("../utils/sendEmail");
const SupportMessage = require("../models/SupportMessage");

const getNextTicketId = async () => {
  const year = new Date().getFullYear();
  const prefix = `ST-${year}-`;

  const latestForYear = await SupportMessage.findOne({
    ticketId: { $regex: `^${prefix}` },
  })
    .sort({ ticketId: -1 })
    .select("ticketId")
    .lean();

  let nextSequence = 1;
  if (latestForYear?.ticketId) {
    const match = latestForYear.ticketId.match(/-(\d+)$/);
    if (match?.[1]) {
      nextSequence = Number.parseInt(match[1], 10) + 1;
    }
  }

  return `${prefix}${String(nextSequence).padStart(3, "0")}`;
};

router.post("/", async (req, res) => {
  try {
    const { name, email, phone, inquiryType, message } = req.body || {};

    if (!name || !email || !phone || !inquiryType || !message) {
      return res.status(400).json({ message: "All fields are required" });
    }

    let supportMessage = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const ticketId = await getNextTicketId();
      try {
        supportMessage = await SupportMessage.create({
          name,
          email,
          phone,
          inquiryType,
          message,
          ticketId,
        });
        break;
      } catch (createErr) {
        if (createErr?.code === 11000 && createErr?.keyPattern?.ticketId) {
          continue;
        }
        throw createErr;
      }
    }

    if (!supportMessage) {
      return res.status(500).json({ message: "Failed to create ticket" });
    }

    const adminEmail =
      process.env.ADMIN_EMAIL || process.env.FROM_EMAIL || "sticktoon.xyz@gmail.com";

    const subject = `New Contact Inquiry [${supportMessage.ticketId}]: ${inquiryType}`;
    const html = `
      <h2>New Contact Form Submission</h2>
      <p><strong>Ticket ID:</strong> ${supportMessage.ticketId}</p>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>Inquiry Type:</strong> ${inquiryType}</p>
      <p><strong>Message:</strong></p>
      <p>${message.replace(/\n/g, "<br/>")}</p>
    `;

    const adminResult = await sendEmail({
      to: adminEmail,
      subject,
      html,
    });

    if (!adminResult?.ok) {
      return res.status(500).json({ message: "Failed to send email" });
    }

    const customerResult = await sendEmail({
      to: email,
      subject: `We received your support request [${supportMessage.ticketId}]`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <p>Hi ${name},</p>
          <p>Thanks for contacting StickToon support. We have received your request.</p>
          <p><strong>Ticket ID:</strong> ${supportMessage.ticketId}</p>
          <p>Please keep this ticket ID for future follow-up.</p>
          <p style="margin-top: 24px;">Regards,<br/>StickToon Support Team</p>
        </div>
      `,
    });

    if (!customerResult?.ok) {
      console.error("Customer support confirmation email failed:", customerResult.error);
    }

    res.status(200).json({
      message: "Inquiry sent successfully",
      ticketId: supportMessage.ticketId,
    });
  } catch (err) {
    console.error("Contact route error:", err);
    res.status(500).json({ message: "Failed to send inquiry" });
  }
});

module.exports = router;
