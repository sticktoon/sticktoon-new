const mongoose = require("mongoose");

/**
 * Append-only audit trail: who did what, to what, and when.
 *
 * Rows are written by utils/activityLogger.js and are never edited. A TTL index
 * drops them after LOG_RETENTION_DAYS so the collection cannot grow unbounded
 * (customer-side events like orders and reviews are logged too).
 */

const RETENTION_DAYS = Number(process.env.LOG_RETENTION_DAYS) || 180;

const ActivityLogSchema = new mongoose.Schema(
  {
    // --- Who ---
    // Denormalised on purpose: the actor may later be deleted, and the log
    // must still say who did it.
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    actorName: { type: String, default: "" },
    actorEmail: { type: String, default: "", lowercase: true, trim: true, index: true },
    actorRole: {
      type: String,
      enum: ["user", "admin", "influencer", "guest", "system"],
      default: "guest",
      index: true,
    },

    // --- What ---
    // Dotted verb, e.g. "auth.login", "user.delete", "order.create".
    action: { type: String, required: true, trim: true, index: true },

    category: {
      type: String,
      enum: [
        "auth",
        "user",
        "product",
        "order",
        "promo",
        "influencer",
        "review",
        "cart",
        "support",
        "settings",
        "other",
      ],
      default: "other",
      index: true,
    },

    status: {
      type: String,
      enum: ["success", "failure"],
      default: "success",
      index: true,
    },

    // Human-readable one-liner rendered directly in the admin table.
    message: { type: String, default: "", trim: true },

    // --- Target of the action (optional) ---
    targetType: { type: String, default: "" },
    targetId: { type: String, default: "" },
    targetLabel: { type: String, default: "" },

    // Free-form extras (changed fields, amounts, reason for failure...).
    // Never store passwords/tokens here — the logger strips them.
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },

    // --- Request context ---
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    method: { type: String, default: "" },
    path: { type: String, default: "" },
  },
  { timestamps: true }
);

// Admin log view sorts newest-first and filters by category/actor/date.
ActivityLogSchema.index({ createdAt: -1 });
ActivityLogSchema.index({ category: 1, createdAt: -1 });
ActivityLogSchema.index({ actorEmail: 1, createdAt: -1 });

// Auto-expire old rows.
ActivityLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: RETENTION_DAYS * 24 * 60 * 60 }
);

module.exports = mongoose.model("ActivityLog", ActivityLogSchema);
