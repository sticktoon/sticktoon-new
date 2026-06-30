const axios = require("axios");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");

let cachedToken = null;
let tokenExpiry = 0;

/**
 * Log in to Shiprocket and retrieve API Token
 */
async function authenticate() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

  let email = process.env.SHIPROCKET_EMAIL;
  let password = process.env.SHIPROCKET_PASSWORD;

  // Strip outer quotes if dotenv/dotenvx did not parse them out
  if (email && email.startsWith('"') && email.endsWith('"')) email = email.slice(1, -1);
  if (password && password.startsWith('"') && password.endsWith('"')) password = password.slice(1, -1);
  if (email && email.startsWith("'") && email.endsWith("'")) email = email.slice(1, -1);
  if (password && password.startsWith("'") && password.endsWith("'")) password = password.slice(1, -1);

  console.log("DEBUG: Shiprocket Auth Details:");
  console.log(`- Email: [${email}]`);
  console.log(`- Password Length: ${password ? password.length : 0}`);
  console.log(`- Password First 5 chars: ${password ? password.substring(0, 5) : "none"}...`);

  if (!email || !password) {
    throw new Error("Shiprocket credentials (SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD) are not set in the environment variables.");
  }

  try {
    const res = await axios.post("https://apiv2.shiprocket.in/v1/external/auth/login", {
      email,
      password,
    });

    if (res.data && res.data.token) {
      cachedToken = res.data.token;
      // Tokens are valid for 24 hours. Cache for 23 hours to be safe.
      tokenExpiry = now + 23 * 60 * 60 * 1000;
      console.log("Successfully authenticated with Shiprocket.");
      return cachedToken;
    } else {
      throw new Error("Auth token not found in Shiprocket response");
    }
  } catch (err) {
    console.error("Shiprocket authentication failed:", err.response?.data || err.message);
    throw new Error(`Shiprocket Auth Error: ${err.response?.data?.message || err.message}`);
  }
}

/**
 * Pushes an order to Shiprocket
 * @param {string} orderId - Mongoose Order ObjectId
 */
async function pushOrderToShiprocket(orderId) {
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    // Verify order is paid/success
    if (order.status !== "SUCCESS") {
      throw new Error(`Order ${orderId} cannot be pushed to Shiprocket because its status is ${order.status}`);
    }

    const token = await authenticate();

    // Fetch user details for email
    const user = await User.findById(order.userId);
    const customerEmail = user?.email || order.userEmail || "customer@sticktoon.shop";

    // Split Name into First and Last name
    const fullName = (order.address?.name || "Customer").trim();
    const nameParts = fullName.split(" ");
    const firstName = nameParts[0] || "Customer";
    const lastName = nameParts.slice(1).join(" ") || "Customer";

    // Map order items and fetch product specifications from DB if available
    const orderItems = [];
    let totalWeight = 0;
    let maxLength = 0;
    let maxWidth = 0;
    let totalHeight = 0;

    for (const item of order.items) {
      let weight = 0.1; // fallback 100g
      let length = 10;  // fallback 10cm
      let width = 10;   // fallback 10cm
      let height = 5;   // fallback 5cm
      let sku = item.badgeId || "custom-item";

      // If it's a real catalog product (valid ObjectId), load details from DB
      const mongoose = require("mongoose");
      if (item.badgeId && mongoose.Types.ObjectId.isValid(item.badgeId)) {
        try {
          const product = await Product.findById(item.badgeId);
          if (product) {
            weight = product.weight || 0.1;
            length = product.length || 10;
            width = product.width || 10;
            height = product.height || 5;
            sku = product.sku || product._id.toString();
          }
        } catch (dbErr) {
          console.warn(`Could not load specifications for product ${item.badgeId}:`, dbErr.message);
        }
      }

      // Calculate total physical dimensions
      totalWeight += weight * item.quantity;
      maxLength = Math.max(maxLength, length);
      maxWidth = Math.max(maxWidth, width);
      totalHeight += height * item.quantity;

      orderItems.push({
        name: item.name || "Sticker/Badge",
        sku: sku,
        units: item.quantity,
        selling_price: item.price,
      });
    }

    // Default box sizes if none computed
    if (maxLength === 0) maxLength = 10;
    if (maxWidth === 0) maxWidth = 10;
    if (totalHeight === 0) totalHeight = 5;

    // If order has already been successfully synced before, append a reship suffix to avoid Shiprocket's duplicate order ID rejection
    let shiprocketOrderIdPayload = order._id.toString();
    if (order.shiprocketStatus === "SUCCESS" || order.shiprocketOrderId) {
      shiprocketOrderIdPayload += `-R${Math.floor(Date.now() / 1000)}`;
    }

    // Shiprocket Order Payload
    const payload = {
      order_id: shiprocketOrderIdPayload,
      order_date: new Date(order.createdAt).toISOString().replace("T", " ").slice(0, 16),
      pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || "Primary",
      billing_customer_name: firstName,
      billing_last_name: lastName,
      billing_address: order.address?.street || "N/A",
      billing_city: order.address?.city || "N/A",
      billing_pincode: order.address?.pincode || "",
      billing_state: order.address?.state || "N/A",
      billing_country: order.address?.country || "India",
      billing_email: customerEmail,
      billing_phone: order.address?.phone || "",
      shipping_is_billing: true,
      order_items: orderItems,
      payment_method: "Prepaid",
      sub_total: order.amount,
      length: maxLength,
      breadth: maxWidth,
      height: totalHeight,
      weight: parseFloat(totalWeight.toFixed(2)),
    };

    console.log(`Pushing order ${order._id} to Shiprocket...`);

    const res = await axios.post("https://apiv2.shiprocket.in/v1/external/orders/create/adhoc", payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (res.data && res.data.order_id) {
      order.shiprocketOrderId = String(res.data.order_id);
      order.shiprocketShipmentId = String(res.data.shipment_id || "");
      order.shiprocketStatus = "SUCCESS";
      order.shiprocketErrorMessage = null;
      await order.save();
      console.log(`Successfully synced order ${order._id} with Shiprocket! Order ID: ${res.data.order_id}`);
      return { success: true, shiprocketOrderId: res.data.order_id };
    } else {
      throw new Error(JSON.stringify(res.data || "Unknown response structure"));
    }
  } catch (err) {
    const responseData = err.response?.data;
    let errorMsg = responseData?.message || responseData?.error || err.message;
    if (responseData?.errors) {
      errorMsg += " | Details: " + JSON.stringify(responseData.errors);
    }
    console.error(`Failed to push order ${orderId} to Shiprocket:`, errorMsg);
    
    // Save the failure status to database
    try {
      await Order.findByIdAndUpdate(orderId, {
        shiprocketStatus: "FAILED",
        shiprocketErrorMessage: errorMsg,
      });
    } catch (dbErr) {
      console.error("Failed to update Shiprocket error state in DB:", dbErr.message);
    }

    return { success: false, error: errorMsg };
  }
}

module.exports = {
  authenticate,
  pushOrderToShiprocket,
};
