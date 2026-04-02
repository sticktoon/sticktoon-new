const mongoose = require("mongoose");

const imageUploadSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ["badge", "images", "sticker"],
      required: true,
    },
    uploadMethod: {
      type: String,
      enum: ["api", "watcher", "manual-script", "startup-scan"],
      default: "api",
    },
    uploadStatus: {
      type: String,
      enum: ["success", "partial", "failed"],
      default: "success",
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    cloudinary: {
      url: {
        type: String,
        default: null,
      },
      publicId: {
        type: String,
        default: null,
      },
    },
    googleDrive: {
      url: {
        type: String,
        default: null,
      },
      fileId: {
        type: String,
        default: null,
      },
      webViewLink: {
        type: String,
        default: null,
      },
    },
    errors: {
      type: [
        {
          service: String,
          error: String,
        },
      ],
      default: null,
    },
  },
  { timestamps: true }
);

// Index for faster queries
imageUploadSchema.index({ category: 1, createdAt: -1 });
imageUploadSchema.index({ uploadedBy: 1 });
imageUploadSchema.index({ uploadStatus: 1 });

module.exports = mongoose.model("ImageUpload", imageUploadSchema);
