const Product = require("../models/Product");
const { searchProducts } = require("./productSearch.service");
const cartService = require("./cart.service");
const orderService = require("./order.service");

function escapeRegex(string) {
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Static store knowledge base for instantaneous FAQ answers (< 1ms).
 * Strictly factual and grounded in StickToon policies.
 */
const FAQ_KNOWLEDGE = [
  {
    patterns: [
      /\b(what\s+is|tell\s+me\s+about|about)\s+sticktoon\b/i,
      /\bwho\s+are\s+you\b/i,
      /\bwhat\s+do\s+you\s+(sell|make|do)\b/i,
      /\bwhat\s+is\s+this\s+(store|website|shop)\b/i,
    ],
    reply:
      "StickToon is an online store specializing in high-quality badges and waterproof vinyl stickers. We offer hundreds of pop-culture, anime, gaming, sports, and custom designs to personalize your laptops, water bottles, bags, and gear.",
  },
  {
    patterns: [
      /\b(how\s+to\s+(order|buy|purchase)|how\s+do\s+i\s+(order|buy|place\s+an?\s+order))\b/i,
      /\bplace\s+(an?\s+)?order\b/i,
    ],
    reply:
      "To place an order on StickToon:\n1. Browse our Badges or Stickers collections.\n2. Click on a product to view details or click 'Add' to put it in your cart.\n3. Open your Cart and proceed to Checkout.\n4. Enter your shipping address and complete your secure online payment.",
  },
  {
    patterns: [
      /\b(payment\s+methods?|how\s+can\s+i\s+pay|accepted\s+payments?|upi\s+available|cod|cash\s+on\s+delivery)\b/i,
    ],
    reply:
      "StickToon accepts secure online payments via UPI (Google Pay, PhonePe, Paytm), Credit & Debit Cards, Net Banking, and digital wallets. We do not support Cash on Delivery at this time.",
  },
  {
    patterns: [
      /\b(return\s+policy|refund\s+policy|cancellation|how\s+to\s+return|refunds?|replace\s+an?\s+item)\b/i,
    ],
    reply:
      "If you receive a defective or damaged product, please reach out within 48 hours of delivery with photos to support@sticktoon.shop or via our Contact page. We will promptly arrange a replacement or refund.",
  },
  {
    patterns: [
      /\b(shipping|delivery\s+time|how\s+long\s+does\s+delivery\s+take|when\s+will\s+it\s+be\s+delivered|dispatch\s+time|deliver\s+across\s+india)\b/i,
    ],
    reply:
      "We deliver across India! Orders are dispatched within 24 to 48 hours. Standard delivery takes 3 to 7 business days depending on your location. You will receive tracking details once your order is on the way.",
  },
  {
    patterns: [
      /\b(contact\s+support|customer\s+support|how\s+to\s+contact|support\s+email|helpline|contact\s+us)\b/i,
    ],
    reply:
      "You can contact StickToon customer support by emailing support@sticktoon.shop or by submitting a query on our website's Contact page. We usually respond within 24 hours.",
  },
  {
    patterns: [
      /\b(waterproof|quality|material|sticker\s+material|badge\s+material)\b/i,
    ],
    reply:
      "Our stickers are printed on premium waterproof, scratch-resistant vinyl that lasts on laptops and bottles. Our pin badges feature high-gloss rust-free metallic pins with durable backings.",
  },
];

/**
 * Match static FAQ knowledge base.
 */
function matchFAQ(message) {
  const text = message.trim();
  for (const faq of FAQ_KNOWLEDGE) {
    if (faq.patterns.some((pattern) => pattern.test(text))) {
      return {
        reply: faq.reply,
        products: [],
        cart: null,
      };
    }
  }
  return null;
}

/**
 * Deterministic fast path for order lookup & tracking.
 */
async function handleOrderFastPath(message, { userId }) {
  const text = message.toLowerCase().trim();

  const isOrderQuery =
    /\b(where\s+is\s+my\s+order|order\s+status|track(\s+my)?\s+order|recent\s+orders?|my\s+orders?|what\s+did\s+i\s+order|when\s+will\s+my\s+order\s+arrive|check\s+my\s+order)\b/i.test(
      text
    );

  if (!isOrderQuery) return null;

  if (!userId) {
    return {
      reply: "Please log in to your StickToon account to view and track your orders.",
      products: [],
      cart: null,
      orders: [],
    };
  }

  // Check if a specific order ID or order number was mentioned (e.g. 24 hex char or #8 chars)
  const hexMatch = text.match(/\b([0-9a-f]{24})\b/i);
  const orderNumMatch = text.match(/#?([0-9a-f]{8})\b/i);

  if (hexMatch) {
    const res = await orderService.getOrderStatus({ userId, orderId: hexMatch[1] });
    if (res.order) {
      return {
        reply: `Here is the status of your order #${res.order.orderNumber || res.order.orderId}:`,
        orders: [res.order],
        products: [],
        cart: null,
      };
    }
    return {
      reply: "I couldn't find an order matching that ID in your account.",
      orders: [],
      products: [],
      cart: null,
    };
  }

  // Retrieve recent orders
  const res = await orderService.getMyOrders({ userId, limit: 5 });
  const orders = Array.isArray(res.orders) ? res.orders : [];

  if (orders.length === 0) {
    return {
      reply: "I couldn't find any orders in your account.",
      orders: [],
      products: [],
      cart: null,
    };
  }

  return {
    reply: `I found ${orders.length === 1 ? "your order" : "your recent orders"}. You can view the details and tracking status below:`,
    orders,
    products: [],
    cart: null,
  };
}

/**
 * Deterministic fast path for viewing cart contents.
 */
async function handleCartFastPath(message, { userId }) {
  const text = message.toLowerCase().trim();

  const isCartView =
    /\b(what('?s|\s+is)\s+in\s+my\s+cart|show\s+my\s+cart|view\s+cart|my\s+cart|check\s+cart|see\s+my\s+cart)\b/i.test(
      text
    );

  if (!isCartView) return null;

  if (!userId) {
    return {
      reply: "Please log in to view and manage items in your cart.",
      products: [],
      cart: null,
    };
  }

  const res = await cartService.getCart({ userId });
  if (res.success && res.items) {
    const count = res.totalItems || 0;
    const total = res.total || 0;
    const reply =
      count > 0
        ? `Your cart currently has ${count} item${count === 1 ? "" : "s"} totaling ₹${total}.`
        : "Your cart is currently empty. Start exploring our badges and stickers!";

    return {
      reply,
      cart: res,
      products: [],
    };
  }

  return {
    reply: "Could not fetch your cart at the moment. Please try again.",
    cart: null,
    products: [],
  };
}

/**
 * Deterministic fast path for price and availability queries.
 * Examples:
 * - "What is the price of OM VIBE?"
 * - "How much is OM VIBE?"
 * - "Is OM VIBE available?"
 * - "Is OM VIBE in stock?"
 */
async function handlePriceOrAvailabilityFastPath(message) {
  const text = message.trim();

  const priceMatch =
    text.match(/(?:what\s+is\s+the\s+price\s+of|how\s+much\s+is|price\s+of)\s+([^?]+)/i);
  const stockMatch =
    text.match(/(?:is|are)\s+([^?]+?)\s+(?:available|in\s+stock|out\s+of\s+stock)/i) ||
    text.match(/(?:do\s+you\s+have|check\s+stock\s+of)\s+([^?]+)/i);

  const targetName = (priceMatch?.[1] || stockMatch?.[1] || "").trim();
  if (!targetName || targetName.length < 2) return null;

  // Clean trailing punctuation or stop words
  const cleanName = targetName.replace(/[?.!]+$/, "").trim();

  const product = await Product.findOne({
    isActive: { $ne: false },
    name: { $regex: escapeRegex(cleanName), $options: "i" },
  })
    .select("name type price description category stock image images")
    .lean();

  if (!product) return null; // Fall through to search or AI if no exact match

  const inStock = typeof product.stock === "number" ? product.stock > 0 : false;
  const stockStatus = inStock ? `in stock (${product.stock} available)` : "currently out of stock";
  const reply = `${product.name} is ₹${product.price} and is ${stockStatus}.`;

  const formattedProduct = {
    id: String(product._id),
    name: product.name,
    type: product.type || "badge",
    price: product.price,
    description: product.description || "",
    category: product.category || "",
    stock: typeof product.stock === "number" ? product.stock : 0,
    image: product.image || (Array.isArray(product.images) && product.images[0]) || "",
  };

  return {
    reply,
    products: [formattedProduct],
    cart: null,
  };
}

/**
 * Deterministic fast path for direct catalog browsing & searches.
 * Examples:
 * - "What badges do you have?"
 * - "Show anime stickers"
 * - "Show products under 200"
 * - "Stickers under 150"
 * - "Show gaming badges"
 */
async function handleCatalogSearchFastPath(message) {
  const text = message.trim();

  // Pattern detection
  const isBrowseIntent =
    /^(show\s+(me\s+)?|what\s+|list\s+|browse\s+|find\s+|get\s+|see\s+)/i.test(text) ||
    /\b(under|below|less\s+than)\s+₹?\d+\b/i.test(text) ||
    /^(anime|sports|marvel|gaming|dc|moody|stickers?|badges?)\b/i.test(text);

  if (!isBrowseIntent) return null;

  // Don't intercept complex comparison or conversational reasoning
  if (
    /\b(cheapest|best|recommend|which\s+one|difference|compare|why|should\s+i|opinion)\b/i.test(
      text
    )
  ) {
    return null;
  }

  // Parse filters
  const filters = {};

  // Detect type
  if (/\bstickers?\b/i.test(text)) {
    filters.type = "sticker";
  } else if (/\bbadges?\b/i.test(text)) {
    filters.type = "badge";
  }

  // Detect price limits
  const maxPriceMatch = text.match(/\b(?:under|below|less\s+than|max)\s*₹?\s*(\d+)/i);
  if (maxPriceMatch) {
    filters.maxPrice = Number(maxPriceMatch[1]);
  }

  const minPriceMatch = text.match(/\b(?:above|over|more\s+than|min)\s*₹?\s*(\d+)/i);
  if (minPriceMatch) {
    filters.minPrice = Number(minPriceMatch[1]);
  }

  // Detect known categories
  const knownCategories = [
    "Anime",
    "Sports",
    "Moody",
    "Positive Vibes",
    "Religious",
    "Entertainment",
    "Events",
    "Animal",
    "Pet",
    "Couple",
    "marvel",
    "dc-universe",
    "cartoon",
    "sticker-pack",
    "random",
    "love",
  ];

  for (const cat of knownCategories) {
    if (new RegExp(`\\b${escapeRegex(cat)}\\b`, "i").test(text)) {
      filters.category = cat;
      break;
    }
  }

  // Extract clean query terms
  let cleanQuery = text
    .replace(/\b(show\s+me|show|what|list|do\s+you\s+have|any|all|products?|items?|please|have|can\s+i\s+see)\b/gi, "")
    .replace(/\b(under|below|above|less\s+than|more\s+than)\s*₹?\s*\d+\b/gi, "")
    .replace(/\b(stickers?|badges?)\b/gi, "")
    .replace(/[?.,!]/g, "")
    .trim();

  if (filters.category) {
    cleanQuery = cleanQuery.replace(new RegExp(`\\b${escapeRegex(filters.category)}\\b`, "gi"), "").trim();
  }

  if (cleanQuery && cleanQuery.length > 1) {
    filters.query = cleanQuery;
  }

  const products = await searchProducts(filters, 10);

  if (products.length === 0) {
    const label = filters.category || filters.query || (filters.type ? `${filters.type}s` : "products");
    return {
      reply: `I couldn't find any ${label} matching your search. Try browsing our Anime, Gaming, Marvel, or Sports collections!`,
      products: [],
      cart: null,
    };
  }

  const typeLabel = filters.type ? (filters.type === "sticker" ? "stickers" : "badges") : "products";
  const catLabel = filters.category ? `${filters.category} ` : "";
  const priceLabel = filters.maxPrice ? ` under ₹${filters.maxPrice}` : "";

  const reply = `Here are some ${catLabel}${typeLabel}${priceLabel} from our catalog:`;

  return {
    reply,
    products,
    cart: null,
  };
}

/**
 * Main dispatcher for all fast-path requests.
 * Evaluates in order of priority:
 * 1. Store FAQs (< 1ms)
 * 2. Order Tracking (< 50ms)
 * 3. Cart Summary (< 30ms)
 * 4. Price & Availability (< 50ms)
 * 5. Direct Catalog Search (< 60ms)
 *
 * If none match, returns null so the request can proceed to the optimized single-call AI generator.
 */
async function tryFastPath(message, { userId = null } = {}) {
  const startTime = Date.now();

  // 1. Static FAQs
  const faqRes = matchFAQ(message);
  if (faqRes) {
    console.log(`[FastPath] Matched FAQ in ${Date.now() - startTime}ms`);
    return { ...faqRes, fastPath: "faq" };
  }

  // 2. Orders
  const orderRes = await handleOrderFastPath(message, { userId });
  if (orderRes) {
    console.log(`[FastPath] Matched Order Query in ${Date.now() - startTime}ms`);
    return { ...orderRes, fastPath: "order" };
  }

  // 3. Cart
  const cartRes = await handleCartFastPath(message, { userId });
  if (cartRes) {
    console.log(`[FastPath] Matched Cart Query in ${Date.now() - startTime}ms`);
    return { ...cartRes, fastPath: "cart" };
  }

  // 4. Price / Availability
  const priceRes = await handlePriceOrAvailabilityFastPath(message);
  if (priceRes) {
    console.log(`[FastPath] Matched Price/Stock in ${Date.now() - startTime}ms`);
    return { ...priceRes, fastPath: "price-stock" };
  }

  // 5. Catalog Search
  const searchRes = await handleCatalogSearchFastPath(message);
  if (searchRes) {
    console.log(`[FastPath] Matched Catalog Search in ${Date.now() - startTime}ms`);
    return { ...searchRes, fastPath: "search" };
  }

  return null;
}

module.exports = {
  tryFastPath,
  matchFAQ,
};
