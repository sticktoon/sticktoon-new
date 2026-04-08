const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load env
dotenv.config({ path: path.join(__dirname, "backend/.env") });

const User = require("./backend/models/User");
const Order = require("./backend/models/Order");
const UserOrders = require("./backend/models/User_Orders");

async function checkDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to DB");

    const orderCount = await Order.countDocuments();
    const mappingCount = await UserOrders.countDocuments();
    const userCount = await User.countDocuments();

    console.log(`\n📊 Database Stats:`);
    console.log(`- Users: ${userCount}`);
    console.log(`- Total Orders: ${orderCount}`);
    console.log(`- User-Order Mappings: ${mappingCount}`);

    if (mappingCount > 0) {
      console.log(`\n🔍 First 5 Mappings:`);
      const mappings = await UserOrders.find().limit(5).populate("userId").populate("orderId");
      mappings.forEach((m, i) => {
        console.log(`${i+1}. User: ${m.userId?.email || "N/A"} -> Order: ${m.orderId?._id || "N/A"} (${m.orderId?.status || "N/A"})`);
      });
    } else {
      console.log("\n⚠️  No mappings found in User_Orders collection!");
    }

    // Check for an admin user
    const adminUser = await User.findOne({ email: "sticktoon.xyz@gmail.com" });
    if (adminUser) {
      console.log(`\n👤 Admin User Found (ID: ${adminUser._id})`);
      const adminMappings = await UserOrders.find({ userId: adminUser._id }).populate("orderId");
      console.log(`- Mappings for admin: ${adminMappings.length}`);
      adminMappings.forEach((m, i) => {
        console.log(`  ${i+1}. Order: ${m.orderId?._id} [${m.orderId?.status}]`);
      });
    }

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

checkDB();
