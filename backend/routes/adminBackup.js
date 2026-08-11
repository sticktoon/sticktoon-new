const express = require("express");
const multer = require("multer");
const router = express.Router();
const auth = require("../middleware/auth");
const { adminOnly, superAdminOnly } = require("../middleware/roleMiddleware");
const { sendBackup, backupRecipients, lastBackupStatus } = require("../utils/backupCsv");
const { restoreBackup, parseBackup } = require("../utils/restoreBackup");
const { logActivity } = require("../utils/activityLogger");

// 25 MB covers the whole dataset many times over; a bigger upload is a mistake.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

/* =========================
   CREATE BACKUP NOW (ADMIN)
========================= */
router.post("/", auth, adminOnly, async (req, res) => {
  try {
    const recipients = backupRecipients();
    if (!recipients.length) {
      return res.status(400).json({ message: "No backup recipient configured (set BACKUP_EMAIL or ADMIN_EMAIL)" });
    }

    // Respond immediately so Render's 30s HTTP proxy never times out with 502/503
    res.json({
      message: `Backup is generating in background and will arrive in ${recipients.join(", ")} shortly!`,
      recipients,
    });

    // Execute heavy CSV generation & email dispatch asynchronously
    sendBackup({
      trigger: "manual",
      triggeredBy: req.user.email,
    })
      .then((result) => {
        if (result.ok) {
          console.log(`✅ Backup successfully emailed to ${result.recipients.join(", ")}`);
          logActivity({
            req,
            action: "backup.create",
            category: "settings",
            message: `Data backup emailed to ${result.recipients.join(", ")}`,
            meta: { counts: result.counts, files: result.files },
          }).catch(() => {});
        } else {
          console.error("❌ Backup process failed:", result.error);
        }
      })
      .catch((err) => {
        console.error("❌ Backup background error:", err);
      });
  } catch (err) {
    console.error("Backup error:", err);
    res.status(500).json({ message: "Failed to initiate backup" });
  }
});

/* Where the backup will land, and how the previous run ended. The panel polls
   this after pressing the button: the POST above answers before the backup is
   built, so this is the only place a delivery failure becomes visible. */
router.get("/recipients", auth, adminOnly, async (req, res) => {
  try {
    res.json({ recipients: backupRecipients(), last: await lastBackupStatus() });
  } catch (err) {
    console.error("Backup status error:", err);
    res.json({ recipients: backupRecipients(), last: null });
  }
});

/* =========================
   RESTORE FROM BACKUP FILE

   Super admin only: this writes to every core collection. Deliberately limited
   to inserting documents that are missing - it can bring deleted records back
   but can never overwrite or delete data that is currently live. Overwriting an
   existing record stays a CLI-only operation (scripts/restoreBackup.js --replace).
========================= */
router.post("/restore", auth, superAdminOnly, upload.single("backup"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No backup file uploaded" });
    }

    let backup;
    try {
      // Raw bytes: parseBackup unzips a .json.gz itself, and a utf8 decode here
      // would corrupt it before it ever got the chance.
      backup = parseBackup(req.file.buffer);
    } catch (err) {
      return res.status(400).json({
        message: `${err.message}. Upload the RESTORE-<date>.json.gz attachment, not a CSV.`,
      });
    }

    // "preview" is the default so a mis-click cannot write anything.
    const apply = req.body.apply === "true";
    const report = await restoreBackup({ backup, apply });

    if (!apply) {
      return res.json({ preview: true, report });
    }

    const inserted = report.reduce((sum, row) => sum + (row.inserted || 0), 0);

    logActivity({
      req,
      action: "backup.restore",
      category: "settings",
      message: `Restored ${inserted} record(s) from ${req.file.originalname}`,
      meta: { report },
    }).catch(() => {});

    res.json({
      preview: false,
      report,
      message: inserted
        ? `Restored ${inserted} record(s). Users whose accounts were restored must use Forgot Password.`
        : "Nothing to restore - every record in this backup is already in the database.",
    });
  } catch (err) {
    console.error("Restore error:", err);
    res.status(500).json({ message: "Restore failed" });
  }
});

module.exports = router;
