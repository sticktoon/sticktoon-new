/**
 * Clear base64 avatars from the users collection.
 *
 * RUN THIS BEFORE DEPLOYING the avatar validator in models/User.js. Mongoose
 * validates the whole document on save(), so a user still holding an inline
 * avatar would fail their next save - which for a Google account happens on
 * sign-in (routes/auth.js). Clearing it first avoids locking them out.
 *
 *   node scripts/cleanInlineAvatars.js         -> dry run
 *   node scripts/cleanInlineAvatars.js --yes   -> apply
 *
 * The avatar is only ever decoration: the UI already falls back to the user's
 * initial when it is empty, so clearing it costs a letter instead of a picture.
 * Profile photo upload was removed from the UI in 0f0452f, so nothing writes
 * these any more - this is leftover data.
 */
require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");
const User = require("../models/User");

const apply = process.argv.includes("--yes");

async function main() {
  if (!process.env.MONGO_URI) {
    console.error("No MONGO_URI in .env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Database: ${mongoose.connection.name} @ ${mongoose.connection.host}`);
  if (!apply) console.log("\nDRY RUN - nothing is written. Add --yes to apply.");
  console.log("");

  const users = await User.find({ avatar: /^data:/i }).select("_id email avatar").lean();

  for (const user of users) {
    console.log(`${user.email || user._id}  ${(Buffer.byteLength(user.avatar) / 1024).toFixed(0)} KB`);
  }

  if (!users.length) {
    console.log("No inline avatars. Nothing to do.");
  } else if (apply) {
    // updateMany, not save(): the validator this script exists to unblock would
    // otherwise have to pass on documents that are exactly what it rejects.
    const result = await User.updateMany({ avatar: /^data:/i }, { $set: { avatar: null } });
    console.log(`\nCleared ${result.modifiedCount} avatar(s).`);
  } else {
    console.log(`\nWould clear ${users.length} avatar(s). Re-run with --yes to apply.`);
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Cleanup failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
