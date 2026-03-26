const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index:true,
    },

    password: {
      type: String,
      select: false, // 🔐 NEVER return password by default
    },

    provider: {
      type: String,
      enum: ["credentials", "google"],
      default: "credentials",
    },

    // ✅ ADD THIS 👇
    role: {
      type: String,
      enum: ["user", "admin", "influencer"],
      default: "user",
      index:true,
    },

    // Influencer specific fields
    influencerProfile: {
      applicationStatus: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
      },
      isApproved: { type: Boolean, default: false },
      promoCodeId: { type: mongoose.Schema.Types.ObjectId, ref: "PromoCode" },
      totalEarnings: { type: Number, default: 0 },
      pendingEarnings: { type: Number, default: 0 },
      withdrawnAmount: { type: Number, default: 0 },
      minWithdrawalAmount: { type: Number, default: 100 }, // Minimum ₹100 to withdraw
      phone: String,
      upiId: String,
      bankDetails: {
        bankName: String,
        accountNumber: String,
        ifscCode: String,
        accountHolderName: String,
      },
      instagram: String,
      youtube: String,
      bio: String,
    },

    avatar: {
      type: String, // URL or initial (A, B, etc.)
    },

    // 🔐 Forgot password
    resetPasswordToken: {
      type: String,
    },

    resetPasswordExpire: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", UserSchema);
