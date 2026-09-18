// backend/models/Invoice.js
const mongoose = require("mongoose");

const invoiceItemSchema = new mongoose.Schema({
  id: String,
  description: String,
  subDescription: String,
  unitPrice: Number,
  quantity: Number,
  image: String,
});

const invoiceSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: false,
      default: undefined,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: undefined,
    },

    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: false,
      default: undefined,
    },

    docType: {
      type: String,
      enum: ["invoice", "quotation"],
      default: "invoice",
    },

    customerName: String,
    company: String,
    email: String,
    phone: String,
    address: String,

    invoiceNumber: {
      type: String,
      unique: true,
      required: true,
    },

    quotationDate: String,
    validityDays: {
      type: Number,
      default: 30,
    },
    currencyCode: {
      type: String,
      default: "INR",
    },
    subject: String,
    intro: String,

    companyGstin: String,
    companyUdyam: String,
    companyEmail: String,
    companyContact: String,

    items: [invoiceItemSchema],

    gstEnabled: {
      type: Boolean,
      default: true,
    },
    gstin: String,
    gstRate: {
      type: Number,
      default: 18,
    },

    subtotal: {
      type: Number,
      default: 0,
    },
    gstAmount: {
      type: Number,
      default: 0,
    },
    deliveryCharges: {
      type: Number,
      default: 0,
    },
    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "INR",
    },

    paymentMethod: String,
    paymentGateway: String,

    discount: {
      type: Number,
      default: 0,
    },

    promoCode: {
      type: String,
      default: null,
    },

    termsText: String,
    bankDetails: {
      accountName: String,
      bankName: String,
      accountNumber: String,
      ifsc: String,
      swift: String,
      branch: String,
    },

    operationalAddress: String,
    headquartersAddress: String,
    authorizedSignatory: String,
    signatureBrand: String,

    status: {
      type: String,
      default: "Saved",
    },
  },
  { timestamps: true }
);

const Invoice = mongoose.model("Invoice", invoiceSchema);

// Safe index cleaner to drop legacy non-sparse unique index on orderId
Invoice.cleanIndexes = async function () {
  try {
    const collection = Invoice.collection;
    const indexes = await collection.indexes();
    const orderIdIdx = indexes.find((idx) => idx.name === "orderId_1");
    if (orderIdIdx) {
      console.log("⚠️ Dropping legacy orderId_1 index on invoices collection...");
      await collection.dropIndex("orderId_1");
      console.log("✅ Successfully dropped legacy orderId_1 index.");
    }
  } catch (err) {
    // Ignore if collection doesn't exist yet or index is missing
  }
};

// Run index cleaner on server start
Invoice.cleanIndexes();

module.exports = Invoice;

