require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const ImageUpload = require('./models/ImageUpload');
const { initializeFileWatcher, stopFileWatcher } = require('./services/fileWatcher');

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const publicPath = path.join(__dirname, '../public');
  initializeFileWatcher(publicPath);
  await sleep(3500);

  const imagesDir = path.join(publicPath, 'images');
  const source = fs.readdirSync(imagesDir).find(f => /\.(png|jpg|jpeg|webp|gif)$/i.test(f));
  if (!source) throw new Error('No source image found in public/images');

  const testFile = `__autotest_${Date.now()}${path.extname(source)}`;
  const sourcePath = path.join(imagesDir, source);
  const testPath = path.join(imagesDir, testFile);

  fs.copyFileSync(sourcePath, testPath);
  console.log(`TEST_FILE=${testFile}`);

  let found = null;
  const start = Date.now();
  while (Date.now() - start < 90000) {
    found = await ImageUpload.findOne({ fileName: testFile, category: 'images' }).lean();
    if (found) break;
    await sleep(1500);
  }

  if (!found) {
    console.log('AUTO_UPLOAD=false');
  } else {
    console.log('AUTO_UPLOAD=true');
    console.log(`UPLOAD_METHOD=${found.uploadMethod}`);
    console.log(`UPLOAD_STATUS=${found.uploadStatus}`);
    console.log(`HAS_CLOUDINARY=${!!found?.cloudinary?.publicId}`);
    console.log(`HAS_DRIVE=${!!found?.googleDrive?.fileId}`);
  }

  if (fs.existsSync(testPath)) fs.unlinkSync(testPath);
  await ImageUpload.deleteMany({ fileName: testFile, category: 'images' });

  await stopFileWatcher();
  await mongoose.connection.close();
})().catch(async (e) => {
  console.error(e.message || e);
  try { await stopFileWatcher(); } catch (_) {}
  try { await mongoose.connection.close(); } catch (_) {}
  process.exit(1);
});
