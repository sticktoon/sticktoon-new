const Product = require("../models/Product");

/**
 * Escapes special characters for use in a regular expression
 * to prevent regex injection or syntax errors.
 */
function escapeRegex(string) {
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// In-memory cache for catalog searches with 60-second TTL to avoid duplicate DB hits
const searchCache = new Map();
const CACHE_TTL_MS = 60 * 1000;
const MAX_CACHE_ENTRIES = 200;

function getCacheKey(filters, limit) {
  return JSON.stringify({
    q: (filters.query || "").trim().toLowerCase(),
    c: (filters.category || "").trim().toLowerCase(),
    t: (filters.type || "").trim().toLowerCase(),
    min: filters.minPrice || 0,
    max: filters.maxPrice || 0,
    l: limit || 10,
  });
}

function getFromCache(key) {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    searchCache.delete(key);
    return null;
  }
  return entry.data;
}

function setInCache(key, data) {
  if (searchCache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = searchCache.keys().next().value;
    if (firstKey) searchCache.delete(firstKey);
  }
  searchCache.set(key, { data, timestamp: Date.now() });
}

/**
 * Search the MongoDB Product catalog based on extracted filters.
 *
 * @param {Object} filters
 * @param {string} [filters.query] - Keywords in title, description, category, or subcategory
 * @param {string} [filters.category] - Specific product category filter
 * @param {string} [filters.type] - Product type ('badge' or 'sticker')
 * @param {number} [filters.minPrice] - Minimum price (inclusive)
 * @param {number} [filters.maxPrice] - Maximum price (inclusive)
 * @param {number} [limit=10] - Maximum number of products to return
 * @returns {Promise<Array<Object>>} Formatted product results
 */
async function searchProducts(filters = {}, limit = 10) {
  const startTime = Date.now();
  const cacheKey = getCacheKey(filters, limit);
  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log(`[ProductSearch] Cache hit for "${filters.query || filters.category || 'all'}" (${Date.now() - startTime}ms)`);
    return cached;
  }

  try {
    const filter = {
      isActive: { $ne: false },
    };

    let queryText = (filters.query || "").trim();
    let detectedType = null;

    if (/\bstickers?\b/i.test(queryText)) {
      detectedType = "sticker";
      queryText = queryText.replace(/\bstickers?\b/gi, "").trim();
    } else if (/\bbadges?\b/i.test(queryText)) {
      detectedType = "badge";
      queryText = queryText.replace(/\bbadges?\b/gi, "").trim();
    }

    // Type filter ('badge' | 'sticker')
    if (filters.type && typeof filters.type === "string" && filters.type.trim()) {
      const lowerType = filters.type.trim().toLowerCase();
      if (lowerType.includes("sticker")) {
        filter.type = "sticker";
      } else if (lowerType.includes("badge")) {
        filter.type = "badge";
      }
    } else if (detectedType) {
      filter.type = detectedType;
    }

    // Keyword search (matches product name, description, category, or subcategory)
    const searchTerm = queryText || filters.query;
    if (searchTerm && typeof searchTerm === "string" && searchTerm.trim()) {
      const safeQuery = escapeRegex(searchTerm.trim());
      filter.$or = [
        { name: { $regex: safeQuery, $options: "i" } },
        { description: { $regex: safeQuery, $options: "i" } },
        { category: { $regex: safeQuery, $options: "i" } },
        { subcategory: { $regex: safeQuery, $options: "i" } },
      ];
    }

    // 3. Category filter (if specified independently of or in addition to query)
    if (filters.category && typeof filters.category === "string" && filters.category.trim()) {
      const safeCat = escapeRegex(filters.category.trim());
      filter.category = { $regex: safeCat, $options: "i" };
    }

    // 4. Price range filter
    const hasMin = typeof filters.minPrice === "number" && !isNaN(filters.minPrice) && filters.minPrice >= 0;
    const hasMax = typeof filters.maxPrice === "number" && !isNaN(filters.maxPrice) && filters.maxPrice >= 0;

    if (hasMin || hasMax) {
      filter.price = {};
      if (hasMin) {
        filter.price.$gte = Number(filters.minPrice);
      }
      if (hasMax) {
        filter.price.$lte = Number(filters.maxPrice);
      }
    }

    const cappedLimit = Math.min(Math.max(1, limit || 10), 10);

    // Optimized query with strict field projections and lean execution
    const products = await Product.find(filter)
      .select("name type price description category subcategory stock image images")
      .sort({ createdAt: -1 })
      .limit(cappedLimit)
      .lean();

    // Map to clean, safe structure without exposing backend internals
    const results = products.map((product) => ({
      id: String(product._id),
      name: product.name,
      type: product.type || "badge",
      price: product.price,
      description: product.description || "",
      category: product.category || "",
      stock: typeof product.stock === "number" ? product.stock : 0,
      image: product.image || (Array.isArray(product.images) && product.images[0]) || "",
    }));

    setInCache(cacheKey, results);
    console.log(`[ProductSearch] DB search took ${Date.now() - startTime}ms, returned ${results.length} items`);
    return results;
  } catch (error) {
    console.error("Product Search Service Error:", error.message || error);
    return [];
  }
}

module.exports = {
  searchProducts,
};
