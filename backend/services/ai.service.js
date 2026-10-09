const geminiService = require("./gemini.service");
const groqService = require("./groq.service");
const { tryFastPath } = require("./chatbotFastPath.service");
const { searchProducts } = require("./productSearch.service");

/**
 * Determines whether an error thrown by Gemini represents a transient,
 * quota, rate-limit, or temporary provider outage eligible for Groq fallback.
 */
function isTransientGeminiError(error) {
  if (!error) return false;

  const status = error.status || error.statusCode || (error.response && error.response.status);
  if ([429, 500, 502, 503, 504].includes(status)) {
    return true;
  }

  const msg = String(error.message || "").toLowerCase();
  const transientPatterns = [
    "429",
    "resource_exhausted",
    "rate limit",
    "quota exceeded",
    "quota",
    "too many requests",
    "temporarily unavailable",
    "unavailable",
    "503",
    "high demand",
    "overloaded",
    "deadline_exceeded",
    "timeout",
    "etimedout",
    "econnreset",
    "network error",
    "fetch failed",
  ];

  return transientPatterns.some((pattern) => msg.includes(pattern));
}

/**
 * Extract candidate product filters from the user message and recent conversation history.
 * Helps pre-fetch candidate products so AI needs only ONE turn and never invents products.
 */
function extractCandidateSearchFilters(message, history = []) {
  const text = (message || "").toLowerCase();
  const filters = {};

  if (/\bstickers?\b/i.test(text)) filters.type = "sticker";
  else if (/\bbadges?\b/i.test(text)) filters.type = "badge";

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
    if (new RegExp(`\\b${cat}\\b`, "i").test(text)) {
      filters.category = cat;
      break;
    }
  }

  // If follow-up question (e.g. "which one is cheapest?"), look back in history
  if (!filters.category && !filters.type && Array.isArray(history) && history.length > 0) {
    const lastUserTurn = [...history].reverse().find((h) => h.role === "user");
    if (lastUserTurn && typeof lastUserTurn.content === "string") {
      const prevText = lastUserTurn.content.toLowerCase();
      if (/\bstickers?\b/i.test(prevText)) filters.type = "sticker";
      else if (/\bbadges?\b/i.test(prevText)) filters.type = "badge";

      for (const cat of knownCategories) {
        if (new RegExp(`\\b${cat}\\b`, "i").test(prevText)) {
          filters.category = cat;
          break;
        }
      }
    }
  }

  // Price constraint
  const maxPriceMatch = text.match(/\b(?:under|below|less\s+than|max)\s*₹?\s*(\d+)/i);
  if (maxPriceMatch) filters.maxPrice = Number(maxPriceMatch[1]);

  // Extract candidate query words (e.g. "naruto", "xyz quantum hoverboard")
  let cleanQuery = text
    .replace(/\b(do\s+you\s+sell|do\s+you\s+have|can\s+i\s+get|what\s+about|find|show\s+me|show|search|products?|items?|please|is\s+there|tell\s+me\s+about)\b/gi, "")
    .replace(/\b(under|below|above|less\s+than|more\s+than)\s*₹?\s*\d+\b/gi, "")
    .replace(/\b(stickers?|badges?)\b/gi, "")
    .replace(/[?.,!]/g, "")
    .trim();

  if (filters.category) {
    cleanQuery = cleanQuery.replace(new RegExp(`\\b${filters.category}\\b`, "gi"), "").trim();
  }

  if (cleanQuery && cleanQuery.length > 2) {
    filters.query = cleanQuery;
  }

  // Only return filters if at least one meaningful filter is detected
  if (!filters.query && !filters.category && !filters.type && !filters.maxPrice) {
    return null;
  }

  return filters;
}

/**
 * Main AI Chat provider abstraction:
 * 1. Checks fast-path for deterministic FAQs, order lookup, cart summary, price/availability, and direct search (< 50ms).
 * 2. If conversational / complex, pre-fetches real candidate products from MongoDB.
 * 3. Calls Gemini (gemini-3.5-flash-lite) in a single fast turn (< 800ms).
 * 4. Falls back to Groq if Gemini hits quota/outage.
 *
 * @param {string} message - Sanitized customer input string
 * @param {Object} [options]
 * @param {string} [options.userId] - Authenticated user ID
 * @param {Array} [options.history] - Conversation history window
 * @returns {Promise<{ reply: string, products: Array<Object>, provider: string }>}
 */
async function generateAIChatResponse(message, options = {}) {
  const totalStart = Date.now();

  // 1. Check Fast-Path first (< 50ms)
  try {
    const fastPathResult = await tryFastPath(message, options);
    if (fastPathResult) {
      console.log(`[AIService] Fast-path satisfied request in ${Date.now() - totalStart}ms`);
      return {
        ...fastPathResult,
        provider: "fast-path",
        latencyMs: Date.now() - totalStart,
      };
    }
  } catch (fpError) {
    console.error("[AIService] Fast-path evaluation error (falling through to AI):", fpError.message || fpError);
  }

  // 2. Pre-fetch candidate products to avoid second tool-call turn
  let candidateProducts = [];
  try {
    const candidateFilters = extractCandidateSearchFilters(message, options.history);
    if (candidateFilters) {
      const dbStart = Date.now();
      candidateProducts = await searchProducts(candidateFilters, 6);
      console.log(`[AIService] Candidate products pre-fetch took ${Date.now() - dbStart}ms (found ${candidateProducts.length})`);
    }
  } catch (searchErr) {
    console.error("[AIService] Pre-fetch candidate error:", searchErr.message || searchErr);
  }

  const aiOptions = {
    ...options,
    candidateProducts,
  };

  // 3. Call primary AI: Gemini (gemini-3.5-flash-lite)
  const aiStart = Date.now();
  try {
    const result = await geminiService.generateChatResponse(message, aiOptions);
    console.log(`[AIService] Gemini complete response in ${Date.now() - aiStart}ms. Total: ${Date.now() - totalStart}ms`);
    return {
      ...result,
      provider: "gemini",
      latencyMs: Date.now() - totalStart,
    };
  } catch (geminiError) {
    if (isTransientGeminiError(geminiError)) {
      console.warn(
        `[AIService] Gemini transient failure (${geminiError.status || geminiError.message || "transient"}). Falling back to Groq...`
      );

      try {
        const groqStart = Date.now();
        const groqResult = await groqService.generateGroqChatResponse(message, aiOptions);
        console.log(`[AIService] Groq fallback completed in ${Date.now() - groqStart}ms. Total: ${Date.now() - totalStart}ms`);
        return {
          ...groqResult,
          provider: "groq",
          latencyMs: Date.now() - totalStart,
        };
      } catch (groqError) {
        console.error("[AIService] Groq fallback also failed:", groqError.message || groqError);
        const combinedError = new Error("Both AI providers failed");
        combinedError.isAllProvidersFailed = true;
        throw combinedError;
      }
    }

    // Non-transient error; do not blind-fallback
    console.error("[AIService] Non-transient Gemini error:", geminiError.message || geminiError);
    throw geminiError;
  }
}

/**
 * Streaming response handler.
 * For fast-path: emits the answer immediately.
 * For AI: streams tokens progressively as they arrive from Gemini or Groq.
 *
 * @param {string} message
 * @param {Object} options
 * @param {Function} onChunk - Callback for each text token/chunk
 * @returns {Promise<Object>} Full response payload on completion
 */
async function streamAIChatResponse(message, options = {}, onChunk = () => {}) {
  const totalStart = Date.now();

  // 1. Fast-path check
  try {
    const fastPathResult = await tryFastPath(message, options);
    if (fastPathResult) {
      console.log(`[AIService-Stream] Fast-path matched in ${Date.now() - totalStart}ms`);
      if (fastPathResult.reply) {
        onChunk(fastPathResult.reply);
      }
      return {
        ...fastPathResult,
        provider: "fast-path",
        latencyMs: Date.now() - totalStart,
      };
    }
  } catch (fpError) {
    console.error("[AIService-Stream] Fast-path error:", fpError.message || fpError);
  }

  // 2. Pre-fetch candidate products
  let candidateProducts = [];
  try {
    const candidateFilters = extractCandidateSearchFilters(message, options.history);
    if (candidateFilters) {
      candidateProducts = await searchProducts(candidateFilters, 6);
    }
  } catch (searchErr) {
    console.error("[AIService-Stream] Candidate search error:", searchErr.message || searchErr);
  }

  const aiOptions = {
    ...options,
    candidateProducts,
  };

  // 3. Primary streaming: Gemini
  try {
    const result = await geminiService.generateChatStreamResponse(message, aiOptions, onChunk);
    return {
      ...result,
      provider: "gemini",
      latencyMs: Date.now() - totalStart,
    };
  } catch (geminiError) {
    if (isTransientGeminiError(geminiError)) {
      console.warn("[AIService-Stream] Gemini failed, streaming from Groq fallback...");
      try {
        const groqResult = await groqService.generateGroqChatStreamResponse(message, aiOptions, onChunk);
        return {
          ...groqResult,
          provider: "groq",
          latencyMs: Date.now() - totalStart,
        };
      } catch (groqError) {
        console.error("[AIService-Stream] Groq streaming fallback failed:", groqError.message || groqError);
        throw groqError;
      }
    }
    throw geminiError;
  }
}

module.exports = {
  generateAIChatResponse,
  streamAIChatResponse,
  isTransientGeminiError,
  extractCandidateSearchFilters,
};
