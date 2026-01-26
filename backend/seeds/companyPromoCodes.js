/**
 * Seed script to add company promo codes
 * Run once: node seeds/companyPromoCodes.js
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load env from parent directory
dotenv.config({ path: path.join(__dirname, "../.env") });

const PromoCode = require("../models/PromoCode");

const companyPromoCodes = [
  {
    code: "ST99",
    promoType: "company",
    discountType: "percentage",
    discountValue: 99,
    minOrderAmount: 0,
    maxDiscount: null, // No max limit
    usageLimit: null, // Unlimited usage
    validFrom: new Date(),
    validUntil: new Date("2030-12-31"),
    description: "StickToon Special - 99% OFF!",
    isActive: true,
  },
  {
    code: "WELCOME50",
    promoType: "company",
    discountType: "percentage",
    discountValue: 50,
    minOrderAmount: 0,
    maxDiscount: 200,
    usageLimit: null,
    validFrom: new Date(),
    validUntil: new Date("2030-12-31"),
    description: "Welcome offer - 50% OFF",
    isActive: true,
  },
  {
    code: "ST20",
    promoType: "company",
    discountType: "percentage",
    discountValue: 20,
    minOrderAmount: 0,
    maxDiscount: 100,
    usageLimit: null,
    validFrom: new Date(),
    validUntil: new Date("2030-12-31"),
    description: "StickToon 20% OFF",
    isActive: true,
  },
];

async function seedPromoCodes() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    for (const promo of companyPromoCodes) {
      const existing = await PromoCode.findOne({ code: promo.code });
      
      if (existing) {
        console.log(`Promo code ${promo.code} already exists, skipping...`);
      } else {
        await PromoCode.create(promo);
        console.log(`Created promo code: ${promo.code} (${promo.discountValue}% OFF)`);
      }
    }

    console.log("\nDone! Company promo codes seeded.");
    process.exit(0);
  } catch (err) {
    console.error("Error seeding promo codes:", err);
    process.exit(1);
  }
}

seedPromoCodes();
