const mongoose = require("mongoose");

/**
 * The real bank balance at the end of an IST day, typed in from the bank
 * statement or app. The newest check anchors the revenue page's expected
 * balance; older ones stay as history. Its own collection, not a Setting,
 * because the settings route shows every setting to any admin.
 *
 * Money is integer paise.
 */
const bankCheckSchema = new mongoose.Schema(
  {
    asOf: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    balancePaise: { type: Number, required: true },
    // Money the owner put in, or that was there before the first entry.
    // Not revenue, so it's kept out of "untracked".
    ownPaise: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BankCheck", bankCheckSchema);
