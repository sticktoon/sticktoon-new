require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const ImageUpload = require("../models/ImageUpload");
const { uploadImageToAll } = require("../utils/imageUploadService");

const BADGE_DIR = path.resolve(__dirname, "../../public/badge");

const missingFiles = [
  "animal1.png",
  "animal2.png",
  "animal3.png",
  "animal4.png",
  "anime1.png",
  "anime2.png",
  "anime3.png",
  "anime4.png",
  "Brownclassic_Dog.png",
  "bunny.png",
  "c1.png",
  "c2.png",
  "c3.png",
  "c4.png",
  "chat.png",
  "chat1.png",
  "Classic_Dog.png",
  "Cute_Dog.png",
];

async function reuploadMissingBadges() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to database\n");

    // Delete existing records for these files
    const deleted = await ImageUpload.deleteMany({
      category: "badge",
      fileName: { $in: missingFiles },
    });
    console.log(`🗑️  Deleted ${deleted.deletedCount} old records\n`);

    console.log(`📤 Re-uploading ${missingFiles.length} badge files...\n`);

    let success = 0;
    let failed = 0;

    for (const fileName of missingFiles) {
      try {
        const filePath = path.join(BADGE_DIR, fileName);

        if (!fs.existsSync(filePath)) {
          console.log(`⚠️  ${fileName} - File not found, skipping`);
          continue;
        }

        console.log(`📤 ${fileName}...`);

        const result = await uploadImageToAll(filePath, "badge", fileName, {
          uploadMethod: "manual-script",
        });

        // Save to database
        await new ImageUpload({
          fileName: result.fileName,
          category: result.category,
          uploadMethod: "manual-script",
          uploadStatus: result.uploadStatus,
          cloudinary: result.cloudinary,
          googleDrive: result.googleDrive,
          errors: result.errors,
        }).save();

        if (result.uploadStatus === "success") {
          console.log(`   ✅ Success`);
          success++;
        } else {
          console.log(`   ⚠️  Partial`);
          failed++;
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
        failed++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Success: ${success}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📁 Total: ${missingFiles.length}\n`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

reuploadMissingBadges();
