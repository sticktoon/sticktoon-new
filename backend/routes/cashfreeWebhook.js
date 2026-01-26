const express = require("express");
const router = express.Router();

const Order = require("../models/Order");
const Invoice = require("../models/Invoice");
const UserOrders = require("../models/User_Orders");
const User = require("../models/User");

const sendEmail = require("../utils/sendEmail");
const generateInvoicePDF = require("../utils/generateInvoicePDF");

const {
  adminOrderSuccessEmail,
  userOrderSuccessEmail,
} = require("../utils/emailTemplates");

/* =========================
   CASHFREE WEBHOOK
========================= */
router.post("/webhook", async (req, res) => {
  console.log("🔥 CASHFREE WEBHOOK HIT");

  try {
    const data = req.body?.data;
    if (!data?.order || !data?.payment) {
      console.log("⚠️ Incomplete webhook data received");
      return res.sendStatus(200);
    }

    const gatewayOrderId = data.order.order_id;
    const paymentStatus = data.payment.payment_status;
    const paymentMethodObj = data.payment.payment_method || {};

    if (!gatewayOrderId || !paymentStatus) {
      console.log("⚠️ Missing gatewayOrderId or paymentStatus");
      return res.sendStatus(200);
    }

    const order = await Order.findOne({ gatewayOrderId });
    if (!order) {
      console.log("❌ Order not found:", gatewayOrderId);
      return res.sendStatus(200);
    }

    /* =========================
       RESOLVE PAYMENT METHOD
    ========================= */
    let resolvedMethod = "UNKNOWN";
    if (paymentMethodObj.upi) resolvedMethod = "UPI";
    else if (paymentMethodObj.card) resolvedMethod = "CARD";
    else if (paymentMethodObj.netbanking) resolvedMethod = "NET_BANKING";
    else if (paymentMethodObj.wallet) resolvedMethod = "WALLET";

    const isPaid = ["SUCCESS", "PAID", "COMPLETED", "CAPTURED"].includes(
      paymentStatus
    );

    /* =========================
       HANDLE SUCCESS (EMAIL FIXED)
    ========================= */
    if (isPaid) {
      // 🔒 Idempotency: do nothing if already success
      if (order.status === "SUCCESS") {
        return res.sendStatus(200);
      }

      /* =========================
         🔥 EMAIL — ONLY FROM DB
      ========================= */
      const user = await User.findById(order.userId).select("email");

      if (!user || !user.email) {
        console.error("❌ User email missing in DB for order:", order._id);
        return res.sendStatus(200);
      }

      const userEmail = user.email;
      console.log("📧 USER EMAIL (DB):", userEmail);

      /* =========================
         UPDATE ORDER
      ========================= */
      order.status = "SUCCESS";
      order.paymentMethod = resolvedMethod;
      order.gatewayPaymentId = String(
        data.payment.cf_payment_id || ""
      );
      order.userEmail = userEmail;

      /* =========================
         FIND OR CREATE INVOICE
      ========================= */
      let invoice = await Invoice.findOne({ orderId: order._id });

      if (!invoice) {
        invoice = await Invoice.create({
          orderId: order._id,
          userId: order.userId,
          email: userEmail,
          invoiceNumber: "INV-" + Date.now(),
          amount: order.amount,
          currency: "INR",
          address: order.address,
          paymentMethod: resolvedMethod,
          paymentGateway: "Cashfree",
        });
      }

      order.invoiceId = invoice._id;

      /* =========================
         USER_ORDERS (SAFE)
      ========================= */
      const existingUserOrder = await UserOrders.findOne({
        orderId: order._id,
      });

      if (!existingUserOrder) {
        await UserOrders.create({
          userId: order.userId,
          orderId: order._id,
          invoiceId: invoice._id,
        });
      }

      await order.save();

      /* =========================
         GENERATE PDF
      ========================= */
      const pdfBuffer = await generateInvoicePDF({
        invoice,
        order: {
          ...order.toObject(),
          userEmail,
        },
      });

      /* =========================
         SEND USER EMAIL
      ========================= */
      await sendEmail({
        to: userEmail,
        subject: "🧾 Your StickToon Invoice",
        html: userOrderSuccessEmail({ order, invoice }),
        attachment: {
          filename: `${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer,
        },
      });

      /* =========================
         SEND ADMIN EMAIL
      ========================= */
      await sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: "🧾 New Paid Order – StickToon",
        html: adminOrderSuccessEmail({ order, invoice }),
        attachment: {
          filename: `${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer,
        },
      });
    }

    /* =========================
       HANDLE FAILURE
    ========================= */
    if (["FAILED", "USER_DROPPED"].includes(paymentStatus)) {
      order.status = "FAILED";
      await order.save();
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error("❌ Webhook crash:", err);
    return res.sendStatus(200); // NEVER 500 to Cashfree
  }
});

module.exports = router;
