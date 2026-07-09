/**
 * One-off migration: Review.productId ObjectId -> String.
 *
 * Reviews used to reference `Product` by ObjectId. They now key off the same
 * loose product id that orders store in `items.badgeId`, so that hardcoded
 * badges and stickers ("sticker-1") can be reviewed too.
 *
 * Any row still holding a BSON ObjectId would never match a string query, so
 * rewrite them in place to their 24-char hex form.
 *
 *   node backend/scripts/migrateReviewProductId.js
 *
 * Safe to re-run: rows already stored as strings are skipped.
 */
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const collection = mongoose.connection.collection("reviews");

    const stale = await collection
      .find({ productId: { $type: "objectId" } })
      .toArray();

    if (!stale.length) {
      console.log("✨ Nothing to migrate — every productId is already a string.");
      process.exit(0);
    }

    console.log(`⏳ Converting ${stale.length} review(s)...`);

    let migrated = 0;
    for (const doc of stale) {
      await collection.updateOne(
        { _id: doc._id },
        { $set: { productId: doc.productId.toHexString() } }
      );
      migrated++;
    }

    console.log(`✅ Migrated ${migrated} review(s) to string productId.`);

    // The old unique index was built over the ObjectId field; rebuild it so the
    // "one review per user per product" guarantee still holds for strings.
    try {
      await collection.dropIndex("productId_1_userId_1");
      console.log("🗑️  Dropped stale compound index");
    } catch (err) {
      console.log("ℹ️  No stale compound index to drop");
    }

    await collection.createIndex({ productId: 1, userId: 1 }, { unique: true });
    console.log("✅ Recreated unique index { productId, userId }");

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
};

migrate();
