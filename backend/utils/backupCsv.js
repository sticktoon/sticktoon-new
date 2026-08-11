// Data backup: dumps every core collection to CSV and emails them to admin.
// Used by the "Create Backup" button and by the weekly Sunday scheduler.
const zlib = require("zlib");
const { EJSON } = require("bson");
const Setting = require("../models/Setting");
const ImageUpload = require("../models/ImageUpload");
const sendEmail = require("./sendEmail");
const { backupEmail } = require("./emailTemplates");
// Same map the restore path uses, so the two can never disagree about what a
// backup contains. See utils/restoreBackup.js for what is left out and why.
const { MODELS } = require("./restoreBackup");

const COLLECTIONS = Object.entries(MODELS);

// Written after every run, read back by the admin panel: the HTTP response goes
// out before the backup is built, so this is the only record of what happened.
const STATUS_KEY = "last_backup_status";

// Credentials must never leave the database inside a CSV, even to admin.
const SENSITIVE_KEY = /password|token|secret|otp|__v/i;

/* Custom-order artwork is stored as a data: URI inside orders.items[] - up to
   half a megabyte of base64 per image. In a spreadsheet it is worthless: Excel
   caps a cell at 32,767 characters and silently drops the rest, Supabase's CSV
   import chokes on it, and it made the orders sheet 6.9 MB on its own. The CSVs
   are the readable copy, so they get a summary; the bytes still travel in full
   inside RESTORE-*.json.gz, which is what an actual restore reads. */
const EXCEL_CELL_LIMIT = 32767;
const DATA_URI = /data:([\w/+.\-]+);base64,[A-Za-z0-9+/=]+/g;

const summariseBlobs = (text) =>
  text.replace(
    DATA_URI,
    (blob, mime) => `<${mime}, ${Math.round(blob.length / 1024)} KB - see RESTORE json>`
  );

/* Excel treats a leading =, +, - or @ as a formula, so a stored value like
   "=HYPERLINK(...)" would execute when admin opens the file. Prefix it. */
const cell = (value) => {
  if (value === null || value === undefined) return "";

  let text =
    value instanceof Date
      ? value.toISOString()
      : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);

  if (text.length > 512) text = summariseBlobs(text);

  // Anything else that runs long is clipped visibly rather than by Excel silently.
  if (text.length > EXCEL_CELL_LIMIT) {
    text = `${text.slice(0, EXCEL_CELL_LIMIT - 40)}…[truncated, ${text.length} chars]`;
  }

  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;

  return `"${text.replace(/"/g, '""')}"`;
};

const stripSensitive = (doc) => {
  const clean = {};
  for (const key of Object.keys(doc)) {
    if (!SENSITIVE_KEY.test(key)) clean[key] = doc[key];
  }
  return clean;
};

/* Columns are the union of every row's keys, so optional fields still land in
   the output instead of being dropped because the first document lacked them. */
const toCsv = (rows) => {
  if (!rows.length) return "";

  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const lines = [columns.join(",")];

  for (const row of rows) {
    lines.push(columns.map((column) => cell(row[column])).join(","));
  }

  return lines.join("\r\n");
};

const backupRecipients = () => {
  const configured =
    process.env.BACKUP_EMAIL ||
    process.env.ADMIN_EMAIL ||
    process.env.DEV_EMAIL ||
    "";

  return configured
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
};

/* The panel is told "backup is on its way" before any of this runs, so a failure
   here has nowhere to surface. Every outcome is written down instead, and the
   panel polls for it - see GET /api/admin/backup/recipients. */
const recordStatus = async (status) => {
  const value = { ...status, at: new Date().toISOString() };
  await Setting.findOneAndUpdate({ key: STATUS_KEY }, { value }, { upsert: true }).catch((err) =>
    console.error("Could not record backup status:", err.message)
  );
  return value;
};

const lastBackupStatus = async () => {
  const doc = await Setting.findOne({ key: STATUS_KEY }).lean();
  return doc?.value || null;
};

/* Google Drive uploads failed for four months and nobody found out, because the
   only trace was a console line and an errors[] field no screen reads. This
   backup email already reaches the admin every Sunday, so it carries the alarm
   instead of a new alerting path being built for it. */
const uploadHealth = async () => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const query = { createdAt: { $gte: since }, uploadStatus: { $ne: "success" } };

  const degraded = await ImageUpload.countDocuments(query);
  if (!degraded) return null;

  const total = await ImageUpload.countDocuments({ createdAt: { $gte: since } });
  const latest = await ImageUpload.findOne(query).sort({ createdAt: -1 }).lean();
  const firstError = latest?.errors?.[0];

  return {
    degraded,
    total,
    reason: firstError ? `${firstError.service}: ${firstError.error}` : null,
  };
};

/**
 * Build the CSV attachments and email them out.
 * @param {string} trigger - "manual" or "weekly", shown in the email body.
 * @param {string} triggeredBy - admin email, for the manual case.
 */
const sendBackup = async ({ trigger = "manual", triggeredBy = "" } = {}) => {
  const recipients = backupRecipients();
  if (!recipients.length) {
    return recordStatus({
      ok: false,
      trigger,
      error: "No backup recipient configured (set BACKUP_EMAIL)",
    });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const attachments = [];
  const counts = {};
  const restore = {};

  for (const [name, Model] of COLLECTIONS) {
    const rawRows = await Model.find({}, { password: 0, secret: 0, token: 0, otp: 0, __v: 0 }).lean();
    const rows = rawRows.map(stripSensitive);
    counts[name] = rows.length;
    if (!rows.length) continue;

    // BOM so Excel reads the file as UTF-8 and non-ASCII names survive.
    const csv = "﻿" + toCsv(rows);
    attachments.push({
      name: `${name}-${stamp}.csv`,
      content: Buffer.from(csv, "utf8"),
    });

    restore[name] = rows;
  }

  /* The CSVs are for reading. This is the one that can actually be restored:
     Extended JSON keeps ObjectId, Date and number types intact, so relations
     between collections survive the round trip. CSV flattens them to strings.

     Gzipped because it repeats every row the CSVs already carry, in the far more
     verbose strict form ({"$oid":...} per id), and Resend caps a message at 40 MB.
     restoreBackup.parseBackup sniffs the header, so plain .json files still load. */
  const restoreJson = EJSON.stringify(restore, { relaxed: false });
  attachments.push({
    name: `RESTORE-${stamp}.json.gz`,
    content: zlib.gzipSync(Buffer.from(restoreJson, "utf8")),
  });

  // Never let a broken image pipeline stop the backup itself going out.
  const health = await uploadHealth().catch(() => null);

  const html = backupEmail({ trigger, triggeredBy, counts, stamp, health });
  const subject = `StickToon ${trigger === "weekly" ? "Weekly" : "Manual"} Data Backup — ${stamp}`;

  /* One at a time: the Resend SDK re-encodes every attachment into each request
     body, and firing them together also trips its 2-per-second rate limit. */
  const delivered = [];
  const failed = [];
  let error = null;

  for (const to of recipients) {
    const result = await sendEmail({ to, subject, html, attachments });
    if (result.ok) {
      delivered.push(to);
    } else {
      failed.push(to);
      error = typeof result.error === "string" ? result.error : JSON.stringify(result.error);
    }
  }

  if (!delivered.length) {
    return recordStatus({ ok: false, trigger, error: error || "Email delivery failed", counts });
  }

  // A partial delivery is still a warning: one of the admins got nothing.
  return recordStatus({
    ok: true,
    trigger,
    triggeredBy,
    recipients: delivered,
    failed,
    error: failed.length ? error : null,
    counts,
    files: attachments.length,
  });
};

module.exports = {
  sendBackup,
  toCsv,
  cell,
  backupRecipients,
  lastBackupStatus,
  COLLECTION_NAMES: COLLECTIONS.map(([name]) => name),
};
