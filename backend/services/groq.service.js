const Groq = require("groq-sdk");
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

const DEFAULT_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

let groqClient = null;

function getClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured in backend environment");
  }

  if (!groqClient) {
    groqClient = new Groq({ apiKey });
  }

  return groqClient;
}

const GROQ_TOOLS = [
  {
    type: "function",
    function: {
      name: "searchProducts",
      description: "Search the store catalog. Use this whenever the customer asks to find or look for products.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Keywords to search in title, description, or tags." },
          category: { type: "string", description: "Product category name." },
          type: { type: "string", description: "Product type: 'badge' or 'sticker'." },
          minPrice: { type: "number", description: "Minimum price in INR." },
          maxPrice: { type: "number", description: "Maximum price in INR." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "addToCart",
      description: "Add a product to cart using its real MongoDB productId.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string", description: "The actual MongoDB ObjectId." },
          quantity: { type: "number", description: "Quantity to add (default 1)." },
        },
        required: ["productId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "removeFromCart",
      description: "Remove a product from cart using its productId.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string", description: "The actual MongoDB ObjectId of the product in cart." },
        },
        required: ["productId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getCart",
      description: "Get customer's current cart contents, total items, and total price.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "updateCartQuantity",
      description: "Update the quantity of a product currently in the customer's cart.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string", description: "The actual MongoDB ObjectId." },
          quantity: { type: "number", description: "The new quantity." },
        },
        required: ["productId", "quantity"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getMyOrders",
      description: "Retrieve recent orders placed by the customer.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "getOrderDetails",
      description: "Retrieve full details and items of a specific order.",
      parameters: {
        type: "object",
        properties: {
          orderId: { type: "string", description: "Order ID or order number." },
        },
        required: ["orderId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getOrderStatus",
      description: "Check the fulfillment and delivery status of a specific order.",
      parameters: {
        type: "object",
        properties: {
          orderId: { type: "string", description: "Order ID or order number." },
        },
        required: ["orderId"],
      },
    },
  },
];

function buildGroqMessages(message, history = [], candidateProducts = []) {
  let systemPrompt = SYSTEM_INSTRUCTION;
  if (Array.isArray(candidateProducts) && candidateProducts.length > 0) {
    systemPrompt += `\n\nACTUAL STORE PRODUCTS MATCHING INQUIRY (RECOMMEND ONLY FROM THIS LIST, NEVER INVENT PRODUCTS):\n`;
    candidateProducts.forEach((p, idx) => {
      systemPrompt += `${idx + 1}. "${p.name}" | Type: ${p.type} | Price: ₹${p.price} | Stock: ${
        p.stock > 0 ? p.stock + " available" : "Out of stock"
      } | Category: ${p.category}\n`;
    });
  }

  const messages = [{ role: "system", content: systemPrompt }];

  if (Array.isArray(history) && history.length > 0) {
    const recent = history.slice(-6);
    for (const h of recent) {
      if (h && typeof h.content === "string" && h.content.trim()) {
        const role = h.role === "assistant" || h.role === "bot" ? "assistant" : "user";
        messages.push({ role, content: h.content.trim() });
      }
    }
  }

  messages.push({ role: "user", content: message });
  return messages;
}

/**
 * Send customer message to Groq.
 */
async function generateGroqChatResponse(
  message,
  { userId = null, history = [], candidateProducts = [] } = {}
) {
  const overallStart = Date.now();
  const groq = getClient();
  const model = process.env.GROQ_MODEL || DEFAULT_MODEL;

  const messages = buildGroqMessages(message, history, candidateProducts);
  let lastProducts = Array.isArray(candidateProducts) && candidateProducts.length > 0 ? candidateProducts : [];
  let lastCart = null;
  let lastOrders = [];
  const maxTurns = 3;

  for (let turn = 0; turn < maxTurns; turn++) {
    const turnStart = Date.now();
    const completion = await groq.chat.completions.create({
      model,
      messages,
      tools: GROQ_TOOLS,
      tool_choice: "auto",
      temperature: 0.5,
    });

    console.log(`[GroqService] Turn ${turn + 1} took ${Date.now() - turnStart}ms`);

    const choice = completion.choices && completion.choices[0];
    const responseMessage = choice ? choice.message : null;
    if (!responseMessage) break;

    messages.push(responseMessage);

    const toolCalls = responseMessage.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      let replyText = responseMessage.content || "";
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

      console.log(`[GroqService] Complete response generated in ${Date.now() - overallStart}ms`);

      return {
        reply: stripMarkdown(replyText),
        products: lastProducts,
        cart: lastCart,
        ...(lastOrders.length > 0 ? { orders: lastOrders } : {}),
      };
    }

    // Process tool calls
    for (const toolCall of toolCalls) {
      let toolArgs = {};
      try {
        toolArgs = JSON.parse(toolCall.function.arguments || "{}");
      } catch (e) {
        toolArgs = {};
      }

      let toolResult = {};
      try {
        if (toolCall.function.name === "searchProducts") {
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
        } else if (toolCall.function.name === "addToCart") {
          const res = await cartService.addToCart({
            userId,
            productId: toolArgs.productId,
            quantity: toolArgs.quantity,
          });
          if (res.cart) lastCart = res.cart;
          toolResult = res;
        } else if (toolCall.function.name === "removeFromCart") {
          const res = await cartService.removeFromCart({
            userId,
            productId: toolArgs.productId,
          });
          if (res.cart) lastCart = res.cart;
          toolResult = res;
        } else if (toolCall.function.name === "getCart") {
          const res = await cartService.getCart({ userId });
          if (res.success) lastCart = res;
          toolResult = res;
        } else if (toolCall.function.name === "updateCartQuantity") {
          const res = await cartService.updateCartQuantity({
            userId,
            productId: toolArgs.productId,
            quantity: toolArgs.quantity,
          });
          if (res.cart) lastCart = res.cart;
          toolResult = res;
        } else if (toolCall.function.name === "getMyOrders") {
          const res = await orderService.getMyOrders({ userId });
          if (res.orders && res.orders.length > 0) {
            lastOrders = res.orders;
          }
          toolResult = res;
        } else if (toolCall.function.name === "getOrderDetails") {
          const res = await orderService.getOrderDetails({
            userId,
            orderId: toolArgs.orderId,
          });
          if (res.order) {
            lastOrders = [res.order];
          }
          toolResult = res;
        } else if (toolCall.function.name === "getOrderStatus") {
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
        console.error(`Groq tool execution error in ${toolCall.function.name}:`, err.message || err);
        toolResult = { error: "EXECUTION_ERROR", message: err.message };
      }

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolResult),
      });
    }
  }

  const fallbackReply = lastOrders.length > 0
    ? `I found ${lastOrders.length === 1 ? "your order" : "your recent orders"}.`
    : lastCart
    ? `Your cart currently has ${lastCart.totalItems || 0} item${lastCart.totalItems === 1 ? "" : "s"}.`
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
 * Generate streaming response with Groq.
 */
async function generateGroqChatStreamResponse(
  message,
  { userId = null, history = [], candidateProducts = [] } = {},
  onChunk = () => {}
) {
  const overallStart = Date.now();
  const groq = getClient();
  const model = process.env.GROQ_MODEL || DEFAULT_MODEL;

  const messages = buildGroqMessages(message, history, candidateProducts);
  const lastProducts = Array.isArray(candidateProducts) && candidateProducts.length > 0 ? candidateProducts : [];

  let firstTokenReceived = false;
  let fullReply = "";

  try {
    const stream = await groq.chat.completions.create({
      model,
      messages,
      temperature: 0.5,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        if (!firstTokenReceived) {
          firstTokenReceived = true;
          console.log(`[GroqService] Time to first token: ${Date.now() - overallStart}ms`);
        }
        fullReply += content;
        onChunk(stripMarkdown(content));
      }
    }

    const cleanReply = stripMarkdown(fullReply);
    console.log(`[GroqService] Total streaming time: ${Date.now() - overallStart}ms`);

    return {
      reply: cleanReply || "Here are some products from our catalog.",
      products: lastProducts,
      cart: null,
    };
  } catch (err) {
    console.error("[GroqService] Streaming error, falling back to generateGroqChatResponse:", err.message);
    const fallbackRes = await generateGroqChatResponse(message, { userId, history, candidateProducts });
    onChunk(fallbackRes.reply);
    return fallbackRes;
  }
}

module.exports = {
  generateGroqChatResponse,
  generateGroqChatStreamResponse,
  SYSTEM_INSTRUCTION,
};
