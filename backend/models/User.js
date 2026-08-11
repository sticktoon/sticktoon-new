const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: [100, "Name is too long"],
      // Names land in raw HTML emails, so no markup is allowed through here.
      // Kept permissive otherwise: any script/language, digits, punctuation.
      match: [/^[^<>]*$/, "Invalid name"],
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index:true,
    },

    // Top-level contact phone. Also usable as a sign-in identifier.
    phone: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    // Saved delivery addresses (address book). One may be the default.
    addresses: {
      type: [
        {
          label: { type: String, default: "" }, // "Home", "Work", ...
          fullName: { type: String, default: "" },
          phone: { type: String, default: "" },
          street: { type: String, default: "" },
          city: { type: String, default: "" },
          state: { type: String, default: "" },
          pincode: { type: String, default: "" },
          country: { type: String, default: "India" },
          isDefault: { type: Boolean, default: false },
        },
      ],
      default: [],
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
      enum: ["user", "admin", "influencer", "superadmin"],
      default: "user",
      index:true,
    },

    // Admin section access. Empty = no sections (deny by default).
    // Ignored for superadmin, who always has everything.
    adminPermissions: {
      type: [String],
      default: [],
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
      /* Never the image itself. A base64 data: URI here is hundreds of kilobytes
         living on a document that is read on every login and copied into every
         backup. Four routes assign this field (admin profile, admin user edit,
         super-admin create, auth profile) and the check belongs on all of them,
         so it sits on the schema rather than in any one of them.

         Nothing in the app sends one today - the panel takes a URL and Google
         OAuth returns one - this stops it coming back. Upload to Cloudinary and
         store the URL, the way order artwork does. */
      validate: {
        validator: function (value) {
          if (!value || !/^data:/i.test(value)) return true;

          /* Only reject a fresh write. A document that already holds a legacy
             inline avatar has to stay saveable, or its owner cannot sign in
             (routes/auth.js calls save() on the Google path) until
             scripts/cleanInlineAvatars.js has run. On an update query `this` is
             the Query, which has no isModified - and there the value is being
             set right now, so it is rejected. */
          return typeof this.isModified === "function" && !this.isModified("avatar");
        },
        message: "avatar must be a URL, not inline image data",
      },
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
