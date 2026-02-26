const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const SupportMessage = require("../models/SupportMessage");
const sendEmail = require("../utils/sendEmail");

router.get("/", auth, async (req, res) => {
  try {
    const messages = await SupportMessage.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    console.error("Fetch support messages error:", err);
    res.status(500).json({ message: "Failed to fetch support messages" });
  }
});

router.patch("/:id/status", auth, async (req, res) => {
  try {
    const { status } = req.body || {};
    const allowedStatuses = ["New", "In Progress", "Resolved"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const supportMessage = await SupportMessage.findById(req.params.id);
    if (!supportMessage) {
      return res.status(404).json({ message: "Support message not found" });
    }

    const now = new Date();
    supportMessage.status = status;

    if (
      !supportMessage.firstResponseAt &&
      (status === "In Progress" || status === "Resolved")
    ) {
      supportMessage.firstResponseAt = now;
    }

    if (status === "Resolved") {
      supportMessage.resolvedAt = now;
    } else {
      supportMessage.resolvedAt = null;
    }

    await supportMessage.save();
    res.json(supportMessage);
  } catch (err) {
    console.error("Update support message status error:", err);
    res.status(500).json({ message: "Failed to update support message status" });
  }
});

router.patch("/:id/internal-note", auth, async (req, res) => {
  try {
    const { internalNote } = req.body || {};

    if (typeof internalNote !== "string") {
      return res.status(400).json({ message: "Invalid internal note" });
    }

    const updated = await SupportMessage.findByIdAndUpdate(
      req.params.id,
      { internalNote: internalNote.trim() },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Support message not found" });
    }

    res.json(updated);
  } catch (err) {
    console.error("Update support internal note error:", err);
    res.status(500).json({ message: "Failed to update internal note" });
  }
});

router.patch("/:id/sla-deadline", auth, async (req, res) => {
  try {
    const { slaDeadlineAt } = req.body || {};

    if (!slaDeadlineAt) {
      return res.status(400).json({ message: "SLA deadline is required" });
    }

    const parsed = new Date(slaDeadlineAt);
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({ message: "Invalid SLA deadline format" });
    }

    const updated = await SupportMessage.findByIdAndUpdate(
      req.params.id,
      { slaDeadlineAt: parsed },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Support message not found" });
    }

    res.json(updated);
  } catch (err) {
    console.error("Update support SLA deadline error:", err);
    res.status(500).json({ message: "Failed to update SLA deadline" });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const deleted = await SupportMessage.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Support message not found" });
    }

    return res.json({ message: "Support message deleted successfully" });
  } catch (err) {
    console.error("Delete support message error:", err);
    return res.status(500).json({ message: "Failed to delete support message" });
  }
});

router.post("/:id/reply", auth, async (req, res) => {
  try {
    const { reply } = req.body || {};

    if (!reply || typeof reply !== "string" || !reply.trim()) {
      return res.status(400).json({ message: "Reply message is required" });
    }

    const supportMessage = await SupportMessage.findById(req.params.id);
    if (!supportMessage) {
      return res.status(404).json({ message: "Support message not found" });
    }

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <p>Hi ${supportMessage.name || "there"},</p>
        <p>${reply.trim().replace(/\n/g, "<br/>")}</p>
        <p style="margin-top: 24px;">Regards,<br/>StickToon Support Team</p>
      </div>
    `;

    const ticketLabel = supportMessage.ticketId
      ? ` [${supportMessage.ticketId}]`
      : "";

    const emailResult = await sendEmail({
      to: supportMessage.email,
      subject: `Re: Your Support Request${ticketLabel} - StickToon`,
      html: `
        <p><strong>Ticket ID:</strong> ${supportMessage.ticketId || "N/A"}</p>
        ${html}
      `,
    });

    if (!emailResult?.ok) {
      return res.status(500).json({ message: "Failed to send reply email" });
    }

    if (!supportMessage.firstResponseAt) {
      supportMessage.firstResponseAt = new Date();
    }

    if (supportMessage.status !== "Resolved") {
      supportMessage.status = "In Progress";
    }
    await supportMessage.save();

    return res.json({
      message: "Reply sent successfully",
      status: supportMessage.status,
      supportMessage,
    });
  } catch (err) {
    console.error("Reply support message error:", err);
    return res.status(500).json({ message: "Failed to send support reply" });
  }
});

module.exports = router;
