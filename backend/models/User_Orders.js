const mongoose = require("mongoose");

const userOrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // guest checkout has no user account
      default: null,
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User_Orders", userOrderSchema);
