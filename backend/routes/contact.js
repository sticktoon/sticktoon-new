const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");
const esc = require("../utils/escapeHtml");
const mongoose = require("mongoose");
const SupportMessage = require("../models/SupportMessage");
const User = require("../models/User");
const Order = require("../models/Order");
const UserOrders = require("../models/User_Orders");
const auth = require("../middleware/auth");

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

// Optional helper to extract user from Authorization header if present
const extractUserFromToken = async (req) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;
    const decoded = jwt.verify(token, secret);
    if (decoded?.id) {
      const user = await User.findById(decoded.id).select("_id email name");
      if (user) return user;
    }
  } catch (err) {
    // Ignore invalid token on public contact submission
  }
  return null;
};

/* =========================================================
   PUBLIC: SUBMIT CONTACT FORM / CREATE SLA SUPPORT REQUEST
========================================================= */
router.post("/", async (req, res) => {
  try {
    const { name, email, phone, inquiryType, message, orderId } = req.body || {};

    if (!name || !email || !phone || !inquiryType || !message) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const trimmedEmail = String(email).trim().toLowerCase();

    // Check if submitting user is logged in or exists by email
    let user = await extractUserFromToken(req);
    if (!user) {
      user = await User.findOne({ email: trimmedEmail }).select("_id email name");
    }

    // Security: Validate order ownership before linking order to ticket
    let validatedOrderId = null;
    let linkedOrder = null;

    if (orderId) {
      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(400).json({ message: "Invalid order ID format" });
      }

      linkedOrder = await Order.findById(orderId);
      if (!linkedOrder) {
        return res.status(404).json({ message: "Specified order not found" });
      }

      let userIds = user ? [user._id.toString()] : [];
      if (trimmedEmail) {
        const usersWithEmail = await User.find({ email: trimmedEmail }).select("_id");
        userIds = Array.from(new Set([...userIds, ...usersWithEmail.map(u => u._id.toString())]));
      }

      const isDirectOwner =
        (linkedOrder.userId && userIds.includes(linkedOrder.userId.toString())) ||
        (linkedOrder.userEmail && linkedOrder.userEmail.toLowerCase() === trimmedEmail);

      let isMappedOwner = false;
      if (!isDirectOwner && userIds.length > 0) {
        const mapping = await UserOrders.findOne({
          userId: { $in: userIds },
          orderId: linkedOrder._id,
        });
        if (mapping) isMappedOwner = true;
      }

      if (!isDirectOwner && !isMappedOwner) {
        return res.status(403).json({ message: "Selected order does not belong to your account" });
      }

      validatedOrderId = linkedOrder._id;
    }

    let supportMessage = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const ticketId = await getNextTicketId();
      try {
        supportMessage = await SupportMessage.create({
          name,
          email: trimmedEmail,
          phone,
          inquiryType,
          message,
          ticketId,
          userId: user?._id || null,
          orderId: validatedOrderId,
          messages: [
            {
              sender: user?._id || null,
              senderRole: "customer",
              senderName: name,
              message,
              createdAt: new Date(),
            },
          ],
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
    const orderHtmlSection = linkedOrder
      ? `<p><strong>Linked Order:</strong> #${linkedOrder._id} (Amount: ₹${linkedOrder.amount}, Status: ${linkedOrder.status})</p>`
      : "";

    const html = `
      <h2>New Contact Form Submission</h2>
      <p><strong>Ticket ID:</strong> ${supportMessage.ticketId}</p>
      <p><strong>Name:</strong> ${esc(name)}</p>
      <p><strong>Email:</strong> ${esc(trimmedEmail)}</p>
      <p><strong>Phone:</strong> ${esc(phone)}</p>
      <p><strong>Inquiry Type:</strong> ${esc(inquiryType)}</p>
      ${orderHtmlSection}
      <p><strong>Message:</strong></p>
      <p>${esc(message).replace(/\n/g, "<br/>")}</p>
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
      to: trimmedEmail,
      subject: `We received your support request [${supportMessage.ticketId}]`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <p>Hi ${esc(name)},</p>
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

/* =========================================================
   CUSTOMER: GET MY SUPPORT REQUESTS
========================================================= */
router.get("/my-requests", auth, async (req, res) => {
  try {
    const userEmail = req.user.email ? req.user.email.toLowerCase() : "";

    const filterConditions = [];
    if (req.user.id) {
      filterConditions.push({ userId: req.user.id });
    }
    if (userEmail) {
      filterConditions.push({ email: userEmail });
    }

    if (filterConditions.length === 0) {
      return res.json([]);
    }

    const requests = await SupportMessage.find({ $or: filterConditions })
      .populate("orderId")
      .sort({ createdAt: -1 });

    // Format requests and ensure legacy requests without messages array have fallback initial message
    const formatted = requests.map((doc) => {
      const obj = doc.toObject();
      if (!obj.messages || obj.messages.length === 0) {
        obj.messages = [
          {
            sender: obj.userId || null,
            senderRole: "customer",
            senderName: obj.name,
            message: obj.message,
            createdAt: obj.createdAt,
          },
        ];
      }
      return obj;
    });

    res.json(formatted);
  } catch (err) {
    console.error("Fetch customer support requests error:", err);
    res.status(500).json({ message: "Failed to fetch support requests" });
  }
});

/* =========================================================
   CUSTOMER: GET SINGLE SUPPORT REQUEST DETAILS
========================================================= */
router.get("/my-requests/:id", auth, async (req, res) => {
  try {
    const request = await SupportMessage.findById(req.params.id).populate("orderId");
    if (!request) {
      return res.status(404).json({ message: "Support request not found" });
    }

    const userEmail = req.user.email ? req.user.email.toLowerCase() : "";
    const isOwner =
      (request.userId && String(request.userId) === String(req.user.id)) ||
      (request.email && request.email.toLowerCase() === userEmail);

    if (!isOwner) {
      return res.status(403).json({ message: "Access denied" });
    }

    const obj = request.toObject();
    if (!obj.messages || obj.messages.length === 0) {
      obj.messages = [
        {
          sender: obj.userId || null,
          senderRole: "customer",
          senderName: obj.name,
          message: obj.message,
          createdAt: obj.createdAt,
        },
      ];
    }

    res.json(obj);
  } catch (err) {
    console.error("Fetch single customer support request error:", err);
    res.status(500).json({ message: "Failed to fetch support request details" });
  }
});

/* =========================================================
   CUSTOMER: REPLY TO ACTIVE SUPPORT REQUEST
========================================================= */
router.post("/my-requests/:id/reply", auth, async (req, res) => {
  try {
    const { reply } = req.body || {};

    if (!reply || typeof reply !== "string" || !reply.trim()) {
      return res.status(400).json({ message: "Reply message is required" });
    }

    const request = await SupportMessage.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Support request not found" });
    }

    const userEmail = req.user.email ? req.user.email.toLowerCase() : "";
    const isOwner =
      (request.userId && String(request.userId) === String(req.user.id)) ||
      (request.email && request.email.toLowerCase() === userEmail);

    if (!isOwner) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Initialize messages if empty
    if (!request.messages || request.messages.length === 0) {
      request.messages = [
        {
          sender: request.userId || null,
          senderRole: "customer",
          senderName: request.name,
          message: request.message,
          createdAt: request.createdAt,
        },
      ];
    }

    // Get user's name
    let customerName = request.name;
    if (req.user.id) {
      const userDoc = await User.findById(req.user.id).select("name");
      if (userDoc?.name) customerName = userDoc.name;
    }

    // Push new customer message
    request.messages.push({
      sender: req.user.id,
      senderRole: "customer",
      senderName: customerName,
      message: reply.trim(),
      createdAt: new Date(),
    });

    // Reopen ticket status if previously resolved
    if (request.status === "Resolved") {
      request.status = "In Progress";
      request.resolvedAt = null;
    }

    // Ensure userId is saved if not linked previously
    if (!request.userId && req.user.id) {
      request.userId = req.user.id;
    }

    await request.save();

    // Send email alert to admin regarding customer reply
    const adminEmail =
      process.env.ADMIN_EMAIL || process.env.FROM_EMAIL || "sticktoon.xyz@gmail.com";

    sendEmail({
      to: adminEmail,
      subject: `Customer Reply on Ticket [${request.ticketId}]: ${request.inquiryType}`,
      html: `
        <h2>Customer Reply Received</h2>
        <p><strong>Ticket ID:</strong> ${request.ticketId}</p>
        <p><strong>Customer:</strong> ${esc(customerName)} (${esc(request.email)})</p>
        <p><strong>Message:</strong></p>
        <p>${esc(reply.trim()).replace(/\n/g, "<br/>")}</p>
      `,
    }).catch((emailErr) => {
      console.error("Admin notification email for customer reply failed:", emailErr);
    });

    res.json(request);
  } catch (err) {
    console.error("Customer reply error:", err);
    res.status(500).json({ message: "Failed to send reply" });
  }
});

module.exports = router;
