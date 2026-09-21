const mongoose = require("mongoose");

// The priced cart behind a Razorpay order, saved when the order is created so
// the paid order can be built from it even if the browser never comes back
// (the webhook path). Deleted once the order exists; unpaid ones expire.
const pendingCheckoutSchema = new mongoose.Schema(
  {
    razorpayOrderId: { type: String, required: true, unique: true },
    checkout: { type: mongoose.Schema.Types.Mixed, required: true },
    // Set by whichever of verify-payment / webhook is building the order, so
    // the other one doesn't build it twice.
    claimedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 3 },
  },
  { minimize: false }
);

module.exports = mongoose.model("PendingCheckout", pendingCheckoutSchema);
