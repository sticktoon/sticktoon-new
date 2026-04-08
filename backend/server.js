const express = require("express");
const cors = require("cors");
const compression = require("compression");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const connectDB = require("./config/db");
const { initializeFileWatcher } = require("./services/fileWatcher");
const { uploadImageToAll } = require("./utils/imageUploadService");
const ImageUpload = require("./models/ImageUpload");

dotenv.config();

const app = express();

/* Middleware */
app.use(compression()); // Gzip all responses
app.use(
  cors({
    origin: [
      
      "https://sticktoon-web.vercel.app",
      "https://www.sticktoon.shop",
      "https://sticktoon.shop",
      "http://localhost:3000",
      "https://sticktoon-website.onrender.com",
      "https://localhost:5000",
      /\.vercel\.app$/  // allows all vercel preview URLs
    ],
    credentials: true,
  })
);


// Increase JSON body size limit for avatar upload (base64 images)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

/* Database */
connectDB();

/* Routes */
app.use("/api/auth", require("./routes/auth"));
app.use("/api/payment", require("./routes/payment"));
app.use("/api/razorpay", require("./routes/razorpayPayment"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/admin/orders", require("./routes/adminOrders"));
app.use("/api/admin/revenue", require("./routes/adminRevenue"));
app.use("/api/invoice", require("./routes/invoice"));
app.use("/api/admin/invoice", require("./routes/adminInvoice"));
app.use("/api/promo", require("./routes/promo"));
app.use("/api/admin/promo", require("./routes/adminPromo"));
app.use("/api/admin/influencer", require("./routes/adminInfluencer"));
app.use("/api/admin/influencer-manage", require("./routes/adminInfluencerManage"));
app.use("/api/products", require("./routes/adminProducts"));
app.use("/api/influencer", require("./routes/influencer"));
app.use("/api/cart", require("./routes/cart"));
app.use("/api/user-orders", require("./routes/userOrders"));
app.use("/api/badge-doc", require("./routes/badgeDoc"));
app.use("/api/admin/images", require("./routes/adminImages"));
app.use("/api/admin/leads", require("./routes/adminLeads"));
app.use("/api/admin/tasks", require("./routes/adminTasks"));
app.use("/api/admin/support", require("./routes/adminSupport"));
app.use("/api/contact", require("./routes/contact"));

/* Startup: Catch-up upload for offline-added images */
async function scanAndUploadOfflineImages() {
  try {
    const categories = ["badge", "images", "sticker"];
    const publicPath = path.join(__dirname, "../public");
    let uploadedCount = 0;

    for (const category of categories) {
      const dirPath = path.join(publicPath, category);
      if (!fs.existsSync(dirPath)) continue;

      const files = fs.readdirSync(dirPath).filter((f) => {
        const ext = path.extname(f).toLowerCase();
        return [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext);
      });

      for (const fileName of files) {
        const existing = await ImageUpload.findOne({ fileName, category }).lean();
        if (existing) continue;

        const filePath = path.join(dirPath, fileName);
        console.log(`🔄 Startup scan: uploading ${fileName} from ${category}`);

        try {
          const result = await uploadImageToAll(filePath, category, fileName, {
            uploadMethod: "startup-scan",
            uploadedBy: null,
          });

          await new ImageUpload({
            fileName: result.fileName,
            category: result.category,
            uploadMethod: "startup-scan",
            uploadStatus: result.uploadStatus,
            cloudinary: result.cloudinary,
            googleDrive: result.googleDrive,
            errors: result.errors,
          }).save();

          uploadedCount++;
          console.log(`✅ Startup upload: ${fileName}`);

          await new Promise((r) => setTimeout(r, 500));
        } catch (error) {
          console.error(`❌ Startup upload failed for ${fileName}:`, error.message);
        }
      }
    }

    if (uploadedCount > 0) {
      console.log(`\n📊 Startup scan completed: ${uploadedCount} image(s) uploaded\n`);
    }
  } catch (error) {
    console.error("❌ Startup scan error:", error.message);
  }
}

/* Server */
const DEFAULT_PORT = 5000;
const FALLBACK_PORTS = [5001, 5002, 5003, 5004, 5005];
const PORT = process.env.PORT || DEFAULT_PORT;

const startServer = (port) => {
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`🚀 Backend running on port ${port}`);

    // Initialize file watcher for automatic image uploads
    const publicPath = path.join(__dirname, "../public");
    initializeFileWatcher(publicPath);

    // Scan and upload any images added while backend was offline
    scanAndUploadOfflineImages();
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.log(`⚠️  Port ${port} is already in use. Trying next port...`);
      if (FALLBACK_PORTS.length > 0) {
        const nextPort = FALLBACK_PORTS.shift();
        startServer(nextPort);
      } else {
        console.error("❌ All ports are in use. Please free up a port and try again.");
        process.exit(1);
      }
    } else {
      console.error("Server error:", error);
      process.exit(1);
    }
  });
};


// Health Check for UptimeRobot / Monitoring
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// ⚡ SELF-PING: Pings itself every 14 mins to stay awake on Render
if (process.env.RENDER || process.env.NODE_ENV === "production") {
  const https = require("https");
  const SELF_PING_URL = "https://sticktoon-website.onrender.com/api/health";
  
  setInterval(() => {
    https.get(SELF_PING_URL, (res) => {
      console.log(`[Self-Ping] Status: ${res.statusCode} at ${new Date().toISOString()}`);
    }).on("error", (err) => {
      console.error("[Self-Ping] Error:", err.message);
    });
  }, 10 * 60 * 1000); // 10 Minutes
}

// Friendly root route
app.get("/", (req, res) => {
  res.send("StickToon API is running 🚀");
});

startServer(PORT);

// app.get("/", (req, res) => {
//   res.send("StickToon API is running 🚀");
// });
