const mongoose = require("mongoose");
const Order = require("../models/Order");
const User = require("../models/User");
const UserOrders = require("../models/User_Orders");
require("../models/Invoice");

/**
 * Helper to get all user ObjectIds associated with an authenticated user
 * (handles linked accounts or duplicate email records).
 *
 * @param {string} userId - Authenticated user ID
 * @returns {Promise<{ currentUser: Object|null, userIds: Array<mongoose.Types.ObjectId> }>}
 */
async function getLinkedUserIds(userId) {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return { currentUser: null, userIds: [] };
  }

  const currentUser = await User.findById(userId).lean();
  if (!currentUser) {
    return { currentUser: null, userIds: [] };
  }

  const linkedUsers = await User.find({ email: currentUser.email }).select("_id").lean();
  const userIds = linkedUsers.map((u) => u._id);
  return { currentUser, userIds };
}

/**
 * Format a database order document into a clean, safe customer-facing representation.
 * Internal admin fields, raw payment secrets, and backend error logs are strictly excluded.
 *
 * @param {Object} order - Raw or populated Mongoose Order document
 * @returns {Object} Safe customer order summary
 */
function formatCustomerOrder(order) {
  if (!order) return null;

  const plain = typeof order.toObject === "function" ? order.toObject() : order;
  const orderId = String(plain._id);
  const orderNumber = orderId.slice(-8).toUpperCase();

  // Determine customer-friendly order status
  let status = "confirmed";
  if (plain.isDelivered) {
    status = "delivered";
  } else if (plain.shiprocketStatus === "SUCCESS") {
    status = "shipped";
  } else if (plain.status === "FAILED") {
    status = "cancelled";
  } else if (plain.status === "PENDING") {
    status = "pending";
  } else if (plain.status === "SUCCESS") {
    status = "confirmed";
  }

  // Safe tracking info if present in DB
  const trackingNumber = plain.shiprocketShipmentId || plain.shiprocketOrderId || null;
  const courier = plain.shiprocketStatus === "SUCCESS" ? "Shiprocket" : null;

  // Safe items mapping
  const items = (plain.items || []).map((item) => ({
    name: item.name || item.title || "Sticker / Badge",
    quantity: typeof item.quantity === "number" ? item.quantity : 1,
    price: typeof item.price === "number" ? item.price : 0,
    badgeStyle: item.badgeStyle || "pin",
    image: item.image && !item.image.startsWith("data:") ? item.image : null,
  }));

  const itemCount = items.reduce((acc, curr) => acc + curr.quantity, 0);

  return {
    orderId,
    orderNumber,
    invoiceNumber: plain.invoiceId?.invoiceNumber || null,
    status,
    rawStatus: plain.status,
    isDelivered: Boolean(plain.isDelivered),
    deliveredAt: plain.deliveredAt ? new Date(plain.deliveredAt).toISOString() : null,
    totalAmount: typeof plain.amount === "number" ? plain.amount : plain.subtotal || 0,
    currency: plain.currency || "INR",
    createdAt: plain.createdAt ? new Date(plain.createdAt).toISOString() : null,
    itemCount,
    items,
    trackingNumber,
    courier,
    trackingUrl: null, // Only real verified URLs; StickToon does not construct fake courier URLs
    estimatedDelivery: null, // Project schema does not store estimatedDelivery date
  };
}

/**
 * Retrieve recent orders belonging to the authenticated customer.
 *
 * @param {Object} params
 * @param {string} params.userId - Authenticated user ID from req.user
 * @param {number} [params.limit=5] - Maximum orders to return
 * @returns {Promise<{ success: boolean, orders?: Array<Object>, error?: string, message?: string }>}
 */
async function getMyOrders({ userId, limit = 5 }) {
  if (!userId) {
    return {
      success: false,
      error: "AUTH_REQUIRED",
      message: "Please log in to view your orders.",
    };
  }

  const { currentUser, userIds } = await getLinkedUserIds(userId);
  if (!currentUser) {
    return {
      success: false,
      error: "AUTH_REQUIRED",
      message: "Please log in to view your orders.",
    };
  }

  // 1. Fetch orders directly linked by userId or email
  const directOrders = await Order.find({
    $or: [{ userId: { $in: userIds } }, { userEmail: currentUser.email }],
    status: { $in: ["SUCCESS", "PENDING", "FAILED"] },
  })
    .populate({ path: "invoiceId", select: "invoiceNumber" })
    .sort({ createdAt: -1 })
    .lean();

  // 2. Fetch mapped orders from UserOrders collection
  const userOrderMappings = await UserOrders.find({ userId: { $in: userIds } })
    .populate({
      path: "orderId",
      populate: { path: "invoiceId", select: "invoiceNumber" },
    })
    .lean();

  // Combine and deduplicate
  const allOrdersMap = new Map();
  userOrderMappings.forEach((m) => {
    if (m.orderId && m.orderId._id) {
      allOrdersMap.set(m.orderId._id.toString(), m.orderId);
    }
  });

  directOrders.forEach((o) => {
    if (o && o._id) {
      allOrdersMap.set(o._id.toString(), o);
    }
  });

  const sortedRaw = Array.from(allOrdersMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const formattedOrders = sortedRaw
    .slice(0, Math.min(Math.max(1, limit || 5), 10))
    .map(formatCustomerOrder)
    .filter(Boolean);

  if (formattedOrders.length === 0) {
    return {
      success: true,
      orders: [],
      message: "I couldn't find any orders in your account.",
    };
  }

  return {
    success: true,
    orders: formattedOrders,
  };
}

/**
 * Retrieve order details for a specific order belonging to the authenticated customer.
 * Strictly verifies ownership.
 *
 * @param {Object} params
 * @param {string} params.userId - Authenticated user ID from req.user
 * @param {string} params.orderId - Provided Order ID (full or suffix)
 * @returns {Promise<{ success: boolean, order?: Object, error?: string, message?: string }>}
 */
async function getOrderDetails({ userId, orderId }) {
  if (!userId) {
    return {
      success: false,
      error: "AUTH_REQUIRED",
      message: "Please log in to view your orders.",
    };
  }

  if (!orderId || typeof orderId !== "string" || !orderId.trim()) {
    return {
      success: false,
      error: "INVALID_ORDER_ID",
      message: "Please provide a valid order ID.",
    };
  }

  const { currentUser, userIds } = await getLinkedUserIds(userId);
  if (!currentUser) {
    return {
      success: false,
      error: "AUTH_REQUIRED",
      message: "Please log in to view your orders.",
    };
  }

  const cleanQueryId = orderId.trim().replace(/^#/, "");

  // Build query to find the order strictly within the user's scope
  const userScopeFilter = {
    $or: [{ userId: { $in: userIds } }, { userEmail: currentUser.email }],
  };

  let targetOrder = null;

  // 1. Direct search by full ObjectId if valid
  if (mongoose.Types.ObjectId.isValid(cleanQueryId)) {
    targetOrder = await Order.findOne({
      _id: cleanQueryId,
      ...userScopeFilter,
    })
      .populate({ path: "invoiceId", select: "invoiceNumber" })
      .lean();
  }

  // 2. Search by gatewayOrderId
  if (!targetOrder) {
    targetOrder = await Order.findOne({
      gatewayOrderId: cleanQueryId,
      ...userScopeFilter,
    })
      .populate({ path: "invoiceId", select: "invoiceNumber" })
      .lean();
  }

  // 3. Search in all user orders by suffix match (e.g. user provided last 8 characters)
  if (!targetOrder) {
    const allUserOrders = await Order.find(userScopeFilter)
      .populate({ path: "invoiceId", select: "invoiceNumber" })
      .lean();

    targetOrder = allUserOrders.find((ord) => {
      const idStr = ord._id.toString();
      return (
        idStr === cleanQueryId ||
        idStr.toLowerCase().endsWith(cleanQueryId.toLowerCase()) ||
        (ord.invoiceId?.invoiceNumber &&
          ord.invoiceId.invoiceNumber.toLowerCase().includes(cleanQueryId.toLowerCase()))
      );
    });
  }

  // 4. Also check UserOrders mapping collection
  if (!targetOrder) {
    const mappings = await UserOrders.find({ userId: { $in: userIds } })
      .populate({
        path: "orderId",
        populate: { path: "invoiceId", select: "invoiceNumber" },
      })
      .lean();

    for (const m of mappings) {
      if (!m.orderId) continue;
      const idStr = m.orderId._id ? m.orderId._id.toString() : "";
      if (
        idStr === cleanQueryId ||
        idStr.toLowerCase().endsWith(cleanQueryId.toLowerCase())
      ) {
        targetOrder = m.orderId;
        break;
      }
    }
  }

  // If order does not exist or does not belong to the user, return generic message without leaking information
  if (!targetOrder) {
    return {
      success: false,
      error: "ORDER_NOT_FOUND",
      message: "I couldn't find that order in your account.",
    };
  }

  return {
    success: true,
    order: formatCustomerOrder(targetOrder),
  };
}

/**
 * Retrieve the status of a specific order belonging to the authenticated customer.
 *
 * @param {Object} params
 * @param {string} params.userId - Authenticated user ID from req.user
 * @param {string} params.orderId - Provided Order ID
 * @returns {Promise<{ success: boolean, order?: Object, error?: string, message?: string }>}
 */
async function getOrderStatus({ userId, orderId }) {
  return getOrderDetails({ userId, orderId });
}

module.exports = {
  getMyOrders,
  getOrderDetails,
  getOrderStatus,
  formatCustomerOrder,
};
