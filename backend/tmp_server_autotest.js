require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const ImageUpload = require('./models/ImageUpload');

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const imagesDir = path.join(__dirname, '../public/images');
  const src = fs.readdirSync(imagesDir).find(f => /\.(png|jpg|jpeg|webp|gif)$/i.test(f));
  if (!src) throw new Error('No source image in public/images');

  const testFile = `__autotest_srv_${Date.now()}${path.extname(src)}`;
  const srcPath = path.join(imagesDir, src);
  const testPath = path.join(imagesDir, testFile);
  fs.copyFileSync(srcPath, testPath);
  console.log(`TEST_FILE=${testFile}`);

  let doc = null;
  const start = Date.now();
  while (Date.now() - start < 90000) {
    doc = await ImageUpload.findOne({ fileName: testFile, category: 'images' }).lean();
    if (doc) break;
    await sleep(1500);
  }

  if (!doc) {
    console.log('AUTO_UPLOAD=false');
  } else {
    console.log('AUTO_UPLOAD=true');
    console.log(`UPLOAD_METHOD=${doc.uploadMethod}`);
    console.log(`UPLOAD_STATUS=${doc.uploadStatus}`);
    console.log(`HAS_CLOUDINARY=${!!doc?.cloudinary?.publicId}`);
    console.log(`HAS_DRIVE=${!!doc?.googleDrive?.fileId}`);
  }

  if (fs.existsSync(testPath)) fs.unlinkSync(testPath);
  await ImageUpload.deleteMany({ fileName: testFile, category: 'images' });
  await mongoose.connection.close();
})().catch(async (e)=>{
  console.error(e.message || e);
  try { await mongoose.connection.close(); } catch(_) {}
  process.exit(1);
});
