const { Resend } = require("resend");

/* =========================
   MODULE LOAD CHECK
========================= */
console.log("📧 sendEmail module loaded (Resend API)");

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("❌ RESEND_API_KEY is missing in .env");
    return null;
  }
  return new Resend(apiKey);
}

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

  const resend = getResendClient();
  if (!resend) {
    console.error("❌ sendEmail aborted: Resend API key is missing");
    return { ok: false, error: "RESEND_API_KEY is missing in .env" };
  }

  const fromName = process.env.FROM_NAME || "StickToon";
  const fromEmail = process.env.FROM_EMAIL || "noreply@sticktoon.shop";

  const payload = {
    from: `${fromName} <${fromEmail}>`,
    to: [to],
    subject,
    html,
  };

  // 📎 Attachments. Resend wants a Buffer; a base64 string is still accepted so
  // older callers keep working, but passing the Buffer straight through avoids
  // encoding the whole payload twice for nothing.
  if (attachments && attachments.length > 0) {
    // New format: array of { name, content (Buffer or base64 string) }
    payload.attachments = attachments.map((att) => ({
      filename: att.name,
      content: Buffer.isBuffer(att.content) ? att.content : Buffer.from(att.content, "base64"),
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
