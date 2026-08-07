const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { adminOnly } = require("../middleware/roleMiddleware");
const { sendBackup, backupRecipients } = require("../utils/backupCsv");
const { logActivity } = require("../utils/activityLogger");

/* =========================
   CREATE BACKUP NOW (ADMIN)
========================= */
router.post("/", auth, adminOnly, async (req, res) => {
  try {
    const result = await sendBackup({
      trigger: "manual",
      triggeredBy: req.user.email,
    });

    if (!result.ok) {
      return res.status(500).json({ message: result.error || "Backup failed" });
    }

    logActivity({
      req,
      action: "backup.create",
      category: "settings",
      message: `Data backup emailed to ${result.recipients.join(", ")}`,
      meta: { counts: result.counts, files: result.files },
    }).catch(() => {});

    res.json({
      message: `Backup sent to ${result.recipients.join(", ")}`,
      counts: result.counts,
      files: result.files,
    });
  } catch (err) {
    console.error("Backup error:", err);
    res.status(500).json({ message: "Backup failed" });
  }
});

/* Where the backup will land - shown on the button tooltip. */
router.get("/recipients", auth, adminOnly, (req, res) => {
  res.json({ recipients: backupRecipients() });
});

module.exports = router;
