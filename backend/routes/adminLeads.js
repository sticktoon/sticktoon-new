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
    const { firstName, lastName, company, email, phone, status, leadSource, expectedAmount } = req.body;

    const newLead = new Lead({
      firstName,
      lastName,
      company,
      email,
      phone,
      expectedAmount: Number(expectedAmount || 0),
      leadSource: leadSource || "",
      status: status || "New",
    });

    await newLead.save();

    res.status(201).json(newLead);
  } catch (err) {
    console.error("Create lead error:", err);
    res.status(500).json({ message: "Failed to create lead" });
  }
});

router.patch("/:id", auth, async (req, res) => {
  try {
    const allowedFields = [
      "firstName",
      "lastName",
      "company",
      "email",
      "status",
      "leadSource",
      "expectedAmount",
    ];

    const update = {};
    allowedFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        update[field] =
          field === "expectedAmount"
            ? Number(req.body[field] || 0)
            : req.body[field];
      }
    });

    const updated = await Lead.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update lead" });
  }
});



/* ===============================
   UPDATE STATUS
================================ */
router.patch("/:id/status", auth, async (req, res) => {
  try {
    const { status } = req.body;
    const update = { status };

    if (status === "New" || status === "Lost") {
      update.nextFollowUpAt = null;
    }

    const updated = await Lead.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update status" });
  }
});

router.patch("/:id/follow-up", auth, async (req, res) => {
  try {
    const { nextFollowUpAt } = req.body || {};

    if (!nextFollowUpAt) {
      return res.status(400).json({ message: "Follow-up date is required" });
    }

    const parsed = new Date(nextFollowUpAt);
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({ message: "Invalid follow-up date" });
    }

    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    if (!["Contacted", "Interested"].includes(lead.status || "")) {
      return res
        .status(400)
        .json({ message: "Follow-up date allowed only for Contacted/Interested leads" });
    }

    lead.nextFollowUpAt = parsed;
    await lead.save();

    res.json(lead);
  } catch (err) {
    res.status(500).json({ message: "Failed to update follow-up date" });
  }
});

router.patch("/:id/lead-source", auth, async (req, res) => {
  try {
    const { leadSource } = req.body || {};

    const updated = await Lead.findByIdAndUpdate(
      req.params.id,
      { leadSource: leadSource || "" },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update lead source" });
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
