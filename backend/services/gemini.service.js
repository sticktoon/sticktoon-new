const { GoogleGenAI, Type } = require("@google/genai");
const { searchProducts } = require("./productSearch.service");
const cartService = require("./cart.service");
const orderService = require("./order.service");

/**
 * Streamlined system instruction defining persona and strict accuracy boundaries.
 */
const SYSTEM_INSTRUCTION = `You are the shopping assistant for StickToon (stickers & pin badges store).
Respond concisely in plain text (no markdown formatting, no bold **, no bullet points *).

CRITICAL ACCURACY RULES:
- Never hallucinate products, prices, stock, discounts, delivery dates, or orders.
- Recommend ONLY products that exist in our store catalog. If a product is not available, clearly state that we do not have it.
- Keep responses friendly, brief (1-3 sentences), and natural. Frontend renders visual cards for products, cart, and orders.`;

/**
 * Strip raw markdown markers from AI text response.
 */
function stripMarkdown(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^[\s]*[\*\-]\s+/gm, "")
    .replace(/(^|\s)\*([^\*\s]+)\*(\s|$)/g, "$1$2$3")
    .replace(/(^|\s)_([^_\s]+)_(\s|$)/g, "$1$2$3")
    .trim();
}

// Default to Gemini 3.5 Flash Lite for ultra-fast generation (< 800ms)
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

let aiClient = null;

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in backend environment");
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }

  return aiClient;
}

const GEMINI_TOOLS = [
  {
    functionDeclarations: [
      {
        name: "searchProducts",
        description: "Search the store catalog. Use this whenever the customer asks to find or look for products.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: { type: Type.STRING, description: "Keywords to search in title, description, or tags." },
            category: { type: Type.STRING, description: "Product category name." },
            type: { type: Type.STRING, description: "Product type: 'badge' or 'sticker'." },
            minPrice: { type: Type.NUMBER, description: "Minimum price in INR." },
            maxPrice: { type: Type.NUMBER, description: "Maximum price in INR." },
          },
        },
      },
      {
        name: "addToCart",
        description: "Add a product to cart using its real MongoDB productId.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            productId: { type: Type.STRING, description: "The actual MongoDB ObjectId." },
            quantity: { type: Type.NUMBER, description: "Quantity to add (default 1)." },
          },
          required: ["productId"],
        },
      },
      {
        name: "removeFromCart",
        description: "Remove a product from cart using its productId.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            productId: { type: Type.STRING, description: "The actual MongoDB ObjectId of the product in cart." },
          },
          required: ["productId"],
        },
      },
      {
        name: "getCart",
        description: "Get customer's current cart contents, total items, and total price.",
        parameters: { type: Type.OBJECT, properties: {} },
      },
      {
        name: "updateCartQuantity",
        description: "Update the quantity of a product currently in the customer's cart.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            productId: { type: Type.STRING, description: "The actual MongoDB ObjectId." },
            quantity: { type: Type.NUMBER, description: "The new quantity." },
          },
          required: ["productId", "quantity"],
        },
      },
      {
        name: "getMyOrders",
        description: "Retrieve recent orders placed by the customer.",
        parameters: { type: Type.OBJECT, properties: {} },
      },
      {
        name: "getOrderDetails",
        description: "Retrieve full details and items of a specific order.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            orderId: { type: Type.STRING, description: "Order ID or order number." },
          },
          required: ["orderId"],
        },
      },
      {
        name: "getOrderStatus",
        description: "Check the fulfillment and delivery status of a specific order.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            orderId: { type: Type.STRING, description: "Order ID or order number." },
          },
          required: ["orderId"],
        },
      },
    ],
  },
];

/**
 * Format conversation history and prompt for Gemini
 */
function buildGeminiContents(message, history = []) {
  const contents = [];
  if (Array.isArray(history) && history.length > 0) {
    // Keep a sliding window of the last 6 messages
    const recent = history.slice(-6);
    for (const h of recent) {
      if (h && typeof h.content === "string" && h.content.trim()) {
        const role = h.role === "assistant" || h.role === "bot" ? "model" : "user";
        contents.push({
          role,
          parts: [{ text: h.content.trim() }],
        });
      }
    }
  }

  // Ensure current message is at the end
  contents.push({ role: "user", parts: [{ text: message }] });
  return contents;
}

/**
 * Build dynamic system instructions including pre-fetched candidate products
 */
function buildSystemInstruction(candidateProducts = []) {
  let prompt = SYSTEM_INSTRUCTION;
  if (Array.isArray(candidateProducts) && candidateProducts.length > 0) {
    prompt += `\n\nACTUAL STORE PRODUCTS MATCHING INQUIRY (RECOMMEND ONLY FROM THIS LIST, NEVER INVENT PRODUCTS):\n`;
    candidateProducts.forEach((p, idx) => {
      prompt += `${idx + 1}. "${p.name}" | Type: ${p.type} | Price: ₹${p.price} | Stock: ${
        p.stock > 0 ? p.stock + " available" : "Out of stock"
      } | Category: ${p.category}\n`;
    });
  }
  return prompt;
}

/**
 * Execute tools and handle conversational responses with Gemini.
 *
 * @param {string} message - Customer message
 * @param {Object} [options]
 * @param {string} [options.userId] - Authenticated user ID
 * @param {Array} [options.history] - Prior messages in sliding window
 * @param {Array} [options.candidateProducts] - Pre-fetched products from catalog
 * @returns {Promise<{ reply: string, products: Array<Object>, cart: Object|null }>}
 */
async function generateChatResponse(message, { userId = null, history = [], candidateProducts = [] } = {}) {
  const overallStart = Date.now();
  const ai = getClient();
  const contents = buildGeminiContents(message, history);
  const systemInstruction = buildSystemInstruction(candidateProducts);

  let lastProducts = Array.isArray(candidateProducts) && candidateProducts.length > 0 ? candidateProducts : [];
  let lastCart = null;
  let lastOrders = [];
  const maxTurns = 3;

  for (let turn = 0; turn < maxTurns; turn++) {
    const turnStart = Date.now();
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents,
      config: {
        systemInstruction,
        tools: GEMINI_TOOLS,
        temperature: 0.5,
      },
    });

    console.log(`[GeminiService] Turn ${turn + 1} took ${Date.now() - turnStart}ms`);

    const candidate = response.candidates?.[0]?.content;
    if (!candidate) break;
    contents.push(candidate);

    const functionCalls = response.functionCalls;

    // No further tool calls: return final text answer
    if (!functionCalls || functionCalls.length === 0) {
      let replyText = response.text || "";
      if (!replyText.trim()) {
        if (lastOrders.length > 0) {
          replyText = `I found ${lastOrders.length === 1 ? "your order" : "your recent orders"}.`;
        } else if (lastCart) {
          replyText = `Your cart currently has ${lastCart.totalItems || 0} item${lastCart.totalItems === 1 ? "" : "s"}.`;
        } else if (lastProducts.length > 0) {
          replyText = "Here are the matching products from our catalog.";
        } else {
          replyText = "I couldn't find any products matching your search. Try a different keyword or price range.";
        }
      }

      console.log(`[GeminiService] Complete response generated in ${Date.now() - overallStart}ms`);

      return {
        reply: stripMarkdown(replyText),
        products: lastProducts,
        cart: lastCart,
        ...(lastOrders.length > 0 ? { orders: lastOrders } : {}),
      };
    }

    // Process function calls
    const responseParts = [];
    for (const call of functionCalls) {
      const toolArgs = call.args || {};
      let toolResult = {};

      try {
        if (call.name === "searchProducts") {
          const products = await searchProducts(toolArgs, 10);
          lastProducts = products;
          toolResult = {
            count: products.length,
            products: products.map((p) => ({
              id: p.id,
              name: p.name,
              price: p.price,
              type: p.type,
              category: p.category,
              stock: p.stock > 0 ? `${p.stock} available` : "Out of stock",
              availableStock: p.stock,
              description: p.description,
            })),
          };
        } else if (call.name === "addToCart") {
          const res = await cartService.addToCart({
            userId,
            productId: toolArgs.productId,
            quantity: toolArgs.quantity,
          });
          if (res.cart) lastCart = res.cart;
          toolResult = res;
        } else if (call.name === "removeFromCart") {
          const res = await cartService.removeFromCart({
            userId,
            productId: toolArgs.productId,
          });
          if (res.cart) lastCart = res.cart;
          toolResult = res;
        } else if (call.name === "getCart") {
          const res = await cartService.getCart({ userId });
          if (res.success) lastCart = res;
          toolResult = res;
        } else if (call.name === "updateCartQuantity") {
          const res = await cartService.updateCartQuantity({
            userId,
            productId: toolArgs.productId,
            quantity: toolArgs.quantity,
          });
          if (res.cart) lastCart = res.cart;
          toolResult = res;
        } else if (call.name === "getMyOrders") {
          const res = await orderService.getMyOrders({ userId });
          if (res.orders && res.orders.length > 0) {
            lastOrders = res.orders;
          }
          toolResult = res;
        } else if (call.name === "getOrderDetails") {
          const res = await orderService.getOrderDetails({
            userId,
            orderId: toolArgs.orderId,
          });
          if (res.order) {
            lastOrders = [res.order];
          }
          toolResult = res;
        } else if (call.name === "getOrderStatus") {
          const res = await orderService.getOrderStatus({
            userId,
            orderId: toolArgs.orderId,
          });
          if (res.order) {
            lastOrders = [res.order];
          }
          toolResult = res;
        } else {
          toolResult = { error: "UNKNOWN_TOOL", message: "Tool not found" };
        }
      } catch (err) {
        console.error(`Gemini tool execution error in ${call.name}:`, err.message || err);
        toolResult = { error: "EXECUTION_ERROR", message: err.message };
      }

      responseParts.push({
        functionResponse: {
          name: call.name,
          response: toolResult,
        },
      });
    }

    contents.push({
      role: "user",
      parts: responseParts,
    });
  }

  const fallbackReply = lastOrders.length > 0
    ? `I found ${lastOrders.length === 1 ? "your order" : "your recent orders"}.`
    : lastCart
    ? `Your cart has ${lastCart.totalItems || 0} item${lastCart.totalItems === 1 ? "" : "s"}.`
    : lastProducts.length > 0
    ? "Here are some matching products from our catalog."
    : "I couldn't find any products matching your search. Try a different keyword or price range.";

  return {
    reply: stripMarkdown(fallbackReply),
    products: lastProducts,
    cart: lastCart,
    ...(lastOrders.length > 0 ? { orders: lastOrders } : {}),
  };
}

/**
 * Generate streaming response with Gemini.
 * Streams text tokens as they arrive, returning full structured object on completion.
 */
async function generateChatStreamResponse(
  message,
  { userId = null, history = [], candidateProducts = [] } = {},
  onChunk = () => {}
) {
  const overallStart = Date.now();
  const ai = getClient();
  const contents = buildGeminiContents(message, history);
  const systemInstruction = buildSystemInstruction(candidateProducts);

  const lastProducts = Array.isArray(candidateProducts) && candidateProducts.length > 0 ? candidateProducts : [];

  let firstTokenReceived = false;
  let fullReply = "";

  try {
    const stream = await ai.models.generateContentStream({
      model: DEFAULT_MODEL,
      contents,
      config: {
        systemInstruction,
        temperature: 0.5,
      },
    });

    for await (const chunk of stream) {
      const chunkText = chunk.text || "";
      if (chunkText) {
        if (!firstTokenReceived) {
          firstTokenReceived = true;
          console.log(`[GeminiService] Time to first token: ${Date.now() - overallStart}ms`);
        }
        fullReply += chunkText;
        onChunk(stripMarkdown(chunkText));
      }
    }

    const cleanReply = stripMarkdown(fullReply);
    console.log(`[GeminiService] Total streaming time: ${Date.now() - overallStart}ms`);

    return {
      reply: cleanReply || "Here are some products from our catalog.",
      products: lastProducts,
      cart: null,
    };
  } catch (err) {
    console.error("[GeminiService] Streaming error, falling back to generateChatResponse:", err.message);
    const fallbackRes = await generateChatResponse(message, { userId, history, candidateProducts });
    onChunk(fallbackRes.reply);
    return fallbackRes;
  }
}

module.exports = {
  generateChatResponse,
  generateChatStreamResponse,
  SYSTEM_INSTRUCTION,
};
