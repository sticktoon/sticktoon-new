const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "Pending",
        "In Progress",
        "Waiting on Customer",
        "Completed",
        "Cancelled",
      ],
      default: "Pending",
    },

    dueDate: {
      type: Date,
    },
    reminderAt: {
      type: Date,
      default: null,
    },
    relatedToType: {
      type: String,
      enum: ["Lead", "Contact", "Order", "Support Ticket", "Influencer", ""],
      default: "",
      trim: true,
    },
    relatedToId: {
      type: String,
      default: "",
      trim: true,
    },
    taskType: {
      type: String,
      enum: [
        "Call",
        "Email",
        "WhatsApp Follow-up",
        "Order Confirmation",
        "Refund Processing",
        "Influencer Follow-up",
        "Internal Task",
      ],
      default: "Internal Task",
    },
    comments: [
      {
        authorName: {
          type: String,
          required: true,
          trim: true,
        },
        text: {
          type: String,
          required: true,
          trim: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    activityTimeline: [
      {
        message: {
          type: String,
          required: true,
          trim: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // admin who created task
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", taskSchema);
