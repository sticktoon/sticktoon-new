const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();

const app = express();

/* Middleware */
app.use(
  cors({
    origin: [
      
      "https://stick-toon.vercel.app",
      "https://sticktoon.vercel.app",
      "https://sticktoon-web.vercel.app",
      "https://www.sticktoon.shop",
      "https://sticktoon.shop",
      "http://localhost:3000",
      "https://sticktoon-website.onrender.com",
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
app.use("/api/cashfree", require("./routes/cashfreeWebhook"));
app.use("/api/admin/revenue", require("./routes/adminRevenue"));
app.use("/api/invoice", require("./routes/invoice"));
app.use("/api/admin/invoice", require("./routes/adminInvoice"));
app.use("/api/promo", require("./routes/promo"));
app.use("/api/admin/promo", require("./routes/adminPromo"));
app.use("/api/admin/influencer", require("./routes/adminInfluencer"));
app.use("/api/admin/influencer-manage", require("./routes/adminInfluencerManage"));
app.use("/api/influencer", require("./routes/influencer"));
app.use("/api/cart", require("./routes/cart"));

/* Server */
const DEFAULT_PORT = 5000;
const FALLBACK_PORTS = [5001, 5002, 5003, 5004, 5005];
const PORT = process.env.PORT || DEFAULT_PORT;

const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`🚀 Backend running on port ${port}`);
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


// Friendly root route
app.get("/", (req, res) => {
  res.send("StickToon API is running 🚀");
});

startServer(PORT);

// app.get("/", (req, res) => {
//   res.send("StickToon API is running 🚀");
// });
