const axios = require("axios");

/* =========================
   MODULE LOAD CHECK
========================= */
console.log("📧 sendEmail module loaded (Brevo API)");

if (!process.env.BREVO_API_KEY) {
  console.error("❌ BREVO_API_KEY is missing in .env");
} else {
  console.log("✅ Brevo API key detected");
}

if (!process.env.FROM_EMAIL) {
  console.error("❌ FROM_EMAIL is missing in .env");
}

/* =========================
   SEND EMAIL FUNCTION
========================= */
const sendEmail = async ({ to, subject, html, attachment, attachments }) => {
  if (!to) {
    console.error("❌ sendEmail aborted: recipient email is missing");
    return { ok: false, error: "Recipient email is missing" };
  }

  const payload = {
    sender: {
      name: process.env.FROM_NAME || "StickToon",
      email: process.env.FROM_EMAIL,
    },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  };

  // 📎 Support both old (attachment) and new (attachments) format
  if (attachments && attachments.length > 0) {
    // New format: array of { name, content (base64) }
    payload.attachment = attachments.map(att => ({
      name: att.name,
      content: att.content, // already base64
    }));
  } else if (attachment) {
    // Old format: { filename, content (Buffer) }
    payload.attachment = [
      {
        name: attachment.filename,
        content: attachment.content.toString("base64"),
      },
    ];
  }

  try {
    console.log("📨 Sending email to:", to);

    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      payload,
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Email sent successfully");
    console.log("📩 Brevo Message ID:", response.data?.messageId);
    return { ok: true, messageId: response.data?.messageId };
  } catch (error) {
    console.error("❌ Brevo email error");

    if (error.response?.data) {
      console.error("Brevo response:", error.response.data);
    } else {
      console.error(error.message);
    }
    return { ok: false, error: error.response?.data || error.message };
  }
};

module.exports = sendEmail;
