const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,        // Maintain up to 10 connections
      minPoolSize: 2,         // Keep at least 2 connections ready
      socketTimeoutMS: 30000, // Close sockets after 30s of inactivity
      serverSelectionTimeoutMS: 5000, // Fail fast if server unreachable
    });
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection failed", err);
    process.exit(1);
  }
};

module.exports = connectDB;
