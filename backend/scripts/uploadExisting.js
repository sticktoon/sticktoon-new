const fs = require('fs');
const path = require('path');
require('dotenv').config();
const mongoose = require('mongoose');
const { uploadImageToAll } = require('../utils/imageUploadService');
const ImageUpload = require('../models/ImageUpload');

async function uploadExistingImages(category) {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database\n');
    
    const publicPath = path.join(__dirname, '../../public', category);
    
    if (!fs.existsSync(publicPath)) {
      console.log(`❌ Folder not found: ${publicPath}`);
      return;
    }
    
    const files = fs.readdirSync(publicPath).filter(f => {
      const ext = path.extname(f).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext) && 
             !f.includes('generated');
    });
    
    console.log(`📤 Found ${files.length} image files in ${category} folder\n`);
    
    let uploaded = 0;
    let skipped = 0;
    let failed = 0;
    
    for (const fileName of files) {
      // Check if already uploaded
      const existing = await ImageUpload.findOne({ fileName, category });
      if (existing) {
        console.log(`⏭️  Skipping ${fileName} (already uploaded)`);
        skipped++;
        continue;
      }
      
      const filePath = path.join(publicPath, fileName);
      
      try {
        console.log(`📤 Uploading: ${fileName}...`);
        
        const result = await uploadImageToAll(filePath, category, fileName, {
          uploadMethod: 'manual-script',
          uploadedBy: null
        });
        
        // Save to database
        await new ImageUpload({
          fileName: result.fileName,
          category: result.category,
          uploadMethod: 'manual-script',
          uploadStatus: result.uploadStatus,
          cloudinary: result.cloudinary,
          googleDrive: result.googleDrive,
          errors: result.errors
        }).save();
        
        if (result.uploadStatus === 'success') {
          console.log(`✅ ${fileName} - uploaded successfully`);
          uploaded++;
        } else {
          console.log(`⚠️  ${fileName} - ${result.uploadStatus} (check errors)`);
          uploaded++;
        }
        
        // Add small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ Failed: ${fileName} - ${error.message}`);
        failed++;
      }
    }
    
    console.log(`\n📊 Upload Summary for ${category}:`);
    console.log(`   ✅ Uploaded: ${uploaded}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📁 Total: ${files.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

// Get category from command line
const category = process.argv[2];

if (!category || !['badge', 'images', 'sticker'].includes(category)) {
  console.log('❌ Invalid or missing category\n');
  console.log('Usage: node uploadExisting.js [badge|images|sticker]');
  console.log('Example: node uploadExisting.js badge');
  process.exit(1);
}

console.log(`🚀 Starting bulk upload for category: ${category}\n`);
uploadExistingImages(category);
