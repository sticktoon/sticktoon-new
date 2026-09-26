/**
 * Removes test website orders placed before a date, along with what payment
 * verification hung off them: order invoices, User_Orders links, influencer
 * earnings and promo-code usage. Dry run unless --apply; with --apply it first
 * writes everything it removes to backend/logs/ (gitignored).
 *
 *   node scripts/removeTestOrders.js --before=2026-09-27          # dry run
 *   node scripts/removeTestOrders.js --before=2026-09-27 --apply  # delete
 *
 * --before is an IST date; orders created before its midnight go.
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Invoice = require("../models/Invoice");
const UserOrders = require("../models/User_Orders");
const InfluencerEarning = require("../models/InfluencerEarning");
const PromoCode = require("../models/PromoCode");
const User = require("../models/User");

const before = (process.argv.find((a) => a.startsWith("--before=")) || "").slice("--before=".length);
const apply = process.argv.includes("--apply");
if (!/^\d{4}-\d{2}-\d{2}$/.test(before)) {
  console.error("Usage: node scripts/removeTestOrders.js --before=YYYY-MM-DD [--apply]");
  process.exit(1);
}
const cutoff = new Date(`${before}T00:00:00+05:30`);
const day = (d) => new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const sum = (list, f) => list.reduce((s, x) => s + (Number(f(x)) || 0), 0);

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const orders = await Order.find({ createdAt: { $lt: cutoff } }).sort({ createdAt: 1 }).lean();
  const ids = orders.map((o) => o._id);
  const isRemoved = (id) => ids.some((x) => x.equals(id));
  const [invoices, links, earnings] = await Promise.all([
    Invoice.find({ orderId: { $in: ids } }).lean(),
    UserOrders.find({ orderId: { $in: ids } }).lean(),
    InfluencerEarning.find({ orderId: { $in: ids } }).lean(),
  ]);
  const promos = await PromoCode.find({
    $or: [{ "usageHistory.orderId": { $in: ids } }, { _id: { $in: earnings.map((e) => e.promoCodeId) } }],
  }).lean();

  console.log(`Orders created before ${before} (IST): ${orders.length}\n`);
  for (const o of orders) {
    console.log(`  ${day(o.createdAt)}  ${o.status.padEnd(7)}  ₹${String(o.amount).padStart(6)}  ${o.userEmail || "(guest)"}${o.promoCode ? `  promo:${o.promoCode}` : ""}`);
  }
  const paid = orders.filter((o) => o.status === "SUCCESS");
  const remaining = await Order.countDocuments({ createdAt: { $gte: cutoff }, status: "SUCCESS" });
  console.log(`\n  Paid (count in revenue): ${paid.length} orders, ₹${sum(paid, (o) => o.amount)}`);
  console.log(`  Also goes: ${invoices.length} invoices, ${links.length} User_Orders links, ${earnings.length} influencer earnings (₹${sum(earnings, (e) => e.totalEarning)}), usage on ${promos.length} promo codes`);
  console.log(`  Paid orders on/after ${before} that stay: ${remaining}`);

  if (!apply) {
    console.log("\nDry run - nothing changed. Re-run with --apply to delete.");
    return;
  }

  const backup = path.join(__dirname, "..", "logs", `removed-test-orders-${Date.now()}.json`);
  fs.mkdirSync(path.dirname(backup), { recursive: true });
  fs.writeFileSync(backup, JSON.stringify({ before, orders, invoices, links, earnings, promos }, null, 2));
  console.log(`\nBackup: ${backup}`);

  // Reverse what razorpayPayment.js added when these orders were paid.
  for (const promo of promos) {
    const mine = earnings.filter((e) => e.promoCodeId.equals(promo._id));
    await PromoCode.updateOne(
      { _id: promo._id },
      {
        $inc: {
          usedCount: -promo.usageHistory.filter((u) => u.orderId && isRemoved(u.orderId)).length,
          totalEarnings: -sum(mine, (e) => e.totalEarning),
          totalUnitsSold: -sum(mine, (e) => e.totalUnits),
        },
        $pull: { usageHistory: { orderId: { $in: ids } } },
      }
    );
  }
  for (const e of earnings) {
    await User.updateOne(
      { _id: e.influencerId },
      {
        $inc: {
          "influencerProfile.totalEarnings": -e.totalEarning,
          ...(e.status === "pending" ? { "influencerProfile.pendingEarnings": -e.totalEarning } : {}),
        },
      }
    );
  }

  const results = await Promise.all([
    InfluencerEarning.deleteMany({ _id: { $in: earnings.map((e) => e._id) } }),
    UserOrders.deleteMany({ _id: { $in: links.map((l) => l._id) } }),
    Invoice.deleteMany({ _id: { $in: invoices.map((i) => i._id) } }),
  ]);
  const gone = await Order.deleteMany({ _id: { $in: ids } });
  console.log(`Deleted ${gone.deletedCount} orders, ${results[2].deletedCount} invoices, ${results[1].deletedCount} links, ${results[0].deletedCount} earnings.`);
}

main()
  .catch((err) => {
    console.error("❌", err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.connection.close());
