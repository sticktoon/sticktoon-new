const express = require("express");
const router = express.Router();
const Order = require("../models/Order");

const auth = require("../middleware/auth");
const { adminOnly } = require("../middleware/roleMiddleware");

/* =========================
   GET ALL ORDERS (ADMIN)
========================= */
router.get("/", auth, adminOnly, async (req, res) => {
  try {
    const { status, all, days, from, to } = req.query;
    const query = {};

    if (status) query.status = status;

    // Date window: default to the last 30 days so the list loads fast.
    // Older orders are fetched on demand via ?all=true, ?days=N, or ?from/&to.
    if (all === "true") {
      // No date constraint — return the full history.
    } else if (from || to) {
      const createdAt = {};
      const fromDate = from ? new Date(from) : null;
      const toDate = to ? new Date(to) : null;
      if (fromDate && !isNaN(fromDate.getTime())) createdAt.$gte = fromDate;
      if (toDate && !isNaN(toDate.getTime())) createdAt.$lte = toDate;
      if (Object.keys(createdAt).length) query.createdAt = createdAt;
    } else {
      const dayCount = Math.max(1, parseInt(days, 10) || 30);
      const since = new Date();
      since.setDate(since.getDate() - dayCount);
      query.createdAt = { $gte: since };
    }

    const orders = await Order.find(query)
      .populate("userId", "email name")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    console.error("Admin orders error:", err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

/* =========================
   UPDATE ORDER STATUS
========================= */
router.patch("/:id/status", auth, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    
    // Must match the Order model enum to avoid persisting invalid statuses.
    const validStatuses = ["PENDING", "SUCCESS", "FAILED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate("userId", "email name");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ message: "Order status updated", order });
  } catch (err) {
    console.error("Update order error:", err);
    res.status(500).json({ message: "Failed to update order" });
  }
});

/* =========================
   UPDATE ORDER DELIVERY STATUS
========================= */
router.patch("/:id/delivery", auth, adminOnly, async (req, res) => {
  try {
    const { isDelivered } = req.body;

    if (typeof isDelivered !== "boolean") {
      return res
        .status(400)
        .json({ message: "isDelivered must be a boolean" });
    }

    const updatePayload = {
      isDelivered,
      deliveredAt: isDelivered ? new Date() : null,
    };

    const order = await Order.findByIdAndUpdate(req.params.id, updatePayload, {
      new: true,
    }).populate("userId", "email name");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ message: "Order delivery status updated", order });
  } catch (err) {
    console.error("Update order delivery error:", err);
    res.status(500).json({ message: "Failed to update delivery status" });
  }
});

/* =========================
   DELETE ORDER
========================= */
router.delete("/:id", auth, adminOnly, async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ message: "Order deleted successfully" });
  } catch (err) {
    console.error("Delete order error:", err);
    res.status(500).json({ message: "Failed to delete order" });
  }
});

/* =========================
   PUSH ORDER TO SHIPROCKET (ADMIN)
========================= */
router.post("/:id/shiprocket-push", auth, adminOnly, async (req, res) => {
  try {
    const { pushOrderToShiprocket } = require("../services/shiprocketService");
    const result = await pushOrderToShiprocket(req.params.id);

    if (result.success) {
      const updatedOrder = await Order.findById(req.params.id).populate("userId", "email name");
      return res.json({ message: "Successfully synced with Shiprocket", order: updatedOrder });
    } else {
      return res.status(400).json({ message: `Shiprocket Sync Failed: ${result.error}` });
    }
  } catch (err) {
    console.error("Manual Shiprocket push error:", err);
    res.status(500).json({ message: "Failed to push order to Shiprocket" });
  }
});

module.exports = router;