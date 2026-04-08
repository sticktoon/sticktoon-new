const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load env
dotenv.config();

async function checkDB() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from .env");
    }

    console.log("🔗 Connecting to MongoDB Atlas...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to DB");

    // Define minimal schemas for diagnostics
    // We check if models are already compiled by mongoose to avoid OverwriteModelError
    const User = mongoose.models.User || mongoose.model("User", new mongoose.Schema({ email: String, name: String, role: String }));
    const Order = mongoose.models.Order || mongoose.model("Order", new mongoose.Schema({ userId: mongoose.Schema.Types.ObjectId, status: String, amount: Number, createdAt: Date }));
    const UserOrders = mongoose.models.User_Orders || mongoose.model("User_Orders", new mongoose.Schema({ userId: mongoose.Schema.Types.ObjectId, orderId: mongoose.Schema.Types.ObjectId }));

    const stats = {
      users: await User.countDocuments(),
      orders: await Order.countDocuments(),
      mappings: await UserOrders.countDocuments()
    };

    console.log(`\n📊 Database Stats:`, stats);

    const adminEmail = "sticktoon.xyz@gmail.com";
    const user = await User.findOne({ email: adminEmail });

    if (!user) {
      console.log(`\n⚠️  User ${adminEmail} not found.`);
      process.exit(0);
    }

    console.log(`\n👤 User Found: ${user.email} (ID: ${user._id})`);

    // 1. Check mappings in User_Orders
    const mappings = await UserOrders.find({ userId: user._id });
    console.log(`- Mappings in User_Orders: ${mappings.length}`);
    
    if (mappings.length > 0) {
      for (const m of mappings) {
        const order = await Order.findById(m.orderId);
        if (order) {
          console.log(`  ✅ Mapped Order: ${order._id} [Status: ${order.status}, Date: ${order.createdAt}]`);
        } else {
          console.log(`  ❌ Mapped Order ${m.orderId} NOT FOUND in Order collection!`);
        }
      }
    }

    // 2. Check direct links in Order.userId
    const directOrders = await Order.find({ userId: user._id });
    console.log(`- Direct links (Order.userId field): ${directOrders.length}`);
    for (const o of directOrders) {
      console.log(`  ✅ Direct Order: ${o._id} [Status: ${o.status}]`);
    }

    process.exit(0);
  } catch (err) {
    console.error("\n❌ Error:", err.message);
    process.exit(1);
  }
}

checkDB();
