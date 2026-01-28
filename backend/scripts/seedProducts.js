const mongoose = require("mongoose");
const Product = require("../models/Product");
require("dotenv").config();

// Existing badges from constants.tsx
const EXISTING_BADGES = [
  // MOODY
  { id: 'moody-5', name: 'Joy Pop', price: 49, category: 'Moody', image: '/badge/moody2.png', stock: 100 },
  { id: 'moody-1', name: 'Crushin', price: 49, category: 'Moody', image: '/badge/moody1.png', stock: 100 },
  { id: 'moody-2', name: 'OMG Mood', price: 49, category: 'Moody', image: '/badge/moody3.png', stock: 100 },
  { id: 'moody-3', name: 'Just Vibin', price: 49, category: 'Moody', image: '/badge/moody4.png', stock: 100 },
  
  // SPORTS
  { id: 'sports-1', name: 'GOAL VIBE', price: 49, category: 'Sports', image: '/badge/sport1.png', stock: 100 },
  { id: 'sports-2', name: 'WIN VIBE', price: 49, category: 'Sports', image: '/badge/sport2.png', stock: 100 },
  { id: 'sports-3', name: 'GAME VIBE', price: 49, category: 'Sports', image: '/badge/sport3.png', stock: 100 },
  { id: 'sports-4', name: 'BEAST MODE', price: 49, category: 'Sports', image: '/badge/sport4.png', stock: 100 },
  
  // RELIGIOUS
  { id: 'reli-1', name: 'OM VIBE', price: 49, category: 'Religious', image: '/badge/religious1.png', stock: 100 },
  { id: 'reli-2', name: 'FAITH VIBE', price: 49, category: 'Religious', image: '/badge/religious2.png', stock: 100 },
  { id: 'reli-3', name: 'BLESS VIBE', price: 49, category: 'Religious', image: '/badge/religious3.png', stock: 100 },
  { id: 'reli-4', name: 'PRAY VIBE', price: 49, category: 'Religious', image: '/badge/religious4.png', stock: 100 },
  
  // ENTERTAINMENT
  { id: 'ent-1', name: 'CINEMA VIBE', price: 49, category: 'Entertainment', image: '/badge/entert1.png', stock: 100 },
  { id: 'ent-2', name: 'STAGE VIBE', price: 49, category: 'Entertainment', image: '/badge/entert3.png', stock: 100 },
  { id: 'ent-3', name: 'DISCO VIBE', price: 49, category: 'Entertainment', image: '/badge/entert4.png', stock: 100 },
  { id: 'ent-4', name: 'STREAM VIBE', price: 49, category: 'Entertainment', image: '/badge/entert5.png', stock: 100 },
  
  // EVENTS
  { id: 'event-1', name: 'flag VIBE', price: 49, category: 'Events', image: '/badge/flag.png', stock: 100 },
  { id: 'event-2', name: 'BIRTHDAY VIBE', price: 49, category: 'Events', image: '/badge/event2.png', stock: 100 },
  { id: 'event-3', name: 'GRAD VIBE', price: 49, category: 'Events', image: '/badge/event3.png', stock: 100 },
  { id: 'event-4', name: 'WEDDING VIBE', price: 49, category: 'Events', image: '/badge/event4.png', stock: 100 },
  { id: 'event-5', name: 'Party VIBE', price: 49, category: 'Events', image: '/badge/event1.png', stock: 100 },
  
  // ANIMAL
  { id: 'animal-1', name: 'Bunny Bliss', price: 49, category: 'Animal', image: '/badge/bunny.png', stock: 100 },
  { id: 'animal-2', name: 'Puppy Cheer', price: 49, category: 'Animal', image: '/badge/animal2.png', stock: 100 },
  { id: 'animal-3', name: 'Bunny Bliss', price: 49, category: 'Animal', image: '/badge/animal3.png', stock: 100 },
  { id: 'animal-4', name: 'Little Champion', price: 49, category: 'Animal', image: '/badge/animal4.png', stock: 100 },
  
  // COUPLE
  { id: 'couple-1', name: 'SOUL VIBE', price: 49, category: 'Couple', image: '/badge/c1.png', stock: 100 },
  { id: 'couple-2', name: 'LOVE VIBE', price: 49, category: 'Couple', image: '/badge/c2.png', stock: 100 },
  { id: 'couple-3', name: 'HEART VIBE', price: 49, category: 'Couple', image: '/badge/c3.png', stock: 100 },
  { id: 'couple-4', name: 'FOREVER VIBE', price: 49, category: 'Couple', image: '/badge/c4.png', stock: 100 },
  
  // ANIME
  { id: 'anime-1', name: 'HERO VIBE', price: 49, category: 'Anime', image: '/badge/anime1.png', stock: 100 },
  { id: 'anime-2', name: 'NINJA VIBE', price: 49, category: 'Anime', image: '/badge/anime2.png', stock: 100 },
  { id: 'anime-3', name: 'KAWAII VIBE', price: 49, category: 'Anime', image: '/badge/anime3.png', stock: 100 },
  { id: 'anime-4', name: 'SENPAI VIBE', price: 49, category: 'Anime', image: '/badge/anime4.png', stock: 100 },
];

const seedProducts = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Clear existing products
    await Product.deleteMany({});
    console.log("🗑️  Cleared existing products");

    // Insert badges as products
    const products = EXISTING_BADGES.map((badge) => ({
      name: badge.name,
      price: badge.price,
      description: `Premium ${badge.name} badge. High-quality design perfect for your collection.`,
      category: badge.category,
      image: badge.image,
      stock: badge.stock,
      isActive: true,
    }));

    await Product.insertMany(products);
    console.log(`✅ Inserted ${products.length} products into database`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding products:", err);
    process.exit(1);
  }
};

seedProducts();
