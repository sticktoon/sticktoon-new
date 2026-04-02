const express = require("express");
const multer = require("multer");
const {
  uploadImageToAll,
  deleteImageFromAll,
  validateImageFile,
  validateCategory,
} = require("../utils/imageUploadService");
const ImageUpload = require("../models/ImageUpload");
const auth = require("../middleware/auth");

const router = express.Router();

// Configure multer for memory storage (no disk writes)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

/* ======================
   ADMIN ONLY MIDDLEWARE
====================== */
const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

/* ======================
   UPLOAD IMAGE
   POST /api/admin/images/upload
====================== */
router.post("/upload", auth, adminOnly, upload.single("image"), async (req, res) => {
  try {
    const { category } = req.body;
    const file = req.file;

    // Validate category
    if (!category || !validateCategory(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category. Must be 'badge', 'images', or 'sticker'.",
      });
    }

    // Validate file
    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const validation = validateImageFile(file);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    // Upload to both services
    const uploadResult = await uploadImageToAll(file.buffer, category, file.originalname, {
      uploadMethod: "api",
      uploadedBy: req.user.id,
    });

    // Save to database
    const imageUpload = new ImageUpload({
      fileName: uploadResult.fileName,
      category: uploadResult.category,
      uploadMethod: uploadResult.uploadMethod,
      uploadStatus: uploadResult.uploadStatus,
      uploadedBy: uploadResult.uploadedBy,
      cloudinary: uploadResult.cloudinary,
      googleDrive: uploadResult.googleDrive,
      errors: uploadResult.errors,
    });

    await imageUpload.save();

    res.status(200).json({
      success: true,
      message: "Image uploaded successfully",
      data: {
        id: imageUpload._id,
        fileName: imageUpload.fileName,
        category: imageUpload.category,
        uploadStatus: imageUpload.uploadStatus,
        cloudinaryUrl: uploadResult.cloudinary?.url,
        googleDriveUrl: uploadResult.googleDrive?.url,
        errors: uploadResult.errors,
      },
    });
  } catch (error) {
    console.error("❌ Upload error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload image",
      error: error.message,
    });
  }
});

/* ======================
   GET ALL UPLOADED IMAGES
   GET /api/admin/images
====================== */
router.get("/", auth, adminOnly, async (req, res) => {
  try {
    const { category, status, page = 1, limit = 50 } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (status) filter.uploadStatus = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [images, total] = await Promise.all([
      ImageUpload.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("uploadedBy", "name email")
        .lean(),
      ImageUpload.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        images,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("❌ Get images error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve images",
      error: error.message,
    });
  }
});

/* ======================
   GET IMAGE BY ID
   GET /api/admin/images/:id
====================== */
router.get("/:id", auth, adminOnly, async (req, res) => {
  try {
    const image = await ImageUpload.findById(req.params.id).populate(
      "uploadedBy",
      "name email"
    );

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Image not found",
      });
    }

    res.status(200).json({
      success: true,
      data: image,
    });
  } catch (error) {
    console.error("❌ Get image error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve image",
      error: error.message,
    });
  }
});

/* ======================
   DELETE IMAGE
   DELETE /api/admin/images/:id
====================== */
router.delete("/:id", auth, adminOnly, async (req, res) => {
  try {
    const image = await ImageUpload.findById(req.params.id);

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Image not found",
      });
    }

    // Delete from both services
    const deleteResult = await deleteImageFromAll(
      image.cloudinary?.publicId,
      image.googleDrive?.fileId
    );

    // Delete from database
    await ImageUpload.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Image deleted successfully",
      data: deleteResult,
    });
  } catch (error) {
    console.error("❌ Delete image error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete image",
      error: error.message,
    });
  }
});

/* ======================
   GET UPLOAD STATISTICS
   GET /api/admin/images/stats
====================== */
router.get("/stats/overview", auth, adminOnly, async (req, res) => {
  try {
    const [total, byCategory, byStatus, recent] = await Promise.all([
      ImageUpload.countDocuments(),
      ImageUpload.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]),
      ImageUpload.aggregate([
        { $group: { _id: "$uploadStatus", count: { $sum: 1 } } },
      ]),
      ImageUpload.find().sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        total,
        byCategory,
        byStatus,
        recent,
      },
    });
  } catch (error) {
    console.error("❌ Get stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve statistics",
      error: error.message,
    });
  }
});

module.exports = router;
