require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const seedAdminUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: "admin@sticktoon.com" });
    if (existingAdmin) {
      console.log("⚠️  Admin user already exists:", existingAdmin.email);
      await mongoose.connection.close();
      process.exit(0);
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash("Admin@123", 10);
    
    const adminUser = await User.create({
      name: "StickToon Admin",
      email: "admin@sticktoon.com",
      password: hashedPassword,
      role: "admin",
      provider: "credentials",
    });

    console.log("✅ Admin user created successfully!");
    console.log(`
📧 Email: admin@sticktoon.com
🔐 Password: Admin@123

⚠️  IMPORTANT: Change this password immediately after first login!
    `);

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding admin user:", err.message);
    process.exit(1);
  }
};

seedAdminUser();
