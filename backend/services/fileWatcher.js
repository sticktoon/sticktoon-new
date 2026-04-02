const chokidar = require("chokidar");
const path = require("path");
const fs = require("fs");
const { uploadImageToAll } = require("../utils/imageUploadService");
const ImageUpload = require("../models/ImageUpload");

let watcher = null;
let isWatching = false;
let watcherStartedAt = Date.now();

// Track processed files to avoid duplicate uploads
const processedFiles = new Set();
const processingFiles = new Set();

function normalizeFileKey(filePath) {
  return path.resolve(filePath).replace(/\\/g, "/");
}

/**
 * Determine category from file path
 * @param {string} filePath - Full file path
 * @returns {string|null} Category name or null
 */
function getCategoryFromPath(filePath) {
  const normalizedPath = filePath.replace(/\\/g, "/");
  
  if (normalizedPath.includes("/public/badge/")) return "badge";
  if (normalizedPath.includes("/public/images/")) return "images";
  if (normalizedPath.includes("/public/sticker/")) return "sticker";
  
  return null;
}

/**
 * Check if file is an image
 * @param {string} filePath - File path
 * @returns {boolean}
 */
function isImageFile(filePath) {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
  const ext = path.extname(filePath).toLowerCase();
  return imageExtensions.includes(ext);
}

/**
 * Process newly added image file
 * @param {string} filePath - Full path to the file
 */
async function processNewImage(filePath) {
  const fileKey = normalizeFileKey(filePath);

  // Prevent duplicate processing
  if (processedFiles.has(fileKey) || processingFiles.has(fileKey)) {
    return;
  }

  processingFiles.add(fileKey);

  try {
    // Validate file is an image
    if (!isImageFile(filePath)) {
      console.log(`⏭️ Skipping non-image file: ${filePath}`);
      processingFiles.delete(fileKey);
      return;
    }

    // Get category from path
    const category = getCategoryFromPath(filePath);
    if (!category) {
      console.log(`⏭️ Skipping file outside watched categories: ${filePath}`);
      processingFiles.delete(fileKey);
      return;
    }

    // Skip generated files
    const normalizedPath = filePath.replace(/\\/g, "/");
    if (normalizedPath.includes("/generated/")) {
      console.log(`⏭️ Skipping generated file: ${filePath}`);
      processingFiles.delete(fileKey);
      return;
    }

    // Wait a bit to ensure file is fully written
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Check if file still exists and is readable
    if (!fs.existsSync(filePath)) {
      console.log(`⏭️ File no longer exists: ${filePath}`);
      processingFiles.delete(fileKey);
      return;
    }

    const fileName = path.basename(filePath);

    // Skip if this file name is already uploaded in same category
    const existing = await ImageUpload.findOne({ fileName, category }).lean();
    if (existing) {
      processedFiles.add(fileKey);
      processingFiles.delete(fileKey);
      return;
    }

    console.log(`\n📁 File watcher detected new image: ${fileName}`);
    console.log(`   Category: ${category}`);
    console.log(`   Path: ${filePath}`);

    // Upload to both services
    const uploadResult = await uploadImageToAll(filePath, category, fileName, {
      uploadMethod: "watcher",
      uploadedBy: null,
    });

    // Save to database
    const imageUpload = new ImageUpload({
      fileName: uploadResult.fileName,
      category: uploadResult.category,
      uploadMethod: uploadResult.uploadMethod,
      uploadStatus: uploadResult.uploadStatus,
      uploadedBy: null,
      cloudinary: uploadResult.cloudinary,
      googleDrive: uploadResult.googleDrive,
      errors: uploadResult.errors,
    });

    await imageUpload.save();

    console.log(`✅ File watcher: ${fileName} uploaded successfully (Status: ${uploadResult.uploadStatus})`);
    
    if (uploadResult.cloudinary?.url) {
      console.log(`   Cloudinary: ${uploadResult.cloudinary.url}`);
    }
    if (uploadResult.googleDrive?.url) {
      console.log(`   Google Drive: ${uploadResult.googleDrive.url}`);
    }

    // Mark as processed
    processedFiles.add(fileKey);
  } catch (error) {
    console.error(`❌ File watcher error processing ${filePath}:`, error.message);
  } finally {
    processingFiles.delete(fileKey);
  }
}

/**
 * Initialize file watcher
 * @param {string} publicPath - Path to public folder
 */
function initializeFileWatcher(publicPath) {
  if (isWatching) {
    console.log("⚠️ File watcher already running");
    return;
  }

  watcherStartedAt = Date.now();

  const watchPaths = [
    path.join(publicPath, "badge"),
    path.join(publicPath, "images"),
    path.join(publicPath, "sticker"),
  ];

  console.log("\n🔍 Initializing file watcher...");
  console.log("   Watching directories:");
  watchPaths.forEach((p) => console.log(`   - ${p}`));

  watcher = chokidar.watch(watchPaths, {
    ignored: (watchedPath, stats) => {
      const normalized = watchedPath.replace(/\\/g, "/");

      if (normalized.includes("/generated/") || normalized.includes("/node_modules/")) {
        return true;
      }

      if (stats && stats.isFile()) {
        if (normalized.endsWith(".tmp") || normalized.endsWith(".temp")) {
          return true;
        }
        return !isImageFile(watchedPath);
      }

      return false;
    },
    persistent: true,
    ignoreInitial: true, // Don't trigger on existing files
    awaitWriteFinish: {
      stabilityThreshold: 2000, // Wait 2s after last change
      pollInterval: 100,
    },
  });

  watcher
    .on("add", (filePath) => {
      console.log(`\n👁️ File watcher: New file detected - ${path.basename(filePath)}`);
      processNewImage(filePath);
    })
    .on("error", (error) => {
      console.error("❌ File watcher error:", error);
    })
    .on("ready", () => {
      isWatching = true;
      console.log("✅ File watcher is ready and monitoring for new images\n");
    });

  return watcher;
}

/**
 * Stop file watcher
 */
async function stopFileWatcher() {
  if (watcher) {
    await watcher.close();
    isWatching = false;
    watcher = null;
    console.log("🛑 File watcher stopped");
  }
}

/**
 * Get watcher status
 */
function getWatcherStatus() {
  return {
    isWatching,
    processedFilesCount: processedFiles.size,
    processingFilesCount: processingFiles.size,
  };
}

module.exports = {
  initializeFileWatcher,
  stopFileWatcher,
  getWatcherStatus,
};
