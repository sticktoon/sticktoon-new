/**
 * Migrate the hardcoded STICKERS catalog (constants.tsx) into the Product
 * collection as type:"sticker" so admins can edit/delete them and add new ones.
 *
 * Idempotent: keyed on {type,name,category} with $setOnInsert, so re-running
 * never duplicates and never clobbers later admin edits. Run once after deploy:
 *   node backend/scripts/seedStickers.js
 */
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Product = require("../models/Product");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const STICKER_CATEGORIES = [
  "sticker-pack", "marvel", "dc-universe", "pet", "love", "anime", "cartoon", "sports", "random",
];
// Known typos in the source data mapped to a real category.
const CATEGORY_FIXUP = { dmarvel: "marvel" };

// Pull the STICKERS array straight from the frontend source so the two never
// drift. The array holds only primitives + string categories, so it is plain
// evaluable JS once the TS type annotation is stripped.
// ponytail: eval of our own source file, one-shot script; replace with a shared
// JSON module if stickers ever need to be consumed by more than this seed.
const loadStickersFromConstants = () => {
  const file = path.join(__dirname, "../../constants.tsx");
  const src = fs.readFileSync(file, "utf8");
  const startMarker = "export const STICKERS: Sticker[] = [";
  const start = src.indexOf(startMarker);
  if (start === -1) throw new Error("STICKERS array not found in constants.tsx");
  const bodyStart = start + startMarker.length;
  const end = src.indexOf("\n];", bodyStart);
  if (end === -1) throw new Error("End of STICKERS array not found");
  const body = src.slice(bodyStart, end);
  // eslint-disable-next-line no-eval
  return eval("[" + body + "]");
};

const seedStickers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const stickers = loadStickersFromConstants();
    console.log(`📦 Parsed ${stickers.length} stickers from constants.tsx`);

    let inserted = 0;
    let skipped = 0;
    for (const s of stickers) {
      const category = CATEGORY_FIXUP[s.category] || s.category;
      if (!STICKER_CATEGORIES.includes(category)) {
        console.warn(`⚠️  Skipping "${s.name}" — unknown category "${s.category}"`);
        skipped += 1;
        continue;
      }

      const doc = {
        name: s.name,
        type: "sticker",
        price: Number(s.price) || 0,
        description: s.details || s.name,
        category,
        image: s.image,
        stock: 100,
        isActive: true,
      };

      const result = await Product.updateOne(
        { type: "sticker", name: doc.name, category: doc.category },
        { $setOnInsert: doc },
        { upsert: true },
      );
      if (result.upsertedCount) inserted += 1;
    }

    console.log(`✅ Done. Inserted ${inserted} new stickers, skipped ${skipped}, ${stickers.length - inserted - skipped} already existed.`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding stickers:", err);
    process.exit(1);
  }
};

seedStickers();
