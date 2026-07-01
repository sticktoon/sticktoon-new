const { Resend } = require("resend");

/* =========================
   MODULE LOAD CHECK
========================= */
console.log("📧 sendEmail module loaded (Resend API)");

if (!process.env.RESEND_API_KEY) {
  console.error("❌ RESEND_API_KEY is missing in .env");
} else {
  console.log("✅ Resend API key detected");
}

if (!process.env.FROM_EMAIL) {
  console.error("❌ FROM_EMAIL is missing in .env");
}

const resend = new Resend(process.env.RESEND_API_KEY);

/* =========================
   SEND EMAIL FUNCTION
   Interface kept identical to the previous Brevo implementation:
   input  -> { to, subject, html, attachment?, attachments? }
   output -> { ok: true, messageId } | { ok: false, error }
========================= */
const sendEmail = async ({ to, subject, html, attachment, attachments }) => {
  if (!to) {
    console.error("❌ sendEmail aborted: recipient email is missing");
    return { ok: false, error: "Recipient email is missing" };
  }

  const fromName = process.env.FROM_NAME || "StickToon";
  const fromEmail = process.env.FROM_EMAIL;

  const payload = {
    from: `${fromName} <${fromEmail}>`,
    to: [to],
    subject,
    html,
  };

  // 📎 Attachments. Callers pass base64 in `content`; Resend wants a Buffer.
  if (attachments && attachments.length > 0) {
    // New format: array of { name, content (base64) }
    payload.attachments = attachments.map((att) => ({
      filename: att.name,
      content: Buffer.from(att.content, "base64"),
    }));
  } else if (attachment) {
    // Old format: { filename, content (Buffer) }
    payload.attachments = [
      {
        filename: attachment.filename,
        content: attachment.content,
      },
    ];
  }

  try {
    console.log("📨 Sending email to:", to);

    const { data, error } = await resend.emails.send(payload);

    if (error) {
      console.error("❌ Resend email error:", JSON.stringify(error));
      return { ok: false, error };
    }

    console.log("✅ Email sent successfully");
    console.log("📩 Resend Message ID:", data?.id);
    return { ok: true, messageId: data?.id };
  } catch (error) {
    console.error("❌ Resend email error");
    console.error(error.message);
    return { ok: false, error: error.message };
  }
};

module.exports = sendEmail;
