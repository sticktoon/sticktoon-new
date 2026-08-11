/**
 * Push the images that only ever reached Cloudinary up to Google Drive.
 *
 * Drive uploads have been failing since 2026-04-03 with
 * GOOGLE_DRIVE_INVALID_GRANT, so ~120 assets exist on Cloudinary but not on
 * Drive and their ImageUpload row is stuck at uploadStatus "partial".
 *
 * REGENERATE THE TOKEN FIRST, or every upload here fails the same way:
 *
 *   node scripts/generateGoogleDriveToken.js      (opens a browser, needs you)
 *   -> put GOOGLE_DRIVE_REFRESH_TOKEN in backend/.env AND in Render's env vars
 *
 * Then:
 *
 *   node scripts/backfillGoogleDrive.js            -> dry run, lists the gap
 *   node scripts/backfillGoogleDrive.js --yes      -> upload
 *   node scripts/backfillGoogleDrive.js --yes --limit=5
 *                                                  -> prove the token works first
 *
 * Bytes come from the Cloudinary copy rather than public/, because the file is
 * not always still on disk. Safe to re-run: a row that already has a Drive URL
 * is skipped, and a row that fails keeps its "partial" status for the next run.
 */
require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");
const axios = require("axios");
const ImageUpload = require("../models/ImageUpload");
const { uploadToGoogleDrive } = require("../utils/googleDriveService");

const args = process.argv.slice(2);
const apply = args.includes("--yes");
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.slice(8)) : Infinity;

async function main() {
  if (!process.env.MONGO_URI) {
    console.error("No MONGO_URI in .env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Database: ${mongoose.connection.name} @ ${mongoose.connection.host}`);
  if (!apply) console.log("\nDRY RUN - nothing is uploaded or written. Add --yes to apply.");
  console.log("");

  const pending = await ImageUpload.find({
    "cloudinary.url": { $ne: null },
    $or: [{ "googleDrive.url": null }, { "googleDrive.url": { $exists: false } }],
  }).lean();

  console.log(`${pending.length} image(s) on Cloudinary but not on Drive.\n`);

  let done = 0;
  let failed = 0;

  for (const row of pending) {
    if (done >= limit) break;

    console.log(`${row.category}/${row.fileName}`);
    if (!apply) {
      done++;
      continue;
    }

    try {
      const response = await axios.get(row.cloudinary.url, {
        responseType: "arraybuffer",
        timeout: 30000,
      });

      const result = await uploadToGoogleDrive(Buffer.from(response.data), row.category, row.fileName);

      await ImageUpload.updateOne(
        { _id: row._id },
        {
          $set: {
            googleDrive: {
              url: result.url,
              fileId: result.fileId,
              webViewLink: result.webViewLink,
            },
            uploadStatus: "success",
            // The recorded failure is what this run just resolved.
            errors: null,
          },
        }
      );
      done++;
      console.log(`  -> ${result.url}`);
    } catch (err) {
      failed++;
      console.error(`  failed: ${err.message}`);

      /* An expired refresh token fails identically for every remaining file.
         Stop rather than log the same error a hundred times. */
      if (String(err.message).includes("INVALID_GRANT")) {
        console.error("\nThe refresh token is still invalid. Regenerate it first:");
        console.error("  node scripts/generateGoogleDriveToken.js");
        break;
      }
    }
  }

  console.log(`\n${apply ? "Uploaded" : "Would upload"} ${done} image(s).`);
  if (failed) console.log(`${failed} failed - re-run to retry them.`);
  if (!apply && done) console.log("Re-run with --yes to apply.");

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Backfill failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
