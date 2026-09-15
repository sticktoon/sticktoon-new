const mongoose = require("mongoose");

/**
 * One Amazon settlement (= one bank deposit) with every line of its report.
 * The payout itself shows on the timeline as a LedgerEntry; this keeps the
 * detail behind it. Written by utils/amazonSettlement.js via the import route.
 */
const rowSchema = new mongoose.Schema(
  {
    postedAt: Date,
    transactionType: String,
    orderId: String,
    amountType: String,
    amountDescription: String,
    amountPaise: Number,
    sku: String,
    quantity: Number,
    bucket: { type: String, enum: ["sales", "fees", "refunds"] },
  },
  { _id: false }
);

const amazonSettlementSchema = new mongoose.Schema(
  {
    settlementId: { type: String, required: true, unique: true },
    currency: { type: String, default: "INR" },
    periodStart: { type: Date, default: null },
    periodEnd: { type: Date, default: null, index: true },
    depositDate: { type: Date, required: true, index: true },

    salesPaise: { type: Number, default: 0 },
    feesPaise: { type: Number, default: 0 },
    refundsPaise: { type: Number, default: 0 },
    netPaise: { type: Number, default: 0 },
    // Amazon's own total for the settlement; imports are refused when the rows disagree.
    fileTotalPaise: { type: Number, default: 0 },
    orderCount: { type: Number, default: 0 },

    rows: { type: [rowSchema], default: [] },

    source: { type: String, enum: ["amazon_report", "amazon_api"], default: "amazon_report" },
    fileName: { type: String, default: "" },
    importedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    importedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AmazonSettlement", amazonSettlementSchema);
