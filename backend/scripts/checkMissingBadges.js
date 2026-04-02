require("dotenv").config();
const mongoose = require("mongoose");
const ImageUpload = require("../models/ImageUpload");

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const badges = await ImageUpload.find(
    { category: "badge" },
    "fileName googleDrive.fileId uploadStatus"
  ).lean();

  const withGDrive = badges.filter((b) => b.googleDrive?.fileId);
  const withoutGDrive = badges.filter((b) => !b.googleDrive?.fileId);

  console.log(`\n📊 Badge Status:`);
  console.log(`   Total in DB: ${badges.length}`);
  console.log(`   With Google Drive: ${withGDrive.length}`);
  console.log(`   Without Google Drive: ${withoutGDrive.length}\n`);

  if (withoutGDrive.length > 0) {
    console.log("Missing from Google Drive:");
    withoutGDrive.forEach((b) => console.log(`  - ${b.fileName}`));
  }

  mongoose.connection.close();
  process.exit(0);
});
