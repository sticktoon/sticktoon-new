const cloudinary = require("cloudinary").v2;
const dotenv = require("dotenv");

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload image to Cloudinary
 * @param {Buffer|string} fileBuffer - File buffer or base64 string
 * @param {string} category - Folder category (badge, images, or sticker)
 * @param {string} fileName - Original file name
 * @returns {Promise<{url: string, publicId: string}>}
 */
async function uploadToCloudinary(fileBuffer, category, fileName) {
  try {
    // Determine folder path based on category
    const folderPath = `sticktoon/${category}`;
    
    // Get file name without extension for public_id
    const publicIdName = fileName.split(".")[0];
    
    return new Promise((resolve, reject) => {
      // Upload directly from buffer
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folderPath,
          public_id: publicIdName,
          resource_type: "image",
          overwrite: true,
          unique_filename: false,
        },
        (error, result) => {
          if (error) {
            console.error("❌ Cloudinary upload error:", error);
            reject(error);
          } else {
            console.log(`✅ Cloudinary upload successful: ${result.secure_url}`);
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
            });
          }
        }
      );

      // If fileBuffer is a Buffer, write it to the stream
      if (Buffer.isBuffer(fileBuffer)) {
        uploadStream.end(fileBuffer);
      } else {
        // If it's a base64 string or file path
        cloudinary.uploader.upload(
          fileBuffer,
          {
            folder: folderPath,
            public_id: publicIdName,
            resource_type: "image",
            overwrite: true,
            unique_filename: false,
          },
          (error, result) => {
            if (error) {
              console.error("❌ Cloudinary upload error:", error);
              reject(error);
            } else {
              console.log(`✅ Cloudinary upload successful: ${result.secure_url}`);
              resolve({
                url: result.secure_url,
                publicId: result.public_id,
              });
            }
          }
        );
      }
    });
  } catch (error) {
    console.error("❌ Cloudinary service error:", error);
    throw error;
  }
}

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Cloudinary public_id
 * @returns {Promise<void>}
 */
async function deleteFromCloudinary(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`🗑️ Cloudinary delete result:`, result);
    return result;
  } catch (error) {
    console.error("❌ Cloudinary delete error:", error);
    throw error;
  }
}

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
};
