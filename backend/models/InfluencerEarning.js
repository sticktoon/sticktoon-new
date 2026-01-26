const mongoose = require("mongoose");

const influencerEarningSchema = new mongoose.Schema(
  {
    influencerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    promoCodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PromoCode",
      required: true,
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    // Customer who used the code
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Total units/pieces in the order
    totalUnits: {
      type: Number,
      required: true,
      min: 1,
    },

    // Earning per unit (default ₹5)
    earningPerUnit: {
      type: Number,
      default: 5,
    },

    // Total earning for this order
    totalEarning: {
      type: Number,
      required: true,
    },

    // Order amount for reference
    orderAmount: {
      type: Number,
      required: true,
    },

    // Payout status
    status: {
      type: String,
      enum: ["pending", "paid", "cancelled"],
      default: "pending",
    },

    // When payout was made
    paidAt: {
      type: Date,
      default: null,
    },

    // Payment reference/transaction ID
    paymentReference: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Index for quick lookups
influencerEarningSchema.index({ influencerId: 1, status: 1 });
influencerEarningSchema.index({ promoCodeId: 1 });

module.exports = mongoose.model("InfluencerEarning", influencerEarningSchema);
