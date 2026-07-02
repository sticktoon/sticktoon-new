const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");
require("dotenv").config();

// Update super admin password
const updatePassword = async () => {
  try {
    const User = require("../models/User");
    const SUPER_ADMIN_EMAILS = (process.env.DEV_EMAIL || process.env.SUPER_ADMIN_EMAILS || process.env.SUPER_ADMIN_EMAIL || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    const SUPER_ADMIN_EMAIL = SUPER_ADMIN_EMAILS[0];
    const NEW_PASSWORD = process.env.SUPER_ADMIN_NEW_PASSWORD || "gullyboy12345";

    if (!SUPER_ADMIN_EMAIL) {
      console.log("❌ No super admin email configured in DEV_EMAIL, SUPER_ADMIN_EMAILS, or SUPER_ADMIN_EMAIL");
      process.exit(1);
    }

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
