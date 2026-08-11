/**
 * Point every product image at Cloudinary instead of a path inside public/.
 *
 * The catalog is split across two backends: products added through the admin
 * panel carry a Cloudinary URL, older ones carry "/badge/moody2.png" and are
 * served from the copy of public/ that ships with the frontend deploy. That
 * makes the repo carry ~195 binaries and ties image availability to a redeploy.
 *
 * Almost nothing needs uploading: the files were already pushed to Cloudinary by
 * the watcher and the admin uploader, so this is mostly a relink - match the
 * path's filename against the ImageUpload records and swap in the URL.
 *
 *   node scripts/migrateProductImages.js
 *       -> dry run: lists every change, writes nothing
 *
 *   node scripts/migrateProductImages.js --yes
 *       -> apply
 *
 *   node scripts/migrateProductImages.js --yes --upload
 *       -> also upload paths that have no Cloudinary copy but do exist on disk
 *
 * Covers image, printImage, imageMagnetic, the images[] gallery and
 * comboItems[].image. Safe to re-run: a field already holding a URL is skipped.
 *
 * TAKE A BACKUP FIRST (admin panel -> Create Backup). This rewrites live products.
 */
require("dotenv").config({ quiet: true });
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const ImageUpload = require("../models/ImageUpload");
const { uploadImageToAll } = require("../utils/imageUploadService");

const args = process.argv.slice(2);
const apply = args.includes("--yes");
const doUpload = args.includes("--upload");

const SINGLE_FIELDS = ["image", "printImage", "imageMagnetic"];
const PUBLIC_DIR = path.join(__dirname, "../../public");

const isLocalPath = (value) =>
  typeof value === "string" && value.trim() !== "" && !/^https?:\/\//i.test(value) && !/^data:/i.test(value);

const categoryOf = (localPath) => {
  const first = localPath.replace(/^\//, "").split("/")[0].toLowerCase();
  return ["badge", "images", "sticker"].includes(first) ? first : "badge";
};

async function main() {
  if (!process.env.MONGO_URI) {
    console.error("No MONGO_URI in .env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Database: ${mongoose.connection.name} @ ${mongoose.connection.host}`);
  if (!apply) console.log("\nDRY RUN - nothing is written. Add --yes to apply.");
  console.log("");

  // What the watcher and the admin uploader already pushed, keyed by filename.
  const byFileName = new Map();
  for (const record of await ImageUpload.find({ "cloudinary.url": { $ne: null } }).lean()) {
    byFileName.set(record.fileName.toLowerCase(), record.cloudinary.url);
  }
  console.log(`${byFileName.size} filenames already on Cloudinary\n`);

  const stats = { relinked: 0, uploaded: 0, broken: 0, products: 0 };
  const broken = [];

  /* Returns the Cloudinary URL for a local path, or null to leave it alone.
     Uploading is opt-in: a path with no Cloudinary copy and no file on disk is a
     link that is already broken on the live site, and this script should report
     that rather than quietly paper over it. */
  const resolve = async (localPath) => {
    const fileName = localPath.split("/").pop();
    const known = byFileName.get(fileName.toLowerCase());
    if (known) {
      stats.relinked++;
      return known;
    }

    const onDisk = path.join(PUBLIC_DIR, localPath.replace(/^\//, ""));
    if (!fs.existsSync(onDisk)) {
      stats.broken++;
      broken.push(localPath);
      return null;
    }

    if (!doUpload) {
      console.log(`  ${localPath} - on disk but not on Cloudinary (re-run with --upload)`);
      return null;
    }

    if (!apply) {
      stats.uploaded++;
      return `<would upload ${fileName}>`;
    }

    const result = await uploadImageToAll(onDisk, categoryOf(localPath), fileName, {
      uploadMethod: "manual-script",
    });
    if (!result?.cloudinary?.url) {
      console.error(`  ${localPath} - upload failed, left as is`);
      return null;
    }
    byFileName.set(fileName.toLowerCase(), result.cloudinary.url);
    stats.uploaded++;
    return result.cloudinary.url;
  };

  for (const product of await Product.find({}).lean()) {
    const updates = {};

    for (const field of SINGLE_FIELDS) {
      if (!isLocalPath(product[field])) continue;
      const url = await resolve(product[field]);
      if (url) updates[field] = url;
    }

    if (Array.isArray(product.images)) {
      const next = [...product.images];
      let changed = false;
      for (const [index, value] of next.entries()) {
        if (!isLocalPath(value)) continue;
        const url = await resolve(value);
        if (url) {
          next[index] = url;
          changed = true;
        }
      }
      if (changed) updates.images = next;
    }

    if (Array.isArray(product.comboItems)) {
      const next = product.comboItems.map((item) => ({ ...item }));
      let changed = false;
      for (const item of next) {
        if (!isLocalPath(item.image)) continue;
        const url = await resolve(item.image);
        if (url) {
          item.image = url;
          changed = true;
        }
      }
      if (changed) updates.comboItems = next;
    }

    if (!Object.keys(updates).length) continue;

    stats.products++;
    console.log(`${product.name || product._id}`);
    for (const [field, value] of Object.entries(updates)) {
      if (Array.isArray(value)) console.log(`  ${field}[] -> ${value.length} entr(y|ies) relinked`);
      else console.log(`  ${field} -> ${String(value).slice(0, 72)}`);
    }

    if (apply) await Product.updateOne({ _id: product._id }, { $set: updates });
  }

  console.log(
    `\n${apply ? "Updated" : "Would update"} ${stats.products} product(s): ` +
      `${stats.relinked} relinked, ${stats.uploaded} uploaded.`
  );

  if (broken.length) {
    const unique = [...new Set(broken)];
    console.log(
      `\n${stats.broken} reference(s) across ${unique.length} distinct path(s) have no Cloudinary copy ` +
        `and no file in public/. These are already broken on the live site:`
    );
    unique.forEach((p) => console.log(`  ${p}`));
    console.log("Re-upload them through the admin panel, or clear the field.");
  }

  if (!apply) console.log("\nRe-run with --yes to apply.");
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Migration failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
