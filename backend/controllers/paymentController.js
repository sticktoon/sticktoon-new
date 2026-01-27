const axios = require("axios");
const Order = require("../models/Order");
const Invoice = require("../models/Invoice");
const UserOrders = require("../models/User_Orders");
const PromoCode = require("../models/PromoCode");
const InfluencerEarning = require("../models/InfluencerEarning");
const sendEmail = require("../utils/sendEmail");
const promoUsedEmailTemplate = require("../utils/promoUsedEmail");

/* =========================
   CREATE ORDER
========================= */
exports.createOrder = async (req, res) => {
  try {
    const { address, items, promoCode } = req.body;
    const userId = req.user.id;

    // SAFETY: ensure items is always an array
    const safeItems = Array.isArray(items) ? items : [];

    if (safeItems.length === 0) {
      return res.status(400).json({ message: "Items required" });
    }

    if (!address?.name || !address?.street || !address?.phone) {
      return res.status(400).json({ message: "Address required" });
    }

    // Validate phone number
    if (!/^\d{10,15}$/.test(address.phone)) {
      return res.status(400).json({ message: "Invalid phone number" });
    }

    // Get user email from database
    const User = require("../models/User");
    const user = await User.findById(userId).select("email");

    if (!user || !user.email) {
      return res.status(400).json({ message: "User email not found" });
    }

    const email = user.email;
    const phone = address.phone;

    // Calculate subtotal safely
    const subtotal = safeItems.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0
    );

    const deliveryCharges = 99;

    // Apply promo code discount
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
            discount = (subtotal * promo.discountValue) / 100;
            if (promo.maxDiscount && discount > promo.maxDiscount) {
              discount = promo.maxDiscount;
            }
          } else {
            discount = promo.discountValue;
          }

          if (discount > subtotal) {
            discount = subtotal;
          }

          discount = Math.round(discount);
          appliedPromoCode = promo.code;
          promoForNotification = promo;

          // Increment usage count
          promo.usedCount += 1;
          await promo.save();
        }
      }
    }

    const totalAmount = subtotal + deliveryCharges - discount;

    // ALWAYS UNIQUE
    const gatewayOrderId = `order_${userId}_${Date.now()}`;

    // CREATE ORDER (ITEMS GUARANTEED)
    const order = await Order.create({
      userId,
      items: safeItems,
      subtotal,
      deliveryCharges,
      discount,
      promoCode: appliedPromoCode,
      amount: totalAmount,
      gatewayOrderId,
      address,
      status: "PENDING",
    });

    // Notify admin/influencer when promo code is used
    if (promoForNotification && promoForNotification.createdBy?.email) {
      try {
        // Calculate total units in order
        const totalUnits = safeItems.reduce((sum, item) => sum + Number(item.quantity), 0);
        
        // Calculate influencer earning if it's an influencer promo
        let earningGenerated = 0;
        if (promoForNotification.promoType === "influencer") {
          const earningPerUnit = promoForNotification.earningPerUnit || 5;
          earningGenerated = totalUnits * earningPerUnit;

          // Create earning record for influencer
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

          // Update promo code stats
          await PromoCode.findByIdAndUpdate(promoForNotification._id, {
            $inc: {
              totalEarnings: earningGenerated,
              totalUnitsSold: totalUnits,
            },
          });

          // Update influencer's earnings in their User profile
          await User.findByIdAndUpdate(promoForNotification.createdBy._id, {
            $inc: {
              "influencerProfile.totalEarnings": earningGenerated,
              "influencerProfile.pendingEarnings": earningGenerated,
            },
          });

          console.log("Influencer earning created: Rs" + earningGenerated + " for " + totalUnits + " units");
        }

        // Add usage to history
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

        // Send email notification to admin/influencer
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

        console.log("Promo notification sent to " + promoForNotification.createdBy.email);
      } catch (notifyErr) {
        // Don't fail the order if notification fails
        console.error("Promo notification error:", notifyErr.message);
      }
    }

    // CREATE CASHFREE ORDER
    const response = await axios.post(
      "https://sandbox.cashfree.com/pg/orders",
      {
        order_id: gatewayOrderId,
        order_amount: totalAmount,
        order_currency: "INR",
        customer_details: {
          customer_id: userId.toString(),
          customer_email: email,
          customer_phone: phone,
        },
        order_meta: {
          notify_url: `${process.env.WEBHOOK_BASE_URL}/api/cashfree/webhook`,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-client-id": process.env.CASHFREE_APP_ID,
          "x-client-secret": process.env.CASHFREE_SECRET_KEY,
          "x-api-version": "2023-08-01",
        },
      }
    );

    return res.json({
      paymentSessionId: response.data.payment_session_id,
      orderId: order._id,
    });
  } catch (err) {
    console.error("Create order error:", err);
    return res.status(500).json({ message: "Failed to create order" });
  }
};

/* =========================
   UPDATE ORDER STATUS
   (USED BY WEBHOOK ONLY)
========================= */
exports.updateOrderStatus = async (req, res) => {
  console.log("updateOrderStatus HIT", req.body);

  try {
    const {
      gatewayOrderId,
      status,
      paymentMethod,
      gatewayPaymentId,
    } = req.body;

    const order = await Order.findOne({ gatewayOrderId });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Prevent double processing
    if (order.invoiceId) {
      return res.json({ success: true, order });
    }

    order.status = status;
    order.paymentMethod = paymentMethod || order.paymentMethod;
    order.gatewayPaymentId = gatewayPaymentId || order.gatewayPaymentId;

    // HANDLE ALL SUCCESS STATES
    const isPaid =
      status === "SUCCESS" ||
      status === "PAID" ||
      status === "COMPLETED" ||
      status === "CAPTURED";

    if (isPaid) {
      const invoice = await Invoice.create({
        orderId: order._id,
        userId: order.userId,
        amount: order.amount,
        paymentMethod,
        invoiceNumber: "INV-" + Date.now(),
        address: order.address,
        paymentGateway: "Cashfree",
      });

      order.invoiceId = invoice._id;

      // Create user order record
      await UserOrders.create({
        userId: order.userId,
        orderId: order._id,
        invoiceId: invoice._id,
      });

      // Update InfluencerEarning status to 'paid' for this order
      await InfluencerEarning.updateMany(
        { orderId: order._id, status: "pending" },
        { $set: { status: "paid" } }
      );
    }

    await order.save();
    return res.json({ success: true, order });
  } catch (err) {
    console.error("Update order status error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

