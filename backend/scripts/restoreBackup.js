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
 *   node scripts/restoreBackup.js <file> --yes --uri="mongodb+srv://.../staging"
 *       -> restore into a different database instead of the one in .env
 *
 * Nothing is ever deleted. A restore can only add rows back or overwrite them.
 * The admin panel offers the insert-only case as a button; --replace and --uri
 * are CLI only - the panel can only ever write to the app's own database.
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { restoreBackup, parseBackup } = require("../utils/restoreBackup");

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const apply = args.includes("--yes");
const replace = args.includes("--replace");
const onlyArg = args.find((a) => a.startsWith("--only="));
const only = onlyArg ? onlyArg.slice(7).split(",").map((s) => s.trim()) : null;
const uriArg = args.find((a) => a.startsWith("--uri="));
const uri = uriArg ? uriArg.slice(6) : process.env.MONGO_URI;

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

  const backup = parseBackup(fs.readFileSync(fullPath, "utf8"));

  if (!uri) {
    console.error("No database URI. Set MONGO_URI in .env or pass --uri=...");
    process.exit(1);
  }

  await mongoose.connect(uri);

  // Always name the target loudly: --uri makes it easy to hit the wrong database.
  console.log(`Target database: ${mongoose.connection.name} @ ${mongoose.connection.host}`);
  if (uriArg) console.log("(from --uri, not .env)");
  console.log("");

  if (!apply) console.log("DRY RUN - nothing will be written. Add --yes to apply.\n");

  const report = await restoreBackup({ backup, apply, replace, only });

  for (const row of report) {
    if (row.skipped) {
      console.log(`${row.collection}: skipped (${row.reason})`);
      continue;
    }
    console.log(
      `${row.collection}: ${row.inBackup} in backup, ${row.alreadyPresent} already in database, ` +
        `${row.toInsert} to insert` +
        (apply ? ` -> inserted ${row.inserted}, overwritten ${row.overwritten}` : "")
    );
  }

  if (apply) {
    console.log("\nRestore complete.");
    console.log("Note: password hashes are not in the backup. Affected users must use Forgot Password.");
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Restore failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
