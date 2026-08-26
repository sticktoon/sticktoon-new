const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const Lead = require("../models/Lead");
const auth = require("../middleware/auth");
const { requirePermission } = require("../middleware/roleMiddleware");
const sendEmail = require("../utils/sendEmail");

// This router also serves the public lead-capture POST, so access is applied
// per route rather than at the mount point.
const leadsAccess = [auth, requirePermission("leads")];

/* ===============================
   GET ALL LEADS (Admin Only)
================================ */
router.get("/", ...leadsAccess, async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.json(leads);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch leads" });
  }
});

/* ===============================
   CREATE LEAD
================================ */
router.post("/", async (req, res) => {
  try {
    const { firstName, lastName, company, email, phone, status, leadSource, expectedAmount } = req.body;

    const newLead = new Lead({
      firstName,
      lastName,
      company,
      email,
      phone,
      expectedAmount: Number(expectedAmount || 0),
      leadSource: leadSource || "",
      status: status || "New",
    });

    await newLead.save();

    res.status(201).json(newLead);
  } catch (err) {
    console.error("Create lead error:", err);
    res.status(500).json({ message: "Failed to create lead" });
  }
});

router.patch("/:id", ...leadsAccess, async (req, res) => {
  try {
    const allowedFields = [
      "firstName",
      "lastName",
      "company",
      "email",
      "status",
      "leadSource",
      "expectedAmount",
    ];

    const update = {};
    allowedFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        update[field] =
          field === "expectedAmount"
            ? Number(req.body[field] || 0)
            : req.body[field];
      }
    });

    const updated = await Lead.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update lead" });
  }
});



/* ===============================
   UPDATE STATUS
================================ */
router.patch("/:id/status", ...leadsAccess, async (req, res) => {
  try {
    const { status } = req.body;
    const update = { status };

    if (status === "New" || status === "Lost") {
      update.nextFollowUpAt = null;
    }

    const updated = await Lead.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update status" });
  }
});

router.patch("/:id/follow-up", ...leadsAccess, async (req, res) => {
  try {
    const { nextFollowUpAt } = req.body || {};

    if (!nextFollowUpAt) {
      return res.status(400).json({ message: "Follow-up date is required" });
    }

    const parsed = new Date(nextFollowUpAt);
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({ message: "Invalid follow-up date" });
    }

    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    if (!["Contacted", "Interested"].includes(lead.status || "")) {
      return res
        .status(400)
        .json({ message: "Follow-up date allowed only for Contacted/Interested leads" });
    }

    lead.nextFollowUpAt = parsed;
    await lead.save();

    res.json(lead);
  } catch (err) {
    res.status(500).json({ message: "Failed to update follow-up date" });
  }
});

router.patch("/:id/lead-source", ...leadsAccess, async (req, res) => {
  try {
    const { leadSource } = req.body || {};

    const updated = await Lead.findByIdAndUpdate(
      req.params.id,
      { leadSource: leadSource || "" },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update lead source" });
  }
});

router.delete("/:id", ...leadsAccess, async (req, res) => {
  try {
    await Lead.findByIdAndDelete(req.params.id);
    res.json({ message: "Lead deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete lead" });
  }
});

/* ===============================
   UPLOAD / REGISTER GENERATED CATALOGUE
================================ */
const CATALOGUE_TMP_DIR = path.join(__dirname, "../tmp/catalogues");
if (!fs.existsSync(CATALOGUE_TMP_DIR)) {
  fs.mkdirSync(CATALOGUE_TMP_DIR, { recursive: true });
}

router.post("/catalogue/upload", ...leadsAccess, async (req, res) => {
  try {
    const { pdfData, filename } = req.body || {};
    if (!pdfData) {
      return res.status(400).json({ message: "PDF data is required" });
    }

    const catalogueId = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const safeFilename = (filename || "catalogue.pdf").replace(/[^a-zA-Z0-9_.-]/g, "_");
    const filePath = path.join(CATALOGUE_TMP_DIR, `${catalogueId}.pdf`);

    // Clean data URI prefix if present (e.g. data:application/pdf;filename=...;base64, or data:application/pdf;base64,)
    const base64Content = pdfData.includes(",") ? pdfData.split(",")[1] : pdfData;
    const pdfBuffer = Buffer.from(base64Content.trim(), "base64");

    // Validate PDF magic header (%PDF-)
    const headerString = pdfBuffer.slice(0, 5).toString("utf8");
    if (headerString !== "%PDF-") {
      console.error("❌ Invalid PDF header:", headerString, "hex:", pdfBuffer.slice(0, 10).toString("hex"));
      return res.status(400).json({ message: "Generated PDF buffer is invalid or damaged" });
    }

    console.log(`✅ Valid PDF received (${pdfBuffer.length} bytes), header: ${headerString}`);
    fs.writeFileSync(filePath, pdfBuffer);

    // Save filename metadata companion file
    const metaPath = path.join(CATALOGUE_TMP_DIR, `${catalogueId}.json`);
    fs.writeFileSync(metaPath, JSON.stringify({ catalogueId, filename: safeFilename, createdAt: new Date() }));

    return res.status(201).json({
      catalogueId,
      filename: safeFilename,
      size: pdfBuffer.length,
    });
  } catch (err) {
    console.error("Upload catalogue error:", err);
    return res.status(500).json({ message: "Catalogue generation failed" });
  }
});

/* ===============================
   GET / VIEW / DOWNLOAD CATALOGUE PDF
================================ */
router.get("/catalogue/:catalogueId/download", async (req, res) => {
  try {
    const { catalogueId } = req.params;
    const safeCatId = (catalogueId || "").replace(/[^a-zA-Z0-9_-]/g, "");
    const filePath = path.join(CATALOGUE_TMP_DIR, `${safeCatId}.pdf`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send("Catalogue file not found");
    }

    let attachmentFilename = "catalogue.pdf";
    const metaPath = path.join(CATALOGUE_TMP_DIR, `${safeCatId}.json`);
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
        if (meta.filename) attachmentFilename = meta.filename;
      } catch (e) {}
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${attachmentFilename}"`);
    const fileStream = fs.createReadStream(filePath);
    return fileStream.pipe(res);
  } catch (err) {
    console.error("Download catalogue error:", err);
    return res.status(500).send("Error retrieving catalogue file");
  }
});

const { google } = require("googleapis");

function getGmailOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN || process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  const redirectUri = process.env.GMAIL_OAUTH_REDIRECT_URI || `${process.env.WEBHOOK_BASE_URL || "http://localhost:5000"}/api/admin/leads/gmail/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in backend environment variables.");
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  if (refreshToken) {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
  }

  return { oauth2Client, hasRefreshToken: !!refreshToken, redirectUri };
}

/* ===============================
   GMAIL AUTH ROUTES FOR orders.sticktoon@gmail.com
================================ */
router.get("/gmail/auth", async (req, res) => {
  try {
    const { oauth2Client } = getGmailOAuthClient();
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["https://www.googleapis.com/auth/gmail.compose"],
    });
    return res.redirect(authUrl);
  } catch (err) {
    console.error("Gmail OAuth auth error:", err);
    return res.status(500).send("Error generating Gmail authorization URL: " + err.message);
  }
});

router.get("/gmail/callback", async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) {
      return res.status(400).send("Authorization code missing");
    }

    const { oauth2Client } = getGmailOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    if (tokens.refresh_token) {
      const envPath = path.resolve(__dirname, "../.env");
      let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
      const keyRegex = /^GMAIL_REFRESH_TOKEN=.*$/m;
      const newLine = `GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`;
      if (keyRegex.test(envContent)) {
        envContent = envContent.replace(keyRegex, newLine);
      } else {
        envContent = `${envContent.trim()}\n${newLine}\n`;
      }
      fs.writeFileSync(envPath, envContent, "utf8");
      process.env.GMAIL_REFRESH_TOKEN = tokens.refresh_token;
      console.log("✅ Saved GMAIL_REFRESH_TOKEN to backend/.env");
    }

    return res.send(`
      <div style="font-family: sans-serif; padding: 40px; text-align: center;">
        <h1 style="color: #10b981;">✅ Authorization Successful!</h1>
        <p>Gmail API connected for orders.sticktoon@gmail.com.</p>
        <p>You can close this window and return to Sticktoon.</p>
      </div>
    `);
  } catch (err) {
    console.error("Gmail OAuth callback error:", err);
    return res.status(500).send("Error exchanging authorization code: " + err.message);
  }
});

/* ===============================
   CREATE GMAIL DRAFT WITH PDF ATTACHMENT
================================ */
function buildMimeMessage({ to, subject, bodyText, filename, pdfBuffer }) {
  const boundary = `===_StickToon_Boundary_${Date.now().toString(16)}_${Math.random().toString(36).slice(2, 8)}===`;
  
  const headers = [
    `From: me`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject || "Sticktoon Product Catalogue").toString("base64")}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
  ];

  const textPart = [
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    bodyText || "Please review our product catalogue.",
    ``,
  ];

  const pdfBase64 = pdfBuffer.toString("base64");
  const attachmentPart = [
    `--${boundary}`,
    `Content-Type: application/pdf; name="${filename}"`,
    `Content-Disposition: attachment; filename="${filename}"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    pdfBase64,
    ``,
    `--${boundary}--`,
    ``,
  ];

  return headers.concat(textPart, attachmentPart).join("\r\n");
}

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

router.post("/gmail/create-draft", ...leadsAccess, async (req, res) => {
  try {
    const { leadId, catalogueId, email, subject, body } = req.body || {};

    const { oauth2Client, hasRefreshToken } = getGmailOAuthClient();

    if (!hasRefreshToken) {
      return res.status(400).json({
        message: "Google Gmail authorization is required for orders.sticktoon@gmail.com. Please run node scripts/generateGmailToken.js or connect orders.sticktoon@gmail.com.",
        requiresGoogleAuth: true,
      });
    }

    let recipientEmail = email;
    let leadObj = null;

    if (leadId) {
      leadObj = await Lead.findById(leadId);
      if (leadObj) {
        recipientEmail = leadObj.email || recipientEmail;
      }
    }

    if (!recipientEmail || !recipientEmail.trim()) {
      return res.status(400).json({ message: "Lead has no email address" });
    }

    if (!catalogueId) {
      return res.status(400).json({ message: "Catalogue ID is required" });
    }

    const pdfFilePath = path.join(CATALOGUE_TMP_DIR, `${catalogueId}.pdf`);
    if (!fs.existsSync(pdfFilePath)) {
      return res.status(404).json({ message: "Catalogue PDF file not found" });
    }

    let attachmentFilename = "catalogue.pdf";
    const metaPath = path.join(CATALOGUE_TMP_DIR, `${catalogueId}.json`);
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
        if (meta.filename) attachmentFilename = meta.filename;
      } catch (e) {}
    }

    const pdfBuffer = fs.readFileSync(pdfFilePath);
    const emailSubject = subject || "Sticktoon Product Catalogue";
    const emailBody = body || `Dear ${leadObj?.firstName ? leadObj.firstName : "Customer"},\n\nPlease review our attached product catalogue.\n\nBest regards,\nSticktoon Team`;

    const rawMime = buildMimeMessage({
      to: recipientEmail,
      subject: emailSubject,
      bodyText: emailBody,
      filename: attachmentFilename,
      pdfBuffer,
    });

    const rawBase64Url = base64UrlEncode(rawMime);

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const draftResponse = await gmail.users.drafts.create({
      userId: "me",
      requestBody: {
        message: {
          raw: rawBase64Url,
        },
      },
    });

    return res.status(201).json({
      success: true,
      draftId: draftResponse.data.id,
      messageId: draftResponse.data.message?.id,
      recipientEmail,
      viewUrl: "https://mail.google.com/mail/u/0/#drafts",
    });
  } catch (err) {
    console.error("Create Gmail draft error:", err);
    const errMsg = err?.message || "Failed to create Gmail draft";
    if (errMsg.includes("invalid_grant") || errMsg.includes("Token")) {
      return res.status(401).json({
        message: "Gmail OAuth refresh token for orders.sticktoon@gmail.com is invalid or expired. Please re-authorize.",
        requiresGoogleAuth: true,
      });
    }
    return res.status(500).json({ message: errMsg });
  }
});

/* ===============================
   SEND CATALOGUE VIA EMAIL
================================ */
router.post("/send-catalogue", ...leadsAccess, async (req, res) => {
  try {
    const { leadId, catalogueId, email, subject } = req.body || {};

    let recipientEmail = email;
    let leadObj = null;

    if (leadId) {
      leadObj = await Lead.findById(leadId);
      if (!leadObj) {
        return res.status(404).json({ message: "Lead does not exist" });
      }
      recipientEmail = leadObj.email || recipientEmail;
    }

    if (!recipientEmail || !recipientEmail.trim()) {
      return res.status(400).json({ message: "Lead has no email" });
    }

    if (!catalogueId) {
      return res.status(400).json({ message: "Catalogue file does not exist" });
    }

    const pdfFilePath = path.join(CATALOGUE_TMP_DIR, `${catalogueId}.pdf`);
    if (!fs.existsSync(pdfFilePath)) {
      return res.status(404).json({ message: "Catalogue file does not exist" });
    }

    let attachmentFilename = "catalogue.pdf";
    const metaPath = path.join(CATALOGUE_TMP_DIR, `${catalogueId}.json`);
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
        if (meta.filename) attachmentFilename = meta.filename;
      } catch (e) {
        // Fallback to default
      }
    }

    const pdfBuffer = fs.readFileSync(pdfFilePath);

    const emailSubject = subject || "StickToon Product Catalogue";
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; margin-top: 0;">Product Catalogue</h2>
        <p>Dear ${leadObj?.firstName ? leadObj.firstName : "Customer"},</p>
        <p>Please find attached our latest product catalogue for your review.</p>
        <p>If you have any questions or require custom orders, feel free to contact us.</p>
        <br/>
        <p style="font-weight: bold; color: #475569;">Best regards,<br/>StickToon Team</p>
        <hr style="border: none; border-top: 1px solid #cbd5e1; margin-top: 20px;" />
        <p style="font-size: 12px; color: #94a3b8;">This email was sent automatically from StickToon Admin.</p>
      </div>
    `;

    const result = await sendEmail({
      to: recipientEmail,
      subject: emailSubject,
      html: emailHtml,
      attachments: [
        {
          name: attachmentFilename,
          content: pdfBuffer,
        },
      ],
    });

    if (!result.ok) {
      return res.status(500).json({ message: `Email sending failed: ${result.error?.message || result.error || "Unknown error"}` });
    }

    return res.json({
      success: true,
      message: `Catalogue sent successfully to ${recipientEmail}`,
    });
  } catch (err) {
    console.error("Send catalogue error:", err);
    return res.status(500).json({ message: "Email sending failed" });
  }
});

module.exports = router;
