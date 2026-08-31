const fs = require("fs");
const path = require("path");
const { compressImageBuffer } = require("../utils/imageCompressor");

const UPLOADS_DIR = path.join(__dirname, "../uploads");

async function processDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log(`📁 Directory not found: ${dirPath}`);
    return;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      await processDirectory(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if ([".jpg", ".jpeg", ".png", ".bmp"].includes(ext)) {
        console.log(`🔍 Processing existing image: ${entry.name}...`);
        try {
          const fileBuffer = fs.readFileSync(fullPath);
          const compressed = await compressImageBuffer(fileBuffer, { maxDimension: 1200, quality: 80, format: "webp" });
          
          if (compressed.isCompressed) {
            const newPath = path.join(dirPath, `${path.basename(entry.name, ext)}.webp`);
            fs.writeFileSync(newPath, compressed.buffer);
            console.log(`✅ Saved compressed WebP: ${newPath}`);
          }
        } catch (err) {
          console.error(`❌ Error compressing ${entry.name}:`, err.message);
        }
      }
    }
  }
}

async function main() {
  console.log("🚀 Starting batch compression of existing uploads...");
  await processDirectory(UPLOADS_DIR);
  console.log("🎉 Batch compression finished!");
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { processDirectory };
