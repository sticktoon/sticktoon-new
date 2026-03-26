const express = require("express");
const User = require("../models/User");

const router = express.Router();

const auth = require("../middleware/auth");
const { adminOnly } = require("../middleware/roleMiddleware");

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

/* ❌ DELETE USER */
router.delete("/:id", auth, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "User deleted" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

/* 👑 PROMOTE USER TO ADMIN */
router.patch("/:id/promote", auth, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: "admin" },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Promote user error:", err);
    res.status(500).json({ message: "Failed to promote user" });
  }
});

module.exports = router;
