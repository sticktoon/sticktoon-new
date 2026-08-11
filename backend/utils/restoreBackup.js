// Restore core, shared by the admin panel button and scripts/restoreBackup.js.
const zlib = require("zlib");
const { EJSON } = require("bson");
const User = require("../models/User");
const Order = require("../models/Order");
const UserOrder = require("../models/User_Orders");
const Invoice = require("../models/Invoice");
const Lead = require("../models/Lead");
const Product = require("../models/Product");
const PromoCode = require("../models/PromoCode");
const Review = require("../models/Review");
const WithdrawalRequest = require("../models/WithdrawalRequest");
const InfluencerEarning = require("../models/InfluencerEarning");
const SupportMessage = require("../models/SupportMessage");
const Task = require("../models/Task");
const ImageUpload = require("../models/ImageUpload");

/**
 * The one list of what a backup covers. backupCsv.js reads the same map, so a
 * collection can never end up dumped but not restorable, or added to a model
 * folder and silently left out of both.
 *
 * Deliberately absent: Cart (rebuilt by the shopper), ActivityLog (audit noise
 * that grows without bound), Setting (a handful of toggles, and its unique key
 * index makes a re-insert under a new _id fail).
 */
const MODELS = {
  users: User,
  orders: Order,
  "user-orders": UserOrder,
  invoices: Invoice,
  leads: Lead,
  products: Product,
  "promo-codes": PromoCode,
  reviews: Review,
  "withdrawal-requests": WithdrawalRequest,
  "influencer-earnings": InfluencerEarning,
  "support-messages": SupportMessage,
  tasks: Task,
  "image-uploads": ImageUpload,
};

/**
 * Parse a RESTORE-*.json.gz (or plain .json, as older backups were sent) file.
 *
 * Takes the raw bytes, not text: the gzipped form is detected from its magic
 * number, which a utf8 decode would already have destroyed. Callers just hand
 * over the buffer and neither of the two formats needs a separate code path.
 *
 * Relaxed mode on purpose: ObjectId and Date still come back as real types, but
 * numbers come back as plain JS numbers rather than Int32/Double wrappers, which
 * is what mongoose expects to cast. The file is written in strict mode, so no
 * type information was lost on the way out.
 */
const parseBackup = (input) => {
  let buffer = Buffer.isBuffer(input) ? input : Buffer.from(String(input), "utf8");
  if (buffer[0] === 0x1f && buffer[1] === 0x8b) buffer = zlib.gunzipSync(buffer);

  const parsed = EJSON.parse(buffer.toString("utf8"));

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Not a valid backup file");
  }

  const known = Object.keys(parsed).filter((name) => MODELS[name]);
  if (!known.length) {
    throw new Error("Backup file contains no recognised collections");
  }

  return parsed;
};

/**
 * Restore documents from a parsed backup.
 *
 * Nothing is ever deleted. By default only documents whose _id is missing get
 * written back, so a restore cannot clobber data that is currently live. Pass
 * replace:true to also overwrite documents that still exist.
 *
 * @param {object} backup   Parsed backup, { collectionName: [docs] }
 * @param {boolean} apply   false = dry run, report only
 * @param {boolean} replace true = also overwrite existing documents
 * @param {string[]} only   Restrict to these collection names
 */
const restoreBackup = async ({ backup, apply = false, replace = false, only = null }) => {
  const report = [];

  for (const [name, docs] of Object.entries(backup)) {
    if (only && !only.includes(name)) continue;

    const Model = MODELS[name];
    if (!Model || !Array.isArray(docs)) {
      report.push({ collection: name, skipped: true, reason: "unknown collection" });
      continue;
    }

    const ids = docs.map((doc) => doc._id);
    const existing = await Model.find({ _id: { $in: ids } }).select("_id").lean();
    const existingIds = new Set(existing.map((doc) => String(doc._id)));
    const missing = docs.filter((doc) => !existingIds.has(String(doc._id)));

    const entry = {
      collection: name,
      inBackup: docs.length,
      alreadyPresent: docs.length - missing.length,
      toInsert: missing.length,
      inserted: 0,
      overwritten: 0,
    };

    const targets = replace ? docs : missing;

    if (apply && targets.length) {
      // upsert by _id keeps the original ids, so links between collections hold.
      const result = await Model.bulkWrite(
        targets.map((doc) => ({
          replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true },
        })),
        { ordered: false }
      );
      entry.inserted = result.upsertedCount || 0;
      entry.overwritten = result.modifiedCount || 0;
    }

    report.push(entry);
  }

  return report;
};

module.exports = { restoreBackup, parseBackup, MODELS };
