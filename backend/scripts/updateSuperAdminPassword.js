const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");
require("dotenv").config();

// Update super admin password
const updatePassword = async () => {
  try {
    const User = require("../models/User");
    const SUPER_ADMIN_EMAIL = "sticktoon.xyz@gmail.com";
    const NEW_PASSWORD = "gullyboy12345";

    // Find super admin
    const superAdmin = await User.findOne({ email: SUPER_ADMIN_EMAIL }).select("+password");

    if (!superAdmin) {
      console.log("❌ Super admin not found");
      process.exit(1);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);

    // Update password
    superAdmin.password = hashedPassword;
    await superAdmin.save();

    console.log("✅ Super admin password updated successfully!");
    console.log(`📧 Email: ${SUPER_ADMIN_EMAIL}`);
    console.log(`🔐 New Password: ${NEW_PASSWORD}`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error updating password:", error.message);
    process.exit(1);
  }
};

// Run
(async () => {
  const connectDB = require("../config/db");
  await connectDB();
  await updatePassword();
})();
