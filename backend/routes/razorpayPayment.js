const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const razorpay = require("../config/razorpay");
const Order = require("../models/Order");
const Invoice = require("../models/Invoice");
const UserOrders = require("../models/User_Orders");
const PromoCode = require("../models/PromoCode");
const InfluencerEarning = require("../models/InfluencerEarning");
const User = require("../models/User");
const auth = require("../middleware/auth");
const sendEmail = require("../utils/sendEmail");
const promoUsedEmailTemplate = require("../utils/promoUsedEmail");
const generateInvoicePDF = require("../utils/generateInvoicePDF");

/* =========================
   CREATE RAZORPAY ORDER
========================= */
router.post("/create-order", auth, async (req, res) => {
  try {
    const { address, items, promoCode } = req.body;
    const userId = req.user.id;

    const safeItems = Array.isArray(items) ? items : [];

    if (safeItems.length === 0) {
      return res.status(400).json({ message: "Items required" });
    }

    if (!address?.name || !address?.street || !address?.phone) {
      return res.status(400).json({ message: "Address required" });
    }

    if (!/^\d{10,15}$/.test(address.phone)) {
      return res.status(400).json({ message: "Invalid phone number" });
    }

    const user = await User.findById(userId).select("email");
    if (!user || !user.email) {
      return res.status(400).json({ message: "User email not found" });
    }

    const email = user.email;

    // Calculate subtotal
    const subtotal = safeItems.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0
    );

    const deliveryCharges = 99;
    const totalBeforeDiscount = subtotal + deliveryCharges;

    // Apply promo code
    let discount = 0;
    let appliedPromoCode = null;
    let promoForNotification = null;

    if (promoCode) {
      const promo = await PromoCode.findOne({
        code: promoCode.toUpperCase().trim(),
        isActive: true,
      }).populate("createdBy", "email name");

      if (promo) {
        const now = new Date();
        if (
          now >= promo.validFrom &&
          now <= promo.validUntil &&
          (!promo.usageLimit || promo.usedCount < promo.usageLimit) &&
          subtotal >= promo.minOrderAmount
        ) {
          if (promo.discountType === "percentage") {
            // Apply percentage discount on TOTAL (subtotal + delivery)
            discount = (totalBeforeDiscount * promo.discountValue) / 100;
            if (promo.maxDiscount && discount > promo.maxDiscount) {
              discount = promo.maxDiscount;
            }
          } else {
            discount = promo.discountValue;
          }

          if (discount > totalBeforeDiscount) {
            discount = totalBeforeDiscount;
          }

          discount = Math.round(discount);
          appliedPromoCode = promo.code;
          promoForNotification = promo;

          promo.usedCount += 1;
          await promo.save();
        }
      }
    }

    const totalAmount = subtotal + deliveryCharges - discount;

    // Create Razorpay Order
    // receipt max length is 40 characters
    const shortUserId = userId.slice(-8);
    const timestamp = Date.now().toString().slice(-10);
    const receiptId = `rcpt_${shortUserId}_${timestamp}`;
    
    const razorpayOrder = await razorpay.orders.create({
      amount: totalAmount * 100, // Razorpay uses paise (multiply by 100)
      currency: "INR",
      receipt: receiptId,
      notes: {
        userId: userId,
        customerEmail: email,
        customerName: address.name,
      },
    });

    // Save order in DB
    const order = await Order.create({
      userId,
      items: safeItems,
      subtotal,
      deliveryCharges,
      discount,
      promoCode: appliedPromoCode,
      amount: totalAmount,
      gatewayOrderId: razorpayOrder.id,
      address,
      status: "PENDING",
      paymentGateway: "razorpay",
    });

    // Handle influencer promo
    if (promoForNotification && promoForNotification.createdBy?.email) {
      try {
        const totalUnits = safeItems.reduce((sum, item) => sum + Number(item.quantity), 0);

        let earningGenerated = 0;
        if (promoForNotification.promoType === "influencer") {
          const earningPerUnit = promoForNotification.earningPerUnit || 5;
          earningGenerated = totalUnits * earningPerUnit;

          await InfluencerEarning.create({
            influencerId: promoForNotification.createdBy._id,
            promoCodeId: promoForNotification._id,
            orderId: order._id,
            customerId: userId,
            totalUnits: totalUnits,
            earningPerUnit: earningPerUnit,
            totalEarning: earningGenerated,
            orderAmount: totalAmount,
            status: "pending",
          });

          await PromoCode.findByIdAndUpdate(promoForNotification._id, {
            $inc: {
              totalEarnings: earningGenerated,
              totalUnitsSold: totalUnits,
            },
          });

          await User.findByIdAndUpdate(promoForNotification.createdBy._id, {
            $inc: {
              "influencerProfile.totalEarnings": earningGenerated,
              "influencerProfile.pendingEarnings": earningGenerated,
            },
          });
        }

        await PromoCode.findByIdAndUpdate(promoForNotification._id, {
          $push: {
            usageHistory: {
              userId: userId,
              orderId: order._id,
              discountApplied: discount,
              unitsSold: totalUnits,
              earningGenerated: earningGenerated,
              usedAt: new Date(),
            },
          },
        });

        const emailHtml = promoUsedEmailTemplate({
          promoCode: promoForNotification.code,
          discountApplied: discount,
          orderAmount: totalAmount,
          customerName: address.name,
          customerEmail: email,
          usedCount: promoForNotification.usedCount,
          usageLimit: promoForNotification.usageLimit,
          orderId: order._id.toString(),
          isInfluencer: promoForNotification.promoType === "influencer",
          totalUnits: totalUnits,
          earningPerUnit: promoForNotification.earningPerUnit || 5,
          earningGenerated: earningGenerated,
        });

        const emailSubject = promoForNotification.promoType === "influencer"
          ? "You earned Rs" + earningGenerated + "! Code " + promoForNotification.code + " used"
          : "Promo Code " + promoForNotification.code + " Used!";

        await sendEmail({
          to: promoForNotification.createdBy.email,
          subject: emailSubject,
          html: emailHtml,
        });
      } catch (notifyErr) {
        console.error("Promo notification error:", notifyErr.message);
      }
    }

    res.json({
      success: true,
      orderId: order._id,
      razorpayOrderId: razorpayOrder.id,
      amount: totalAmount,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("Create Razorpay order error:", err);
    res.status(500).json({ message: "Failed to create order" });
  }
});

/* =========================
   VERIFY PAYMENT
========================= */
router.post("/verify-payment", auth, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = req.body;

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isValid = expectedSignature === razorpay_signature;

    if (!isValid) {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    // Update order status
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.status = "SUCCESS";
    order.gatewayPaymentId = razorpay_payment_id;
    await order.save();

    /* =========================
   ✅ UPDATE INFLUENCER EARNING TO PAID
========================= */

const earnings = await InfluencerEarning.find({ orderId: order._id });

for (const earn of earnings) {
  // change earning status
  earn.status = "paid";
  await earn.save();

  // move pending → paid in influencer profile
  await User.findByIdAndUpdate(earn.influencerId, {
    $inc: {
      "influencerProfile.pendingEarnings": -earn.totalEarning,
      "influencerProfile.paidEarnings": earn.totalEarning,
    },
  });
}


    // Create invoice
    const lastInvoice = await Invoice.findOne().sort({ createdAt: -1 });
    let invoiceNumber = "STK-0001";
    if (lastInvoice && lastInvoice.invoiceNumber) {
      const lastNum = parseInt(lastInvoice.invoiceNumber.split("-")[1]) || 0;
      invoiceNumber = `STK-${String(lastNum + 1).padStart(4, "0")}`;
    }

    // Get user email
    const user = await User.findById(order.userId);

    const invoice = await Invoice.create({
      orderId: order._id,
      userId: order.userId,
      email: user?.email || null,
      invoiceNumber,
      amount: order.amount,
      currency: order.currency || "INR",
      paymentMethod: "Razorpay",
      paymentGateway: "razorpay",
      address: order.address,
    });

    // Update order with invoice ID
    order.invoiceId = invoice._id;
    await order.save();

    // Update user orders
    await UserOrders.findOneAndUpdate(
      { userId: order.userId },
      { $push: { orders: order._id } },
      { upsert: true, new: true }
    );

    // Generate Invoice PDF
    let invoicePdfBuffer = null;
    try {
      invoicePdfBuffer = await generateInvoicePDF({ invoice, order });
      console.log("✅ Invoice PDF generated successfully");
    } catch (pdfErr) {
      console.error("Invoice PDF generation error:", pdfErr.message);
    }

    // Send confirmation email with Invoice to BUYER
    if (user?.email) {
      try {
        const emailOptions = {
          to: user.email,
          subject: `Order Confirmed! #${order._id.toString().slice(-8).toUpperCase()} - Invoice Attached`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #10b981;">Order Confirmed!</h1>
              <p>Hi ${order.address?.name || "Customer"},</p>
              <p>Your order has been confirmed and will be shipped soon.</p>
              <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Order ID:</strong> ${order._id.toString().slice(-8).toUpperCase()}</p>
                <p style="margin: 5px 0;"><strong>Invoice No:</strong> ${invoice.invoiceNumber}</p>
                <p style="margin: 5px 0;"><strong>Amount:</strong> ₹${order.amount}</p>
                <p style="margin: 0;"><strong>Items:</strong> ${order.items.length}</p>
              </div>
              <p>📎 Your invoice is attached to this email.</p>
              <p>Thank you for shopping with StickToon!</p>
            </div>
          `,
        };

        // Add PDF attachment if generated successfully
        if (invoicePdfBuffer) {
          emailOptions.attachments = [
            {
              name: `Invoice-${invoice.invoiceNumber}.pdf`,
              content: invoicePdfBuffer.toString("base64"),
            },
          ];
        }

        await sendEmail(emailOptions);
        console.log("✅ Buyer email with invoice sent to:", user.email);
      } catch (emailErr) {
        console.error("Buyer email error:", emailErr.message);
      }
    }

    // Send order notification to OWNER (sticktoon.xyz@gmail.com)
    const ownerEmail = process.env.ADMIN_EMAIL || "sticktoon.xyz@gmail.com";
    const frontendUrl = process.env.FRONTEND_URL ;
    try {
      const itemsList = order.items.map(item => {
        // Build image URL - handle different image path formats
        let imageUrl = '';
        if (item.image) {
          if (item.image.startsWith('http')) {
            imageUrl = item.image;
          } else if (item.image.startsWith('/')) {
            imageUrl = `${frontendUrl}${item.image}`;
          } else {
            imageUrl = `${frontendUrl}/${item.image}`;
          }
        }
        
        return `<tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
            <div style="display: flex; align-items: center; gap: 10px;">
              ${imageUrl ? `<img src="${imageUrl}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; border: 1px solid #e5e7eb;">` : ''}
              <span style="font-weight: 500;">${item.name}</span>
            </div>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: bold;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">₹${item.price}</td>
        </tr>`;
      }).join('');

      await sendEmail({
        to: ownerEmail,
        subject: `🛒 New Order Received! #${order._id.toString().slice(-8).toUpperCase()} - ₹${order.amount}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #3b82f6; margin-bottom: 20px;">🎉 New Order Received!</h1>
            
            <div style="background: #f0fdf4; border: 2px solid #22c55e; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="margin: 0; color: #166534;">Order ID: ${order._id.toString().slice(-8).toUpperCase()}</h2>
              <p style="margin: 5px 0 0; font-size: 24px; font-weight: bold; color: #166534;">₹${order.amount}</p>
            </div>

            <h3 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">📦 Order Details</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="padding: 10px; text-align: left;">Item</th>
                  <th style="padding: 10px; text-align: center;">Qty</th>
                  <th style="padding: 10px; text-align: right;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsList}
              </tbody>
            </table>

            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 5px 0;"><strong>Subtotal:</strong> ₹${order.subtotal}</p>
              <p style="margin: 5px 0;"><strong>Delivery:</strong> ₹${order.deliveryCharges}</p>
              ${order.discount > 0 ? `<p style="margin: 5px 0; color: #16a34a;"><strong>Discount:</strong> -₹${order.discount}</p>` : ''}
              ${order.promoCode ? `<p style="margin: 5px 0;"><strong>Promo Code:</strong> ${order.promoCode}</p>` : ''}
              <hr style="border: 1px solid #d1d5db; margin: 10px 0;">
              <p style="margin: 5px 0; font-size: 18px;"><strong>Total:</strong> ₹${order.amount}</p>
            </div>

            <h3 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">📍 Shipping Address</h3>
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 5px 0;"><strong>Name:</strong> ${order.address?.name || 'N/A'}</p>
              <p style="margin: 5px 0;"><strong>Address:</strong> ${order.address?.street || 'N/A'}</p>
              <p style="margin: 5px 0;"><strong>Phone:</strong> ${order.address?.phone || 'N/A'}</p>
            </div>

            <h3 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">👤 Customer Info</h3>
            <p><strong>Email:</strong> ${user?.email || 'N/A'}</p>
            <p><strong>Payment ID:</strong> ${razorpay_payment_id}</p>
            <p><strong>Invoice:</strong> ${invoice.invoiceNumber}</p>

            <p style="margin-top: 15px;">📎 Invoice PDF is attached below.</p>

            <div style="margin-top: 20px; padding: 15px; background: #eff6ff; border-radius: 8px; text-align: center;">
              <a href="${process.env.FRONTEND_URL}/#/admin/orders" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">View in Admin Panel</a>
            </div>
          </div>
        `,
        attachments: invoicePdfBuffer ? [
          {
            name: `Invoice-${invoice.invoiceNumber}.pdf`,
            content: invoicePdfBuffer.toString("base64"),
          },
        ] : [],
      });
      console.log("✅ Owner notification email with invoice sent to:", ownerEmail);
    } catch (ownerEmailErr) {
      console.error("Owner email error:", ownerEmailErr.message);
    }

    res.json({
      success: true,
      message: "Payment verified successfully",
      orderId: order._id,
    });
  } catch (err) {
    console.error("Verify payment error:", err);
    res.status(500).json({ message: "Payment verification failed" });
  }
});

/* =========================
   PAYMENT FAILED
========================= */
router.post("/payment-failed", auth, async (req, res) => {
  try {
    const { orderId, error } = req.body;

    await Order.findByIdAndUpdate(orderId, {
      status: "FAILED",
      failureReason: error?.description || "Payment failed",
    });

    res.json({ success: true, message: "Order marked as failed" });
  } catch (err) {
    console.error("Payment failed handler error:", err);
    res.status(500).json({ message: "Error handling failed payment" });
  }
});

module.exports = router;