/**
 * One-time backfill: grant every pre-existing admin the full section list.
 *
 * Permissions are deny-by-default, so admins created before this feature have
 * an empty list and would be locked out of the whole panel. Run once after
 * deploying. Safe to re-run: accounts that already have permissions are left
 * alone unless --force is passed.
 *
 *   node backend/scripts/backfillAdminPermissions.js
 *   node backend/scripts/backfillAdminPermissions.js --force
 */
const path = require("path");
const mongoose = require("mongoose");
// Resolve against backend/.env so the script works from any directory.
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const User = require("../models/User");
const { ADMIN_PERMISSIONS } = require("../middleware/roleMiddleware");

const force = process.argv.includes("--force");

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const admins = await User.find({ role: "admin" }).select("_id email adminPermissions");
  console.log(`Found ${admins.length} admin account(s). Full list: ${ADMIN_PERMISSIONS.join(", ")}`);

  let updated = 0;
  for (const admin of admins) {
    const current = admin.adminPermissions || [];
    if (current.length && !force) {
      console.log(`  skip  ${admin.email} (already has ${current.length}: ${current.join(", ")})`);
      continue;
    }

    admin.adminPermissions = [...ADMIN_PERMISSIONS];
    await admin.save();
    updated += 1;
    console.log(`  grant ${admin.email} -> all sections`);
  }

  console.log(`\nDone. ${updated} account(s) updated, ${admins.length - updated} left unchanged.`);
  console.log("Super admins are unaffected - they bypass permission checks entirely.");

  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error("Backfill failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
