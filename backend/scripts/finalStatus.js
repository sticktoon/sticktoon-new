require("dotenv").config();
const mongoose = require("mongoose");
const ImageUpload = require("../models/ImageUpload");

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const byCategory = await ImageUpload.aggregate([
    { $match: { "googleDrive.fileId": { $exists: true, $ne: null } } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);

  const total = await ImageUpload.countDocuments({
    "googleDrive.fileId": { $exists: true, $ne: null },
  });

  console.log("\n===========================================");
  console.log("   FINAL GOOGLE DRIVE UPLOAD STATUS");
  console.log("===========================================\n");

  byCategory.forEach((r) => {
    console.log(`  ✅ ${r._id}: ${r.count} files`);
  });

  console.log(`\n  🎯 Total: ${total}/166 files\n`);

  if (total === 166) {
    console.log("🎉 SUCCESS! All 166 images uploaded to Google Drive!");
    console.log("\n✔️ badge: Complete");
    console.log("✔️ images: Complete");
    console.log("✔️ sticker: Complete\n");
  }

  console.log("===========================================\n");

  mongoose.connection.close();
  process.exit(0);
});
