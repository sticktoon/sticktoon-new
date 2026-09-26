const mongoose = require("mongoose");

/**
 * A money movement on the revenue timeline that isn't a website order:
 * an Amazon payout (typed in, or imported from a settlement report) or a
 * manual income / expense / refund. Website orders stay in Order and are
 * merged in when the timeline is read.
 *
 * Money is integer paise, signed: + money in, − money out.
 */
const ledgerEntrySchema = new mongoose.Schema(
  {
    source: {
      type: String,
      enum: ["manual", "amazon_report", "amazon_api"],
      required: true,
    },
    type: {
      type: String,
      enum: ["payout", "income", "expense", "refund"],
      required: true,
    },
    channel: {
      type: String,
      enum: ["amazon", "website", "offline", "other"],
      required: true,
    },

    // The day the money moved (IST midnight). The timeline sorts on this,
    // never on createdAt, so a backdated entry lands on its real day.
    occurredAt: { type: Date, required: true },

    amountPaise: { type: Number, required: true },

    // Payouts only. Signed like Amazon reports them: sales +, fees and refunds −.
    breakdown: {
      salesPaise: { type: Number, default: 0 },
      feesPaise: { type: Number, default: 0 },
      refundsPaise: { type: Number, default: 0 },
    },

    settlementId: { type: String, default: null, index: true },
    orderRef: { type: String, default: null },
    note: { type: String, default: "", maxlength: 500 },
    // Receipt, invoice and any other proof, up to 5.
    attachments: [{ _id: false, url: String, name: String }],
    // Older entries hold one document here; editing one moves it into attachments.
    attachment: {
      url: { type: String },
      name: { type: String },
    },

    // "amz:settlement:<id>" on payouts so a settlement is never counted twice.
    // Unset when an entry is voided, so the same settlement can be entered again.
    dedupeKey: { type: String },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    // Money is never hard-deleted.
    voidedAt: { type: Date, default: null },
    voidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    voidReason: { type: String, default: "" },
  },
  { timestamps: true }
);

ledgerEntrySchema.index({ occurredAt: -1, _id: -1 });
ledgerEntrySchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("LedgerEntry", ledgerEntrySchema);
