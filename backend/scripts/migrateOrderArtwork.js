/**
 * Move inline custom-order artwork out of MongoDB and into Cloudinary.
 *
 * Orders placed before utils/customArtwork.js existed carry the customer's badge
 * image as a base64 data: URI on the order item - hundreds of kilobytes each,
 * read back by every order query and copied into every backup. This uploads each
 * one and rewrites the field to the Cloudinary URL.
 *
 *   node scripts/migrateOrderArtwork.js
 *       -> dry run: lists what would move, uploads nothing, writes nothing
 *
 *   node scripts/migrateOrderArtwork.js --yes
 *       -> uploads and rewrites the order documents
 *
 *   node scripts/migrateOrderArtwork.js --yes --limit=5
 *       -> do a handful first and check them in Cloudinary before the rest
 *
 *   node scripts/migrateOrderArtwork.js --all
 *       -> include unpaid orders too (see below)
 *
 * Only paid (SUCCESS) orders are touched by default, matching what the checkout
 * now does: artwork is uploaded after payment is verified, so a custom badge
 * that was never paid for never reaches Cloudinary. Artwork on an abandoned
 * PENDING order is dead weight - it is left alone here rather than uploaded.
 *
 * Safe to re-run: an item whose field is already a URL is skipped. An item whose
 * upload fails keeps its inline copy and is reported, so nothing is ever lost -
 * the order document is only written once every image on it has a URL.
 *
 * TAKE A BACKUP FIRST (admin panel -> Create Backup). This rewrites live orders.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Order = require("../models/Order");
const { uploadToCloudinary } = require("../utils/cloudinaryService");
const { isDataUri, ARTWORK_FIELDS, FOLDER, publicName } = require("../utils/customArtwork");

const args = process.argv.slice(2);
const apply = args.includes("--yes");
const includeUnpaid = args.includes("--all");
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.slice(8)) : Infinity;

const kb = (text) => (Buffer.byteLength(String(text)) / 1024).toFixed(0);

async function main() {
  if (!process.env.MONGO_URI) {
    console.error("No MONGO_URI in .env");
    process.exit(1);
  }
  if (apply && !process.env.CLOUDINARY_API_KEY) {
    console.error("No CLOUDINARY_API_KEY in .env - cannot upload");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Database: ${mongoose.connection.name} @ ${mongoose.connection.host}`);
  if (!apply) console.log("\nDRY RUN - nothing is uploaded or written. Add --yes to apply.");
  console.log("");

  const orders = await Order.find(includeUnpaid ? {} : { status: "SUCCESS" }).lean();
  console.log(
    includeUnpaid
      ? "Scope: every order, paid or not (--all)."
      : "Scope: paid (SUCCESS) orders only. Add --all to include unpaid ones."
  );
  console.log("");

  let moved = 0;
  let failed = 0;
  let bytesFreed = 0;
  let touchedOrders = 0;
  const skipped = {};

  // What --all would additionally pick up, so the number is visible either way.
  if (!includeUnpaid) {
    for (const order of await Order.find({ status: { $ne: "SUCCESS" } }).lean()) {
      const bytes = (order.items || []).reduce(
        (sum, item) =>
          sum + ARTWORK_FIELDS.reduce((s, f) => s + (isDataUri(item[f]) ? Buffer.byteLength(item[f]) : 0), 0),
        0
      );
      if (!bytes) continue;
      skipped[order.status] = skipped[order.status] || { orders: 0, bytes: 0 };
      skipped[order.status].orders++;
      skipped[order.status].bytes += bytes;
    }
  }

  for (const order of orders) {
    if (moved >= limit) break;

    const pending = [];
    for (const [index, item] of (order.items || []).entries()) {
      for (const field of ARTWORK_FIELDS) {
        if (isDataUri(item[field])) pending.push({ index, field, value: item[field] });
      }
    }
    if (!pending.length) continue;

    touchedOrders++;
    console.log(`${order._id} (${order.userEmail || "no email"})`);

    const updates = {};
    let orderFailed = false;

    for (const { index, field, value } of pending) {
      if (moved >= limit) break;

      console.log(`  items.${index}.${field}  ${kb(value)} KB`);
      if (!apply) {
        moved++;
        bytesFreed += Buffer.byteLength(value);
        continue;
      }

      try {
        const { url } = await uploadToCloudinary(value, FOLDER, publicName(order.items[index].badgeId, field));
        updates[`items.${index}.${field}`] = url;
        moved++;
        bytesFreed += Buffer.byteLength(value);
      } catch (err) {
        console.error(`    upload failed, left inline: ${err.message}`);
        failed++;
        orderFailed = true;
      }
    }

    // Whatever uploaded gets written; a failed image simply stays inline and the
    // next run picks it up again.
    if (apply && Object.keys(updates).length) {
      await Order.updateOne({ _id: order._id }, { $set: updates });
      console.log(`  written${orderFailed ? " (partial)" : ""}`);
    }
  }

  console.log(
    `\n${apply ? "Moved" : "Would move"} ${moved} image(s) across ${touchedOrders} order(s), ` +
      `freeing ${(bytesFreed / 1024 / 1024).toFixed(1)} MB from the database.`
  );
  if (failed) console.log(`${failed} upload(s) failed and stayed inline - re-run to retry them.`);

  for (const [status, info] of Object.entries(skipped)) {
    console.log(
      `Skipped ${info.orders} ${status} order(s) holding ${(info.bytes / 1024 / 1024).toFixed(1)} MB ` +
        `of artwork for badges that were never paid for.`
    );
  }

  if (!apply) console.log("Re-run with --yes to apply.");

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Migration failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
