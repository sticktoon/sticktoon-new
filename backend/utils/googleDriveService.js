const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

// Initialize Google Drive API
let drive = null;
let authMode = null;
let rootFolderId = null;
const folderCache = {}; // Cache folder IDs to avoid repeated API calls

/**
 * Initialize Google Drive client
 */
function initializeDrive() {
  if (drive) return drive;

  try {
    // Preferred mode: OAuth refresh token for personal Google Drive (free tier).
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

    if (clientId && clientSecret && refreshToken) {
      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
      oauth2Client.setCredentials({ refresh_token: refreshToken });
      drive = google.drive({ version: "v3", auth: oauth2Client });
      authMode = "oauth";
      console.log("✅ Google Drive initialized via OAuth refresh token");
      return drive;
    }

    // Fallback mode: service account (works well with Shared Drives / Workspace setup).
    const keyFilePath = path.resolve(__dirname, "../config/google-drive-service-account.json");
    if (!fs.existsSync(keyFilePath)) {
      throw new Error(
        "Google Drive auth missing. Set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GOOGLE_DRIVE_REFRESH_TOKEN, or provide backend/config/google-drive-service-account.json"
      );
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });

    drive = google.drive({ version: "v3", auth });
    authMode = "service-account";
    console.log("✅ Google Drive initialized via service account");
    return drive;
  } catch (error) {
    console.error("❌ Failed to initialize Google Drive:", error.message);
    throw error;
  }
}

/**
 * Find or create a folder in Google Drive
 * @param {string} folderName - Name of the folder
 * @param {string} parentFolderId - Parent folder ID (optional)
 * @returns {Promise<string>} Folder ID
 */
async function findOrCreateFolder(folderName, parentFolderId = null) {
  const driveClient = initializeDrive();

  // Check cache first
  const cacheKey = parentFolderId ? `${parentFolderId}/${folderName}` : folderName;
  if (folderCache[cacheKey]) {
    return folderCache[cacheKey];
  }

  try {
    // Search for existing folder
    let query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    if (parentFolderId) {
      query += ` and '${parentFolderId}' in parents`;
    }

    const searchResponse = await driveClient.files.list({
      q: query,
      fields: "files(id, name)",
      spaces: "drive",
    });

    // If folder exists, return its ID
    if (searchResponse.data.files && searchResponse.data.files.length > 0) {
      const folderId = searchResponse.data.files[0].id;
      folderCache[cacheKey] = folderId;
      console.log(`📁 Found existing folder: ${folderName} (ID: ${folderId})`);
      return folderId;
    }

    // Create new folder if it doesn't exist
    const fileMetadata = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    };

    if (parentFolderId) {
      fileMetadata.parents = [parentFolderId];
    }

    const folderResponse = await driveClient.files.create({
      requestBody: fileMetadata,
      fields: "id",
    });

    const folderId = folderResponse.data.id;
    folderCache[cacheKey] = folderId;
    console.log(`✅ Created new folder: ${folderName} (ID: ${folderId})`);
    return folderId;
  } catch (error) {
    console.error(`❌ Error finding/creating folder ${folderName}:`, error.message);
    throw error;
  }
}

/**
 * Get or create the root "StickToon" folder structure
 * @returns {Promise<{badge: string, images: string, sticker: string}>}
 */
async function getOrCreateFolderStructure() {
  try {
    // Use explicit folder IDs from .env when available.
    const badgeFolderId = process.env.GOOGLE_DRIVE_BADGE_FOLDER_ID;
    const imagesFolderId = process.env.GOOGLE_DRIVE_IMAGES_FOLDER_ID;
    const stickerFolderId = process.env.GOOGLE_DRIVE_STICKER_FOLDER_ID;

    if (badgeFolderId && imagesFolderId && stickerFolderId) {
      console.log("✅ Using pre-configured shared Google Drive folders");
      return {
        badge: badgeFolderId,
        images: imagesFolderId,
        sticker: stickerFolderId,
      };
    }

    console.warn("⚠️ Folder IDs not configured. Attempting to find/create StickToon folders.");

    // Create root "StickToon" folder
    if (!rootFolderId) {
      rootFolderId = await findOrCreateFolder("StickToon");
    }

    // Create subfolders (badge, images, sticker)
    const [badgeFolderIdCreated, imagesFolderIdCreated, stickerFolderIdCreated] = await Promise.all([
      findOrCreateFolder("badge", rootFolderId),
      findOrCreateFolder("images", rootFolderId),
      findOrCreateFolder("sticker", rootFolderId),
    ]);

    return {
      badge: badgeFolderIdCreated,
      images: imagesFolderIdCreated,
      sticker: stickerFolderIdCreated,
    };
  } catch (error) {
    console.error("❌ Error creating folder structure:", error.message);
    throw error;
  }
}

/**
 * Upload file to Google Drive
 * @param {Buffer|string} fileSource - File buffer or file path
 * @param {string} category - Category (badge, images, or sticker)
 * @param {string} fileName - Original file name
 * @returns {Promise<{url: string, fileId: string}>}
 */
async function uploadToGoogleDrive(fileSource, category, fileName) {
  const driveClient = initializeDrive();

  try {
    // Get folder structure
    const folders = await getOrCreateFolderStructure();
    const folderId = folders[category];

    if (!folderId) {
      throw new Error(`Invalid category: ${category}. Must be 'badge', 'images', or 'sticker'.`);
    }

    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    let media;
    if (Buffer.isBuffer(fileSource)) {
      // Upload from buffer
      const { Readable } = require("stream");
      const bufferStream = new Readable();
      bufferStream.push(fileSource);
      bufferStream.push(null);

      media = {
        mimeType: "image/*",
        body: bufferStream,
      };
    } else {
      // Upload from file path
      media = {
        mimeType: "image/*",
        body: fs.createReadStream(fileSource),
      };
    }

    const response = await driveClient.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id, webViewLink, webContentLink",
      supportsAllDrives: true,
    });

    const fileId = response.data.id;

    // Make file publicly accessible (optional - remove if you want private files)
    try {
      await driveClient.permissions.create({
        fileId: fileId,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
        supportsAllDrives: true,
      });
    } catch (permError) {
      console.warn("⚠️ Could not set public permissions:", permError.message);
    }

    // Get the direct download link
    const directLink = `https://drive.google.com/uc?export=view&id=${fileId}`;

    console.log(`✅ Google Drive upload successful: ${fileName} (ID: ${fileId})`);

    return {
      url: directLink,
      fileId: fileId,
      webViewLink: response.data.webViewLink,
    };
  } catch (error) {
    if (error.message && error.message.toLowerCase().includes("storage quota")) {
      if (authMode === "service-account") {
        console.warn("⚠️ Service-account quota limitation detected.");
        console.warn("   Fix: use OAuth refresh token from your personal Google account.");
        console.warn("   Run: node scripts/generateGoogleDriveToken.js");
      }
      throw new Error("GOOGLE_DRIVE_QUOTA_ERROR");
    }
    console.error("❌ Google Drive upload error:", error.message);
    throw error;
  }
}

/**
 * Delete file from Google Drive
 * @param {string} fileId - Google Drive file ID
 * @returns {Promise<void>}
 */
async function deleteFromGoogleDrive(fileId) {
  const driveClient = initializeDrive();

  try {
    await driveClient.files.delete({ fileId });
    console.log(`🗑️ Deleted file from Google Drive: ${fileId}`);
  } catch (error) {
    console.error("❌ Google Drive delete error:", error.message);
    throw error;
  }
}

module.exports = {
  uploadToGoogleDrive,
  deleteFromGoogleDrive,
  getOrCreateFolderStructure,
};
