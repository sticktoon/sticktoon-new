/**
 * Migrates the combo packs that used to be hardcoded in `constants.tsx` into
 * real Product documents, so they can be edited from the admin panel.
 *
 * Each combo's `comboItems` is filled with every active, non-combo product in
 * the same category at run time. Safe to re-run: it upserts by name and never
 * deletes anything.
 *
 *   node backend/scripts/seedComboProducts.js          # apply
 *   node backend/scripts/seedComboProducts.js --dry    # preview only
 */
const path = require("path");
const mongoose = require("mongoose");
const Product = require("../models/Product");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

// Mirrors the combo entries in constants.tsx. `categoryAliases` exists because
// the Pet badges were seeded under "Pet" while the admin panel calls it "Animal".
const COMBO_PACKS = [
  { name: "Moody Combo Pack", category: "Moody", image: "/badge/mergemoody.png", tagline: "All Moody badges in one" },
  { name: "Sports Combo Pack", category: "Sports", image: "/badge/mergesport.png", tagline: "All Sports badges in one" },
  { name: "Religious Combo Pack", category: "Religious", image: "/badge/mergereligious.png", tagline: "All Religious badges in one" },
  { name: "Entertainment Combo", category: "Entertainment", image: "/badge/mergeenter.png", tagline: "All Entertainment in one" },
  { name: "Events Combo Pack", category: "Events", image: "/badge/mergeevent.png", tagline: "All Events badges in one" },
  { name: "Pet Combo Pack", category: "Animal", categoryAliases: ["Animal", "Pet"], image: "/badge/mergeanimal.png", tagline: "All Pet badges in one" },
  { name: "Couple Combo Pack", category: "Couple", image: "/badge/mergecouple.png", tagline: "All Couple badges in one" },
  { name: "Anime Combo Pack", category: "Anime", image: "/badge/mergeanime.png", tagline: "All Anime badges in one" },
];

const COMBO_PRICE = 149;

const seedComboProducts = async () => {
  const dryRun = process.argv.includes("--dry");

  if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI is not set. Aborting.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ Connected to MongoDB${dryRun ? " (dry run — nothing will be written)" : ""}`);

    let created = 0;
    let updated = 0;

    for (const combo of COMBO_PACKS) {
      const categories = combo.categoryAliases || [combo.category];

      const members = await Product.find({
        category: { $in: categories },
        isActive: true,
        isCombo: { $ne: true },
      })
        .select("name image")
        .lean();

      if (members.length === 0) {
        console.warn(`⚠️  ${combo.name}: no badges found in ${categories.join("/")}, skipping`);
        continue;
      }

      const comboItems = members.map((member) => ({
        id: String(member._id),
        name: member.name,
        image: member.image || "",
      }));

      const existing = await Product.findOne({ name: combo.name }).select("_id").lean();

      console.log(
        `${existing ? "↻ update" : "+ create"} ${combo.name} → ${comboItems.length} badges: ${comboItems
          .map((item) => item.name)
          .join(", ")}`,
      );

      if (dryRun) continue;

      await Product.findOneAndUpdate(
        { name: combo.name },
        {
          $set: {
            price: COMBO_PRICE,
            description: `${combo.tagline}. Get all ${combo.category} badges in one combo pack!`,
            category: combo.category,
            image: combo.image,
            isCombo: true,
            comboItems,
            isActive: true,
          },
          $setOnInsert: { stock: 100 },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      if (existing) updated += 1;
      else created += 1;
    }

    if (dryRun) {
      console.log("\n🔍 Dry run complete. Re-run without --dry to apply.");
    } else {
      console.log(`\n✅ Combo packs: ${created} created, ${updated} updated`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding combo products:", err);
    process.exit(1);
  }
};

seedComboProducts();
