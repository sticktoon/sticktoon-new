const ActivityLog = require("../models/ActivityLog");

/**
 * Writes rows into the audit trail.
 *
 * Logging is best-effort and MUST NOT break the request it is describing:
 * every failure is swallowed and reported to the console only.
 */

// Anything whose key matches this never reaches the database.
const SENSITIVE_KEY = /pass|token|secret|otp|authorization|cvv|card|signature/i;

const sanitize = (value, depth = 0) => {
  if (value === null || value === undefined) return value;
  if (depth > 4) return "[deep]";

  if (Array.isArray(value)) return value.slice(0, 50).map((v) => sanitize(v, depth + 1));

  if (typeof value === "object") {
    // Leave ObjectId/Date/Buffer alone — stringify them instead of walking.
    if (value instanceof Date) return value;
    if (typeof value.toHexString === "function") return value.toHexString();
    if (Buffer.isBuffer(value)) return "[buffer]";

    const out = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = SENSITIVE_KEY.test(key) ? "[redacted]" : sanitize(val, depth + 1);
    }
    return out;
  }

  if (typeof value === "string" && value.length > 500) {
    return `${value.slice(0, 500)}…`;
  }

  return value;
};

const getIp = (req) => {
  if (!req) return "";
  const forwarded = req.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "";
};

const normalizeRole = (role) => {
  const allowed = ["user", "admin", "influencer", "guest", "system"];
  return allowed.includes(role) ? role : "guest";
};

/**
 * @param {object} opts
 * @param {import("express").Request} [opts.req]  Request, for IP / UA / actor.
 * @param {object} [opts.actor]     Overrides req.user. { id, name, email, role }
 * @param {string} opts.action      Dotted verb, e.g. "auth.login".
 * @param {string} [opts.category]  One of the ActivityLog category enum values.
 * @param {"success"|"failure"} [opts.status]
 * @param {string} [opts.message]   Human-readable summary for the admin table.
 * @param {object} [opts.target]    { type, id, label }
 * @param {object} [opts.meta]      Extra detail; sensitive keys are redacted.
 */
async function logActivity({
  req,
  actor,
  action,
  category = "other",
  status = "success",
  message = "",
  target = {},
  meta = {},
} = {}) {
  try {
    if (!action) return null;

    const source = actor || req?.user || {};

    const doc = await ActivityLog.create({
      actorId: source.id || source._id || null,
      actorName: source.name || "",
      actorEmail: source.email || "",
      actorRole: normalizeRole(source.role),

      action,
      category,
      status,
      message,

      targetType: target.type || "",
      targetId: target.id ? String(target.id) : "",
      targetLabel: target.label || "",

      meta: sanitize(meta) || {},

      ip: getIp(req),
      userAgent: req?.headers?.["user-agent"] || "",
      method: req?.method || "",
      path: req?.originalUrl || req?.url || "",
    });

    return doc;
  } catch (err) {
    // Never surface logging problems to the caller.
    console.error("[activityLogger] failed to write log:", err.message);
    return null;
  }
}

/**
 * Express middleware factory: logs a route AFTER it responds, and only when the
 * response was a 2xx. Use for admin write routes where the handler itself does
 * not need to add per-record detail.
 *
 *   router.delete("/users/:id", auth, adminOnly,
 *     logRoute({ action: "user.delete", category: "user" }), handler)
 *
 * `resolve(req, res)` may return { message, target, meta } for extra detail.
 */
function logRoute({ action, category = "other", message = "", resolve }) {
  return (req, res, next) => {
    res.on("finish", () => {
      const ok = res.statusCode >= 200 && res.statusCode < 300;

      let extra = {};
      if (typeof resolve === "function") {
        try {
          extra = resolve(req, res) || {};
        } catch {
          extra = {};
        }
      }

      logActivity({
        req,
        action,
        category,
        status: ok ? "success" : "failure",
        message: extra.message || message,
        target: extra.target || {},
        meta: { statusCode: res.statusCode, ...(extra.meta || {}) },
      });
    });

    next();
  };
}

module.exports = { logActivity, logRoute };
