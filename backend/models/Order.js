const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    badgeId: {
      type: String,
      default: null,
    },

    name: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    image: {
      type: String,
      default: null, // ✅ STORE IMAGE PATH
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ✅ ENSURE ITEMS ALWAYS EXISTS (even if empty)
    items: {
      type: [orderItemSchema],
      default: [],
    },

    subtotal: {
      type: Number,
      default: 0,
    },

    deliveryCharges: {
      type: Number,
      default: 99,
    },

    discount: {
      type: Number,
      default: 0,
    },

    promoCode: {
      type: String,
      default: null,
    },

    // total = subtotal + delivery - discount
    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "INR",
    },

    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED"],
      default: "PENDING",
      index: true,
    },

    gatewayOrderId: {
      type: String,
      index: true,
      default: null,
    },

    paymentGateway: {
      type: String,
      default: "Razorpay",
    },

    paymentMethod: {
      type: String,
      default: null, // UPI / CARD / NETBANKING
    },

    address: {
      name: { type: String, default: null },
      street: { type: String, default: null },
      phone: { type: String, default: null },
    },

    gatewayPaymentId: {
      type: String,
      default: null,
      index: true,
    },

    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
