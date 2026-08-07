// Data backup: dumps every core collection to CSV and emails them to admin.
// Used by the "Create Backup" button and by the weekly Sunday scheduler.
const User = require("../models/User");
const Order = require("../models/Order");
const UserOrder = require("../models/User_Orders");
const Invoice = require("../models/Invoice");
const Lead = require("../models/Lead");
const Product = require("../models/Product");
const PromoCode = require("../models/PromoCode");
const sendEmail = require("./sendEmail");
const { backupEmail } = require("./emailTemplates");

const COLLECTIONS = [
  ["users", User],
  ["orders", Order],
  ["user-orders", UserOrder],
  ["invoices", Invoice],
  ["leads", Lead],
  ["products", Product],
  ["promo-codes", PromoCode],
];

// Credentials must never leave the database inside a CSV, even to admin.
const SENSITIVE_KEY = /password|token|secret|otp|__v/i;

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

/**
 * Build the CSV attachments and email them out.
 * @param {string} trigger - "manual" or "weekly", shown in the email body.
 * @param {string} triggeredBy - admin email, for the manual case.
 */
const sendBackup = async ({ trigger = "manual", triggeredBy = "" } = {}) => {
  const recipients = backupRecipients();
  if (!recipients.length) {
    return { ok: false, error: "No backup recipient configured (set BACKUP_EMAIL)" };
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const attachments = [];
  const counts = {};

  for (const [name, Model] of COLLECTIONS) {
    const rows = (await Model.find({}).lean()).map(stripSensitive);
    counts[name] = rows.length;
    if (!rows.length) continue;

    // BOM so Excel reads the file as UTF-8 and non-ASCII names survive.
    const csv = "﻿" + toCsv(rows);
    attachments.push({
      name: `${name}-${stamp}.csv`,
      content: Buffer.from(csv, "utf8").toString("base64"),
    });
  }

  const html = backupEmail({ trigger, triggeredBy, counts, stamp });
  const subject = `StickToon ${trigger === "weekly" ? "Weekly" : "Manual"} Data Backup — ${stamp}`;

  const results = [];
  for (const to of recipients) {
    results.push(await sendEmail({ to, subject, html, attachments }));
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length === results.length) {
    return { ok: false, error: failed[0]?.error || "Email delivery failed", counts };
  }

  return { ok: true, recipients, counts, files: attachments.length };
};

module.exports = { sendBackup, toCsv, cell, backupRecipients };
