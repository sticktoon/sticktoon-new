const mongoose = require("mongoose");

const financeTransactionSchema = new mongoose.Schema(
  {
    // business = StickToon, personal = founder's own money
    ledger: {
      type: String,
      enum: ["business", "personal"],
      default: "business",
      index: true,
    },
    type: {
      type: String,
      enum: ["income", "expense", "capital", "transfer"],
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: [
        "sales",
        "b2b_order",
        "amazon_payout",
        "raw_material",
        "printing_press",
        "courier_shipping",
        "packaging",
        "marketing_ads",
        "tools_software",
        "office_equipment",
        "partner_payout",
        "capital_infusion",
        "refund",
        "miscellaneous",
        // personal
        "salary_income",
        "food_dining",
        "rent_housing",
        "bills_utilities",
        "travel_transport",
        "shopping",
        "health_medical",
        "education",
        "investment",
        "loan_emi",
        "family_gifts",
        "entertainment",
      ],
      default: "miscellaneous",
      index: true,
    },
    amountPaise: {
      type: Number,
      required: true,
    },
    occurredAt: {
      type: Date,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    note: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    utr: {
      type: String,
      default: null,
      trim: true,
    },
    paymentMode: {
      type: String,
      enum: ["upi", "bank_transfer", "cash", "card", "amazon", "razorpay", "other"],
      default: "upi",
    },
    source: {
      type: String,
      enum: ["manual", "statement_import", "system"],
      default: "manual",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

financeTransactionSchema.index({ occurredAt: -1, _id: -1 });

module.exports = mongoose.model("FinanceTransaction", financeTransactionSchema);
