const mongoose = require("mongoose");
require("dotenv").config();
const { generateAIChatResponse, streamAIChatResponse } = require("../services/ai.service");
const { searchProducts } = require("../services/productSearch.service");

async function runBenchmark() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("=== CONNECTED TO MONGODB ===");

  const testCases = [
    // 1. Store Questions (FAQs)
    {
      category: "Store FAQ",
      query: "What is Sticktoon?",
      options: {},
      validate: (res) => res.reply.toLowerCase().includes("sticktoon") && res.reply.toLowerCase().includes("store"),
    },
    {
      category: "Store FAQ",
      query: "How do I place an order?",
      options: {},
      validate: (res) => res.reply.toLowerCase().includes("order") && res.reply.toLowerCase().includes("cart"),
    },
    {
      category: "Store FAQ",
      query: "What payment methods are available?",
      options: {},
      validate: (res) => res.reply.toLowerCase().includes("upi") || res.reply.toLowerCase().includes("cards"),
    },

    // 2. Product Search & Accuracy
    {
      category: "Product Accuracy",
      query: "What badges do you have?",
      options: {},
      validate: (res) => res.products && res.products.length > 0 && res.products.every((p) => p.type === "badge"),
    },
    {
      category: "Product Accuracy",
      query: "Show anime stickers",
      options: {},
      validate: (res) => res.products && res.products.length > 0 && res.products.every((p) => p.type === "sticker"),
    },
    {
      category: "Product Accuracy",
      query: "Show products under 200",
      options: {},
      validate: (res) => res.products && res.products.length > 0 && res.products.every((p) => p.price <= 200),
    },
    {
      category: "Product Price Check",
      query: "What is the price of OM VIBE?",
      options: {},
      validate: (res) => res.reply.includes("49") && res.products && res.products.length > 0,
    },
    {
      category: "Product Stock Check",
      query: "Is OM VIBE available?",
      options: {},
      validate: (res) => res.reply.toLowerCase().includes("stock") || res.reply.toLowerCase().includes("available"),
    },

    // 3. Invalid / Unknown Products (Hallucination prevention)
    {
      category: "Anti-Hallucination",
      query: "Do you sell XYZ Quantum Hoverboard?",
      options: {},
      validate: (res) => res.products.length === 0 && !res.reply.toLowerCase().includes("we have xyz quantum hoverboard"),
    },

    // 4. Cart & Orders
    {
      category: "Orders (Guest)",
      query: "Where is my order?",
      options: { userId: null },
      validate: (res) => res.reply.toLowerCase().includes("log in"),
    },
    {
      category: "Cart (Guest)",
      query: "What's in my cart?",
      options: { userId: null },
      validate: (res) => res.reply.toLowerCase().includes("log in"),
    },

    // 5. Multi-turn Conversational Context
    {
      category: "Conversational Follow-up",
      query: "Which one is cheapest?",
      options: {
        history: [
          { role: "user", content: "Show me anime badges" },
          { role: "assistant", content: "Here are some anime badges from our catalog: OM VIBE, BLESS VIBE, PRAY VIBE." },
        ],
      },
      validate: (res) => res.reply.length > 0 && (res.reply.includes("49") || res.reply.toLowerCase().includes("cheapest") || res.reply.toLowerCase().includes("priced")),
    },
  ];

  console.log("\n=======================================================");
  console.log("RUNNING BENCHMARK & ACCURACY SUITE");
  console.log("=======================================================\n");

  const results = [];

  for (const tc of testCases) {
    const start = Date.now();
    try {
      const res = await generateAIChatResponse(tc.query, tc.options);
      const duration = Date.now() - start;
      const isValid = tc.validate(res);

      results.push({
        category: tc.category,
        query: tc.query,
        duration,
        provider: res.provider,
        isValid,
        productsCount: res.products ? res.products.length : 0,
        replySnippet: res.reply.slice(0, 65) + (res.reply.length > 65 ? "..." : ""),
      });

      console.log(`[PASS: ${isValid}] (${duration}ms | ${res.provider}) "${tc.query}"`);
      console.log(`   Reply: ${res.reply.slice(0, 70)}...`);
      if (res.products && res.products.length > 0) {
        console.log(`   Products attached: ${res.products.length} (e.g. "${res.products[0].name}" - ₹${res.products[0].price})`);
      }
      console.log("");
    } catch (e) {
      console.error(`[FAIL] "${tc.query}":`, e.message);
      results.push({
        category: tc.category,
        query: tc.query,
        duration: Date.now() - start,
        isValid: false,
        error: e.message,
      });
    }
  }

  // Test Streaming Performance
  console.log("=======================================================");
  console.log("TESTING REAL-TIME STREAMING PERFORMANCE");
  console.log("=======================================================\n");

  const streamQueries = [
    "What is Sticktoon?",
    "Show anime stickers",
    "Can you recommend a gift for someone who loves anime badges?",
  ];

  for (const sq of streamQueries) {
    const streamStart = Date.now();
    let firstTokenTime = null;
    let chunksCount = 0;
    let streamedText = "";

    await streamAIChatResponse(
      sq,
      {},
      (chunk) => {
        if (!firstTokenTime) {
          firstTokenTime = Date.now() - streamStart;
        }
        chunksCount++;
        streamedText += chunk;
      }
    );

    const totalStreamTime = Date.now() - streamStart;
    console.log(`Query: "${sq}"`);
    console.log(`  Time to First Token: ${firstTokenTime || totalStreamTime}ms`);
    console.log(`  Total Stream Time:   ${totalStreamTime}ms (${chunksCount} chunks)`);
    console.log(`  Preview:             ${streamedText.slice(0, 70)}...`);
    console.log("");
  }

  // Summary Metrics
  const fastPathTimes = results.filter((r) => r.provider === "fast-path").map((r) => r.duration);
  const aiTimes = results.filter((r) => r.provider !== "fast-path").map((r) => r.duration);
  const avgFastPath = fastPathTimes.length ? (fastPathTimes.reduce((a, b) => a + b, 0) / fastPathTimes.length).toFixed(1) : "N/A";
  const avgAI = aiTimes.length ? (aiTimes.reduce((a, b) => a + b, 0) / aiTimes.length).toFixed(1) : "N/A";
  const allPassed = results.every((r) => r.isValid);

  console.log("=======================================================");
  console.log("BENCHMARK SUMMARY");
  console.log("=======================================================");
  console.log(`Total tests:         ${results.length}`);
  console.log(`All Passed:          ${allPassed ? "YES (100% SUCCESS)" : "NO"}`);
  console.log(`Average Fast-Path:   ${avgFastPath}ms (Target: < 500ms)`);
  console.log(`Average AI Call:     ${avgAI}ms (Target: < 3000ms)`);
  console.log("=======================================================\n");

  await mongoose.disconnect();
}

runBenchmark().catch((e) => {
  console.error(e);
  process.exit(1);
});
