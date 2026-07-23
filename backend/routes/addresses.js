const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");

const ADDRESS_FIELDS = ["label", "fullName", "phone", "street", "city", "state", "pincode", "country"];
const REQUIRED_FIELDS = ["fullName", "phone", "street", "city", "state", "pincode"];

const sanitizeAddress = (body = {}) => {
  const out = {};
  ADDRESS_FIELDS.forEach((f) => {
    if (body[f] !== undefined && body[f] !== null) out[f] = String(body[f]).trim();
  });
  if (!out.country) out.country = "India";
  return out;
};

const missingRequired = (addr) => REQUIRED_FIELDS.filter((f) => !addr[f]);

// Guarantees exactly one default. With a preferredId, that address wins and all
// others are cleared. Without one, keep the first already-flagged default, else
// fall back to the first address.
const enforceSingleDefault = (addresses, preferredId) => {
  if (addresses.length === 0) return;

  if (preferredId) {
    let found = false;
    addresses.forEach((a) => {
      const isPref = String(a._id) === String(preferredId);
      a.isDefault = isPref;
      if (isPref) found = true;
    });
    if (!found) addresses[0].isDefault = true;
    return;
  }

  let hasDefault = false;
  addresses.forEach((a) => {
    if (a.isDefault) {
      if (hasDefault) a.isDefault = false;
      else hasDefault = true;
    }
  });
  if (!hasDefault) addresses[0].isDefault = true;
};

// LIST
router.get("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("addresses");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ addresses: user.addresses || [] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADD
router.post("/", auth, async (req, res) => {
  try {
    const addr = sanitizeAddress(req.body);
    const missing = missingRequired(addr);
    if (missing.length) {
      return res.status(400).json({ message: `Missing required fields: ${missing.join(", ")}` });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // First address becomes default automatically.
    addr.isDefault = Boolean(req.body.isDefault) || user.addresses.length === 0;
    user.addresses.push(addr);
    const newId = user.addresses[user.addresses.length - 1]._id;
    enforceSingleDefault(user.addresses, addr.isDefault ? newId : null);
    await user.save();

    res.status(201).json({ addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE
router.put("/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const target = user.addresses.id(req.params.id);
    if (!target) return res.status(404).json({ message: "Address not found" });

    const addr = sanitizeAddress(req.body);
    ADDRESS_FIELDS.forEach((f) => {
      if (addr[f] !== undefined) target[f] = addr[f];
    });
    if (req.body.isDefault === true) target.isDefault = true;

    enforceSingleDefault(user.addresses, req.body.isDefault === true ? target._id : null);
    await user.save();

    res.json({ addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// SET DEFAULT
router.patch("/:id/default", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.addresses.id(req.params.id)) {
      return res.status(404).json({ message: "Address not found" });
    }
    enforceSingleDefault(user.addresses, req.params.id);
    await user.save();
    res.json({ addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE
router.delete("/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const target = user.addresses.id(req.params.id);
    if (!target) return res.status(404).json({ message: "Address not found" });

    const wasDefault = target.isDefault;
    target.deleteOne();
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }
    await user.save();

    res.json({ addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
