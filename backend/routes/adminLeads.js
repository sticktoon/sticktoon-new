const express = require("express");
const router = express.Router();
const Lead = require("../models/Lead");
const auth = require("../middleware/auth");

/* ===============================
   GET ALL LEADS (Admin Only)
================================ */
router.get("/", auth, async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.json(leads);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch leads" });
  }
});

/* ===============================
   CREATE LEAD
================================ */
router.post("/", async (req, res) => {
  try {
    const { firstName, lastName, company, email, phone, status } = req.body;

    const newLead = new Lead({
      firstName,
      lastName,
      company,
      email,
      phone,
      status: status || "New",
    });

    await newLead.save();

    res.status(201).json(newLead);
  } catch (err) {
    console.error("Create lead error:", err);
    res.status(500).json({ message: "Failed to create lead" });
  }
});



/* ===============================
   UPDATE STATUS
================================ */
router.patch("/:id/status", auth, async (req, res) => {
  try {
    const { status } = req.body;

    const updated = await Lead.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update status" });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    await Lead.findByIdAndDelete(req.params.id);
    res.json({ message: "Lead deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete lead" });
  }
});


module.exports = router;
