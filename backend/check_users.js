const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load env
dotenv.config();

async function checkDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected");

    const User = mongoose.models.User || mongoose.model("User", new mongoose.Schema({ email: String }));
    const UserOrders = mongoose.models.User_Orders || mongoose.model("User_Orders", new mongoose.Schema({ userId: mongoose.Schema.Types.ObjectId }));

    const uniqueUserIds = await UserOrders.distinct("userId");
    console.log(`\n👥 Users with orders in User_Orders: ${uniqueUserIds.length}`);

    for (const uid of uniqueUserIds) {
      const user = await User.findById(uid);
      if (user) {
        const count = await UserOrders.countDocuments({ userId: uid });
        console.log(`- ${user.email}: ${count} orders`);
      } else {
        console.log(`- Unknown User (${uid})`);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkDB();
