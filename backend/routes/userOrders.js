const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");
const Order = require("../models/Order");
const UserOrders = require("../models/User_Orders");

/* =========================
   GET USER ORDERS
========================= */
router.get("/my-orders", auth, async (req, res) => {
  try {
    // 1. Get current user's email to find linked accounts
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. Find ALL user ids associated with this email (handles duplicates or legacy records)
    const linkedUsers = await User.find({ email: currentUser.email }).select("_id");
    const userIds = linkedUsers.map(u => u._id);

    // 3. 🔍 Exhaustive query for mapped orders
    const userOrderMappings = await UserOrders.find({ userId: { $in: userIds } })
      .populate({
        path: "orderId",
        populate: { path: "invoiceId", select: "invoiceNumber" }
      });

    // 4. 🔍 Check for orders directly linked by userId (legacy or direct linking)
    const directOrders = await Order.find({ userId: { $in: userIds } })
      .populate({ path: "invoiceId", select: "invoiceNumber" });

    // 5. Combine and De-duplicate
    const allOrdersMap = new Map();
    
    // Add mapped orders
    userOrderMappings.forEach(m => {
      if (m.orderId && m.orderId._id) {
        allOrdersMap.set(m.orderId._id.toString(), m.orderId);
      }
    });

    // Add direct orders (overwriting or adding if not present)
    directOrders.forEach(o => {
      if (o && o._id) {
        allOrdersMap.set(o._id.toString(), o);
      }
    });

    // 6. Convert to array and Sort by createdAt descending
    const sortedOrders = Array.from(allOrdersMap.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(sortedOrders);
  } catch (err) {
    console.error("Fetch user orders error:", err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

module.exports = router;
