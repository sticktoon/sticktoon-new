const express = require("express");
const ActivityLog = require("../models/ActivityLog");

const router = express.Router();

const auth = require("../middleware/auth");
const { adminOnly, superAdminOnly } = require("../middleware/roleMiddleware");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * GET /api/admin/logs
 *
 * Filters (all optional, combined with AND):
 *   q          free text over message / actorEmail / actorName / targetLabel
 *   category   auth | user | product | order | promo | influencer | review | cart | support | settings | other
 *   action     exact action verb, e.g. "auth.login"
 *   actorEmail exact email
 *   actorRole  user | admin | influencer | guest | system
 *   status     success | failure
 *   from, to   ISO dates (inclusive day range)
 *   page       1-based, default 1
 *   limit      default 50, max 200
 */
router.get("/", auth, adminOnly, async (req, res) => {
  try {
    const {
      q,
      category,
      action,
      actorEmail,
      actorRole,
      status,
      from,
      to,
      page = 1,
      limit = 50,
    } = req.query;

    const filter = {};

    if (category) filter.category = category;
    if (action) filter.action = action;
    if (actorRole) filter.actorRole = actorRole;
    if (status) filter.status = status;
    if (actorEmail) filter.actorEmail = String(actorEmail).toLowerCase().trim();

    if (from || to) {
      filter.createdAt = {};
      if (from) {
        const start = new Date(from);
        if (!Number.isNaN(start.getTime())) {
          start.setHours(0, 0, 0, 0);
          filter.createdAt.$gte = start;
        }
      }
      if (to) {
        const end = new Date(to);
        if (!Number.isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = end;
        }
      }
      if (!Object.keys(filter.createdAt).length) delete filter.createdAt;
    }

    if (q && String(q).trim()) {
      const rx = new RegExp(escapeRegex(String(q).trim()), "i");
      filter.$or = [
        { message: rx },
        { actorEmail: rx },
        { actorName: rx },
        { targetLabel: rx },
        { action: rx },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const perPage = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * perPage)
        .limit(perPage)
        .lean(),
      ActivityLog.countDocuments(filter),
    ]);

    res.json({
      logs,
      total,
      page: pageNum,
      limit: perPage,
      pages: Math.ceil(total / perPage) || 1,
    });
  } catch (err) {
    console.error("Fetch activity logs error:", err);
    res.status(500).json({ message: "Failed to fetch logs" });
  }
});

/**
 * GET /api/admin/logs/filters
 * Distinct values so the UI can populate its dropdowns from real data.
 */
router.get("/filters", auth, adminOnly, async (req, res) => {
  try {
    const [actions, actors] = await Promise.all([
      ActivityLog.distinct("action"),
      ActivityLog.distinct("actorEmail"),
    ]);

    res.json({
      actions: actions.filter(Boolean).sort(),
      actors: actors.filter(Boolean).sort(),
      categories: [
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
      roles: ["user", "admin", "influencer", "guest", "system"],
      statuses: ["success", "failure"],
    });
  } catch (err) {
    console.error("Fetch log filters error:", err);
    res.status(500).json({ message: "Failed to fetch log filters" });
  }
});

/**
 * DELETE /api/admin/logs  — purge logs older than `days` (default 90).
 * Destructive, so super admin only.
 */
router.delete("/", auth, superAdminOnly, async (req, res) => {
  try {
    const days = Math.max(1, parseInt(req.query.days, 10) || 90);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await ActivityLog.deleteMany({ createdAt: { $lt: cutoff } });
    res.json({
      message: `Deleted ${result.deletedCount} log(s) older than ${days} days`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error("Purge logs error:", err);
    res.status(500).json({ message: "Failed to purge logs" });
  }
});

module.exports = router;
