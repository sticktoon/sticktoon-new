const UserOrders = require("../models/User_Orders");

exports.getUserOrdersGrouped = async (req, res) => {
  try {
    const rows = await UserOrders.find()
      .populate("userId", "email")
      .populate("orderId", "amount createdAt")
      .populate("invoiceId", "invoiceNumber");

    const grouped = {};

    rows.forEach((row) => {
      // Skip rows with missing data
      if (!row.userId || !row.orderId) return;
      
      const userId = row.userId._id.toString();

      if (!grouped[userId]) {
        grouped[userId] = {
          user: row.userId,
          orders: [],
        };
      }

      grouped[userId].orders.push({
        orderId: row.orderId._id,
        amount: row.orderId.amount,
        invoiceId: row.invoiceId || null,
        createdAt: row.orderId.createdAt,
      });
    });

    res.json(Object.values(grouped));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch user orders" });
  }
};
