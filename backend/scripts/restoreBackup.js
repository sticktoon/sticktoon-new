/**
 * Restore data from a RESTORE-<date>.json backup attachment.
 *
 *   node scripts/restoreBackup.js ~/Downloads/RESTORE-2026-08-07.json
 *       -> dry run: prints what would change, writes nothing
 *
 *   node scripts/restoreBackup.js <file> --yes
 *       -> inserts documents whose _id is missing. Existing docs untouched.
 *
 *   node scripts/restoreBackup.js <file> --yes --replace
 *       -> also overwrites documents that already exist
 *
 *   node scripts/restoreBackup.js <file> --yes --only=users,orders
 *       -> restore just those collections
 *
 * Nothing is ever deleted. A restore can only add rows back or overwrite them.
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { EJSON } = require("bson");

const MODELS = {
  users: require("../models/User"),
  orders: require("../models/Order"),
  "user-orders": require("../models/User_Orders"),
  invoices: require("../models/Invoice"),
  leads: require("../models/Lead"),
  products: require("../models/Product"),
  "promo-codes": require("../models/PromoCode"),
};

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const confirmed = args.includes("--yes");
const replace = args.includes("--replace");
const onlyArg = args.find((a) => a.startsWith("--only="));
const only = onlyArg ? onlyArg.slice(7).split(",").map((s) => s.trim()) : null;

async function main() {
  if (!file) {
    console.error("Usage: node scripts/restoreBackup.js <RESTORE-*.json> [--yes] [--replace] [--only=users,orders]");
    process.exit(1);
  }

  const fullPath = path.resolve(file);
  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${fullPath}`);
    process.exit(1);
  }

  /* Parse in relaxed mode: ObjectId and Date still come back as real types, but
     numbers come back as plain JS numbers instead of Int32/Double wrappers, which
     is what mongoose expects to cast. The file itself is written strict, so no
     type information was lost on the way out. */
  const backup = EJSON.parse(fs.readFileSync(fullPath, "utf8"));

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected to ${mongoose.connection.name}\n`);

  if (!confirmed) {
    console.log("DRY RUN - nothing will be written. Add --yes to apply.\n");
  }

  for (const [name, docs] of Object.entries(backup)) {
    if (only && !only.includes(name)) continue;

    const Model = MODELS[name];
    if (!Model) {
      console.log(`${name}: skipped (no model registered)`);
      continue;
    }

    const ids = docs.map((doc) => doc._id);
    const existing = await Model.find({ _id: { $in: ids } }).select("_id").lean();
    const existingIds = new Set(existing.map((doc) => String(doc._id)));

    const missing = docs.filter((doc) => !existingIds.has(String(doc._id)));
    const present = docs.length - missing.length;

    console.log(
      `${name}: ${docs.length} in backup, ${present} already in database, ` +
        `${missing.length} to insert${replace && present ? `, ${present} to overwrite` : ""}`
    );

    if (!confirmed) continue;

    const targets = replace ? docs : missing;
    if (!targets.length) continue;

    // upsert-by-_id keeps the original ids, so relations between collections hold.
    const ops = targets.map((doc) => ({
      replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true },
    }));

    const result = await Model.bulkWrite(ops, { ordered: false });
    console.log(`  -> inserted ${result.upsertedCount}, overwritten ${result.modifiedCount}`);
  }

  if (confirmed) {
    console.log("\nRestore complete.");
    console.log("Note: user password hashes are not in the backup. Affected users must use Forgot Password.");
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Restore failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
