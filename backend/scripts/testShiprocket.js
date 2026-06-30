require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { authenticate, pushOrderToShiprocket } = require("../services/shiprocketService");

async function main() {
  console.log("🔍 Initializing Shiprocket integration check...");
  
  // 1. Check Env Vars
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;
  const pickup = process.env.SHIPROCKET_PICKUP_LOCATION;

  console.log("Environment Variables:");
  console.log(`- SHIPROCKET_EMAIL: ${email ? "SET" : "NOT SET"}`);
  console.log(`- SHIPROCKET_PASSWORD: ${password ? "SET" : "NOT SET"}`);
  console.log(`- SHIPROCKET_PICKUP_LOCATION: ${pickup || "Primary (Default)"}`);

  if (!email || !password) {
    console.error("❌ Aborting: Please add SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD to backend/.env");
    process.exit(1);
  }

  // 2. Try Auth
  try {
    console.log("\n🔑 Testing authentication with Shiprocket API...");
    const token = await authenticate();
    console.log("✅ Shiprocket Auth Success! Token obtained.");
  } catch (err) {
    console.error("❌ Shiprocket Auth Failed:", err.message);
    process.exit(1);
  }

  // 3. Connect DB
  console.log("\n📦 Connecting to Database to check order mapping...");
  await connectDB();

  try {
    // Fetch a SUCCESS paid order
    const order = await Order.findOne({ status: "SUCCESS" });
    if (!order) {
      console.log("ℹ️ No paid (SUCCESS) order found in DB. Creating a mock paid order for verification...");
      
      // Look for a user to assign the mock order to
      const User = require("../models/User");
      const testUser = await User.findOne({});
      if (!testUser) {
        throw new Error("Cannot create mock order: no User records found in database.");
      }

      const mockOrder = await Order.create({
        userId: testUser._id,
        items: [{
          name: "Mock Shonen Sticker Set",
          price: 199,
          quantity: 2,
          badgeId: "mock-custom-item"
        }],
        subtotal: 398,
        deliveryCharges: 99,
        discount: 0,
        amount: 497,
        status: "SUCCESS",
        address: {
          name: "John Doe",
          street: "123 Galleria Apts, Sector 49",
          city: "Gurugram",
          state: "Haryana",
          pincode: "122018",
          phone: "9999999999",
          country: "India"
        }
      });
      console.log(`✅ Mock order created: ID ${mockOrder._id}`);
      
      console.log("\n📤 Testing pushing mock order to Shiprocket (Sandbox/Production)...");
      const syncResult = await pushOrderToShiprocket(mockOrder._id);
      if (syncResult.success) {
        console.log("🎉 Sync successful! Order pushed.");
      } else {
        console.log("❌ Sync failed as expected or due to configuration:", syncResult.error);
      }

      // Cleanup
      await Order.findByIdAndDelete(mockOrder._id);
      console.log("🧹 Cleaned up mock order.");
    } else {
      console.log(`✅ Found paid order ${order._id}. Mapping fields:`);
      console.log(`- Customer: ${order.address?.name || "N/A"}`);
      console.log(`- Address: ${order.address?.street}, ${order.address?.city}, ${order.address?.state} - ${order.address?.pincode}`);
      console.log(`- Items Count: ${order.items?.length || 0}`);
      
      console.log("\n📤 Testing pushing actual order to Shiprocket...");
      const syncResult = await pushOrderToShiprocket(order._id);
      if (syncResult.success) {
        console.log("🎉 Sync successful! Order details synced.");
      } else {
        console.log("❌ Sync failed:", syncResult.error);
      }
    }
  } catch (err) {
    console.error("❌ Test Script Error:", err.message);
  } finally {
    mongoose.connection.close();
    console.log("\n🔌 DB Connection closed. Integration check complete.");
  }
}

main();
