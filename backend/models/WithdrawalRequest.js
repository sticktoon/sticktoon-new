const mongoose = require("mongoose");

const withdrawalRequestSchema = new mongoose.Schema(
  {
    influencerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Payment details
    paymentMethod: {
      type: String,
      enum: ["upi", "bank_transfer", "paytm"],
      required: true,
    },

    // UPI ID or Bank details
    paymentDetails: {
      upiId: String,
      bankName: String,
      accountNumber: String,
      ifscCode: String,
      accountHolderName: String,
      paytmNumber: String,
    },

    // Status
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "paid"],
      default: "pending",
    },

    // Admin notes
    adminNote: {
      type: String,
      default: "",
    },

    // Transaction reference after payment
    transactionId: {
      type: String,
      default: null,
    },

    // When processed
    processedAt: {
      type: Date,
      default: null,
    },

    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Index for quick lookups
withdrawalRequestSchema.index({ influencerId: 1, status: 1 });

module.exports = mongoose.model("WithdrawalRequest", withdrawalRequestSchema);
