const mongoose = require("mongoose");

const LeadSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    expectedAmount: {
      type: Number,
      default: 0,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    leadSource: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      default: "New",
    },
    nextFollowUpAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Lead", LeadSchema);
