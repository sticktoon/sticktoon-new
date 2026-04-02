const fs = require('fs');
const path = require('path');
require('dotenv').config();
const mongoose = require('mongoose');
const ImageUpload = require('../models/ImageUpload');

async function checkExistingImages() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database\n');
    
    const categories = ['badge', 'images', 'sticker'];
    let totalLocal = 0;
    let totalUploaded = 0;
    let totalMissing = 0;
    
    for (const category of categories) {
      const publicPath = path.join(__dirname, '../../public', category);
      
      // Get files from folder
      const localFiles = fs.existsSync(publicPath) 
        ? fs.readdirSync(publicPath).filter(f => {
            const ext = path.extname(f).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
          })
        : [];
      
      // Get uploaded files
      const uploadedFiles = await ImageUpload.find({ category }).lean();
      const uploadedNames = uploadedFiles.map(u => u.fileName);
      
      // Find missing uploads
      const notUploaded = localFiles.filter(f => !uploadedNames.includes(f));
      
      totalLocal += localFiles.length;
      totalUploaded += uploadedFiles.length;
      totalMissing += notUploaded.length;
      
      console.log(`📁 Category: ${category}`);
      console.log(`   Local files: ${localFiles.length}`);
      console.log(`   Uploaded to cloud: ${uploadedFiles.length}`);
      console.log(`   Not uploaded: ${notUploaded.length}`);
      
      if (notUploaded.length > 0) {
        console.log(`   Missing uploads:`);
        notUploaded.slice(0, 10).forEach(f => console.log(`   - ${f}`));
        if (notUploaded.length > 10) {
          console.log(`   ... and ${notUploaded.length - 10} more`);
        }
      }
      console.log('');
    }
    
    console.log('📊 Summary:');
    console.log(`   Total local files: ${totalLocal}`);
    console.log(`   Total uploaded: ${totalUploaded}`);
    console.log(`   Total missing: ${totalMissing}`);
    
    if (totalMissing > 0) {
      console.log('\n💡 To upload missing files, run:');
      console.log('   node scripts/uploadExisting.js badge');
      console.log('   node scripts/uploadExisting.js images');
      console.log('   node scripts/uploadExisting.js sticker');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

checkExistingImages();
