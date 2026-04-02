require("dotenv").config();
const mongoose = require("mongoose");
const ImageUpload = require("../models/ImageUpload");

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const images = await ImageUpload.countDocuments({
    category: "images",
    "googleDrive.fileId": { $exists: true, $ne: null },
  });

  console.log(`\n✅ Images in Google Drive: ${images}/26`);

  if (images === 26) {
    console.log("🎉 All images successfully uploaded to Google Drive!\n");
  }

  mongoose.connection.close();
  process.exit(0);
});
