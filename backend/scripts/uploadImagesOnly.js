require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const ImageUpload = require("../models/ImageUpload");
const { uploadImageToAll } = require("../utils/imageUploadService");

const IMAGES_DIR = path.resolve(__dirname, "../../public/images");

async function uploadImages() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to database\n");

    // Delete existing images records
    const deleted = await ImageUpload.deleteMany({ category: "images" });
    console.log(`🗑️  Cleared ${deleted.deletedCount} old image records\n`);

    const files = fs
      .readdirSync(IMAGES_DIR)
      .filter((file) => /\.(png|jpg|jpeg|gif|webp)$/i.test(file));

    console.log(`📤 Uploading ${files.length} images to Google Drive...\n`);

    let success = 0;
    let failed = 0;

    for (const file of files) {
      try {
        const filePath = path.join(IMAGES_DIR, file);

        console.log(`📤 ${file}...`);

        const result = await uploadImageToAll(
          filePath,
          "images",
          file,
          { uploadMethod: "manual-script" }
        );

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
          console.log(`   ⚠️  Partial: ${result.errors ? result.errors.join(", ") : "unknown error"}`);
          failed++;
        }
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
        failed++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Success: ${success}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📁 Total: ${files.length}\n`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

uploadImages();
