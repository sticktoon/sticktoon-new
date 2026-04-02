const { uploadToCloudinary, deleteFromCloudinary } = require("./cloudinaryService");
const { uploadToGoogleDrive, deleteFromGoogleDrive } = require("./googleDriveService");

/**
 * Upload image to both Cloudinary and Google Drive
 * @param {Buffer|string} fileSource - File buffer or file path
 * @param {string} category - Category (badge, images, or sticker)
 * @param {string} fileName - Original file name
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Upload results
 */
async function uploadImageToAll(fileSource, category, fileName, options = {}) {
  const { uploadMethod = "api", uploadedBy = null } = options;

  console.log(`📤 Starting upload for ${fileName} to category: ${category}`);

  let cloudinaryResult = null;
  let googleDriveResult = null;
  let errors = [];

  try {
    // Upload to both services in parallel
    const [cloudinaryRes, googleDriveRes] = await Promise.allSettled([
      uploadToCloudinary(fileSource, category, fileName),
      uploadToGoogleDrive(fileSource, category, fileName),
    ]);

    // Process Cloudinary result
    if (cloudinaryRes.status === "fulfilled") {
      cloudinaryResult = cloudinaryRes.value;
      console.log(`✅ Cloudinary: ${cloudinaryResult.url}`);
    } else {
      errors.push({ service: "Cloudinary", error: cloudinaryRes.reason.message });
      console.error(`❌ Cloudinary failed:`, cloudinaryRes.reason.message);
    }

    // Process Google Drive result
    if (googleDriveRes.status === "fulfilled") {
      googleDriveResult = googleDriveRes.value;
      console.log(`✅ Google Drive: ${googleDriveResult.url}`);
    } else {
      errors.push({ service: "Google Drive", error: googleDriveRes.reason.message });
      console.error(`❌ Google Drive failed:`, googleDriveRes.reason.message);
    }

    // Determine upload status
    let uploadStatus = "success";
    if (errors.length === 2) {
      uploadStatus = "failed";
    } else if (errors.length === 1) {
      uploadStatus = "partial";
    }

    // Prepare response
    const result = {
      fileName,
      category,
      uploadStatus,
      uploadMethod,
      uploadedBy,
      cloudinary: cloudinaryResult
        ? {
            url: cloudinaryResult.url,
            publicId: cloudinaryResult.publicId,
          }
        : null,
      googleDrive: googleDriveResult
        ? {
            url: googleDriveResult.url,
            fileId: googleDriveResult.fileId,
            webViewLink: googleDriveResult.webViewLink,
          }
        : null,
      errors: errors.length > 0 ? errors : null,
    };

    console.log(`✅ Upload completed with status: ${uploadStatus}`);
    return result;
  } catch (error) {
    console.error("❌ Unexpected error during upload:", error);
    throw error;
  }
}

/**
 * Delete image from both Cloudinary and Google Drive
 * @param {string} cloudinaryPublicId - Cloudinary public_id
 * @param {string} googleDriveFileId - Google Drive file ID
 * @returns {Promise<Object>} Deletion results
 */
async function deleteImageFromAll(cloudinaryPublicId, googleDriveFileId) {
  console.log(`🗑️ Starting deletion from both services`);

  const results = {
    cloudinary: null,
    googleDrive: null,
    errors: [],
  };

  // Delete from both services in parallel
  const [cloudinaryRes, googleDriveRes] = await Promise.allSettled([
    cloudinaryPublicId ? deleteFromCloudinary(cloudinaryPublicId) : Promise.resolve(null),
    googleDriveFileId ? deleteFromGoogleDrive(googleDriveFileId) : Promise.resolve(null),
  ]);

  if (cloudinaryRes.status === "fulfilled") {
    results.cloudinary = "success";
  } else {
    results.errors.push({ service: "Cloudinary", error: cloudinaryRes.reason.message });
  }

  if (googleDriveRes.status === "fulfilled") {
    results.googleDrive = "success";
  } else {
    results.errors.push({ service: "Google Drive", error: googleDriveRes.reason.message });
  }

  return results;
}

/**
 * Validate image file
 * @param {Object} file - File object from multer or file system
 * @returns {Object} Validation result
 */
function validateImageFile(file) {
  const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
  const maxSizeInBytes = 10 * 1024 * 1024; // 10MB

  if (!file) {
    return { valid: false, error: "No file provided" };
  }

  // Check file type
  const mimeType = file.mimetype || file.type;
  if (!allowedMimeTypes.includes(mimeType)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedMimeTypes.join(", ")}`,
    };
  }

  // Check file size
  const fileSize = file.size || (file.buffer ? file.buffer.length : 0);
  if (fileSize > maxSizeInBytes) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxSizeInBytes / 1024 / 1024}MB`,
    };
  }

  return { valid: true };
}

/**
 * Validate category
 * @param {string} category - Category name
 * @returns {boolean}
 */
function validateCategory(category) {
  const validCategories = ["badge", "images", "sticker"];
  return validCategories.includes(category);
}

module.exports = {
  uploadImageToAll,
  deleteImageFromAll,
  validateImageFile,
  validateCategory,
};
