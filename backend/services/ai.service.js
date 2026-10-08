const geminiService = require("./gemini.service");
const groqService = require("./groq.service");

/**
 * Determines whether an error thrown by Gemini represents a transient,
 * quota, rate-limit, or temporary provider outage eligible for Groq fallback.
 *
 * Programming errors, validation errors, or invalid API keys do not trigger fallback.
 *
 * @param {Error|any} error
 * @returns {boolean}
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
 * Main AI Chat provider abstraction:
 * 1. Tries primary provider: Gemini (gemini-3.1-flash-lite).
 * 2. If Gemini succeeds, Groq is NOT called.
 * 3. If Gemini encounters rate limits (429), quota exhaustion, or temporary 5xx errors,
 *    automatically falls back to Groq (openai/gpt-oss-20b).
 * 4. Preserves identical product-search and response format across both providers.
 *
 * @param {string} message - Sanitized customer input string
 * @returns {Promise<{ reply: string, products: Array<Object>, provider: string }>}
 */
async function generateAIChatResponse(message, options = {}) {
  try {
    const result = await geminiService.generateChatResponse(message, options);
    return {
      ...result,
      provider: "gemini",
    };
  } catch (geminiError) {
    if (isTransientGeminiError(geminiError)) {
      console.warn(
        `[AIService] Gemini temporary failure (${geminiError.status || geminiError.message || "transient"}). Falling back to Groq...`
      );

      try {
        const groqResult = await groqService.generateGroqChatResponse(message, options);
        return {
          ...groqResult,
          provider: "groq",
        };
      } catch (groqError) {
        console.error(
          `[AIService] Groq fallback also failed:`,
          groqError.message || groqError
        );
        const combinedError = new Error("Both AI providers failed");
        combinedError.isAllProvidersFailed = true;
        throw combinedError;
      }
    }

    // Non-transient error (e.g. bad parameters or programmer error); do not blind-fallback
    console.error("[AIService] Non-transient Gemini error:", geminiError.message || geminiError);
    throw geminiError;
  }
}

module.exports = {
  generateAIChatResponse,
  isTransientGeminiError,
};
