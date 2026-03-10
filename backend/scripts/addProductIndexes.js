const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Product = require("../models/Product");

dotenv.config();

const addIndexes = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Create indexes
    console.log("⏳ Creating indexes for Product collection...");
    await Product.collection.createIndex({ category: 1, isActive: 1 });
    await Product.collection.createIndex({ isActive: 1 });
    await Product.collection.createIndex({ createdAt: -1 });
    
    console.log("✅ Indexes created successfully!");
    console.log("📊 Existing indexes:");
    const indexes = await Product.collection.getIndexes();
    console.log(indexes);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating indexes:", error);
    process.exit(1);
  }
};

addIndexes();
