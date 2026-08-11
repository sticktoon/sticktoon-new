/**
 * Clear inline artwork from custom orders that were never paid for.
 *
 * A custom badge carries ~1 MB of base64 on the order document. Paid orders get
 * that moved to Cloudinary at payment verification (utils/customArtwork.js), but
 * an order the customer abandoned at the payment screen keeps its copy forever -
 * dragged through every order query and every backup, for a badge nobody bought.
 *
 * Uploading those to Cloudinary instead would just move the junk, so they are
 * cleared. Paid (SUCCESS) orders are never touched, at any age.
 *
 *   node scripts/sweepUnpaidArtwork.js              -> dry run, 30 day cutoff
 *   node scripts/sweepUnpaidArtwork.js --days=90    -> a more cautious cutoff
 *   node scripts/sweepUnpaidArtwork.js --yes        -> apply
 *
 * THIS DISCARDS IMAGE DATA AND CANNOT BE UNDONE. The artwork exists nowhere else
 * - an unpaid order never generated a print document or an email attachment.
 * Take a backup first (admin panel -> Create Backup) and keep the RESTORE json.
 *
 * ponytail: run by hand. Worth a scheduled job only if abandoned custom orders
 * start arriving faster than someone remembers to run this.
 */
require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");
const Order = require("../models/Order");
const { isDataUri, ARTWORK_FIELDS } = require("../utils/customArtwork");

const args = process.argv.slice(2);
const apply = args.includes("--yes");
const daysArg = args.find((a) => a.startsWith("--days="));
const days = daysArg ? Number(daysArg.slice(7)) : 30;

async function main() {
  if (!process.env.MONGO_URI) {
    console.error("No MONGO_URI in .env");
    process.exit(1);
  }
  if (!Number.isFinite(days) || days < 1) {
    console.error("--days must be a positive number");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Database: ${mongoose.connection.name} @ ${mongoose.connection.host}`);

  const cutoff = new Date(Date.now() - days * 86400000);
  console.log(`Unpaid orders created before ${cutoff.toISOString().slice(0, 10)} (${days} days old).`);
  if (!apply) console.log("\nDRY RUN - nothing is written. Add --yes to apply.");
  console.log("");

  // status is the payment state; anything that is not SUCCESS was never paid.
  const orders = await Order.find({
    status: { $ne: "SUCCESS" },
    createdAt: { $lt: cutoff },
  }).lean();

  let cleared = 0;
  let bytes = 0;
  let touched = 0;

  for (const order of orders) {
    const updates = {};
    let orderBytes = 0;

    for (const [index, item] of (order.items || []).entries()) {
      for (const field of ARTWORK_FIELDS) {
        if (!isDataUri(item[field])) continue;
        updates[`items.${index}.${field}`] = null;
        orderBytes += Buffer.byteLength(item[field]);
        cleared++;
      }
    }

    if (!orderBytes) continue;

    touched++;
    bytes += orderBytes;
    const age = Math.round((Date.now() - new Date(order.createdAt).getTime()) / 86400000);
    console.log(`${order._id}  ${order.status}  ${age} days old  ${(orderBytes / 1024).toFixed(0)} KB`);

    if (apply) await Order.updateOne({ _id: order._id }, { $set: updates });
  }

  console.log(
    `\n${apply ? "Cleared" : "Would clear"} ${cleared} image(s) from ${touched} unpaid order(s), ` +
      `freeing ${(bytes / 1024 / 1024).toFixed(1)} MB.`
  );
  if (!apply && touched) console.log("Re-run with --yes to apply. This cannot be undone.");

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Sweep failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
