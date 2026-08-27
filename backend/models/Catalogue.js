// backend/models/Catalogue.js
const mongoose = require("mongoose");

const catalogueItemSchema = new mongoose.Schema({
  id: String,
  description: String,
  unitPrice: Number,
  quantity: Number,
  image: String,
  defaultImage: String,
  finishLabel: String,
});

const catalogueSchema = new mongoose.Schema(
  {
    catalogueNumber: {
      type: String,
      unique: true,
      required: true,
    },

    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: false,
      default: null,
    },

    title: {
      type: String,
      default: "Advantage Club Collection",
    },
    tagline: {
      type: String,
      default: "Limited Edition",
    },
    highlightLine: {
      type: String,
      default: "Smart Magnetic 58mm Pin Badges - Designed to Stick Anywhere in Your Office",
    },

    customerEmail: String,
    customerPhone: String,
    quotationDate: String,

    items: [catalogueItemSchema],

    gstEnabled: {
      type: Boolean,
      default: true,
    },
    gstin: String,
    gstRate: {
      type: Number,
      default: 18,
    },

    deliveryCharges: {
      type: Number,
      default: 0,
    },

    subtotal: {
      type: Number,
      default: 0,
    },
    gstAmount: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      default: 0,
    },

    overviewPoints: String,
    officeLocation: String,
    contactChannels: String,
    curationNote: String,
    footerNote: String,

    customCardTitle: String,
    customCardCopy: String,
    showCustomCard: {
      type: Boolean,
      default: true,
    },

    status: {
      type: String,
      default: "Saved",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Catalogue", catalogueSchema);
