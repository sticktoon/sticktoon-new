const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const router = express.Router();

const auth = require("../middleware/auth");
const handleValidationError = require("../utils/handleValidationError");
const { adminOnly, superAdminOnly } = require("../middleware/roleMiddleware");

/* 👥 GET ALL USERS */
router.get("/", auth, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

/* 👑 CREATE NEW ADMIN (SUPER ADMIN ONLY) */
router.post("/create-admin", auth, superAdminOnly, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: cleanEmail });

    if (existingUser) {
      if (existingUser.role === "admin" || existingUser.role === "superadmin") {
        return res.status(400).json({ message: "An admin with this email already exists" });
      }

      // Promote existing user to admin
      existingUser.role = "admin";
      if (name?.trim()) existingUser.name = name.trim();
      const updated = await existingUser.save();
      const result = updated.toObject();
      delete result.password;
      return res.json({ message: "Existing user promoted to Admin", user: result });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await User.create({
      name: name?.trim() || cleanEmail.split("@")[0],
      email: cleanEmail,
      password: hashedPassword,
      role: "admin",
      provider: "credentials",
    });

    const result = newAdmin.toObject();
    delete result.password;
    res.status(201).json({ message: "Admin account created successfully", user: result });
  } catch (err) {
    if (handleValidationError(res, err)) return;
    console.error("Create admin error:", err);
    res.status(500).json({ message: "Failed to create admin user" });
  }
});

/* 👑 UPDATE USER ROLE (SUPER ADMIN ONLY) */
router.patch("/:id/role", auth, superAdminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    const allowedRoles = ["user", "admin", "influencer", "superadmin"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role specified" });
    }

    // Prevent demoting self if user matches current superadmin
    if (req.user.id === req.params.id && role !== "superadmin") {
      return res.status(400).json({ message: "You cannot demote your own Super Admin account" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: `User role updated to ${role}`, user });
  } catch (err) {
    console.error("Update role error:", err);
    res.status(500).json({ message: "Failed to update user role" });
  }
});

/* 👑 PROMOTE USER TO ADMIN (SUPER ADMIN ONLY) */
router.patch("/:id/promote", auth, superAdminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: "admin" },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User promoted to Admin", user });
  } catch (err) {
    console.error("Promote user error:", err);
    res.status(500).json({ message: "Failed to promote user" });
  }
});

/* 👑 DEMOTE ADMIN TO USER (SUPER ADMIN ONLY) */
router.patch("/:id/demote", auth, superAdminOnly, async (req, res) => {
  try {
    if (req.user.id === req.params.id) {
      return res.status(400).json({ message: "You cannot demote your own account" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: "user" },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Admin privileges removed (demoted to user)", user });
  } catch (err) {
    console.error("Demote user error:", err);
    res.status(500).json({ message: "Failed to demote admin user" });
  }
});

/* ❌ DELETE USER */
router.delete("/:id", auth, adminOnly, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Protect superadmin from being deleted by non-superadmin
    if (targetUser.role === "superadmin" && req.user.id !== targetUser._id.toString()) {
      return res.status(403).json({ message: "Super admin accounts cannot be deleted" });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

module.exports = router;
