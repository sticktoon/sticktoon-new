const { GoogleGenAI, Type } = require("@google/genai");
const { searchProducts } = require("./productSearch.service");
const cartService = require("./cart.service");
const orderService = require("./order.service");

/**
 * System instruction defining the chatbot's persona, responsibilities,
 * and boundary guardrails for customer support and shopping actions.
 */
const SYSTEM_INSTRUCTION = `You are the AI shopping assistant for our e-commerce website (StickToon).

Your responsibilities:
- Help customers with questions about the website, badges, and stickers.
- Answer general customer-support questions.
- Help customers understand how to use the website.
- Be friendly, concise, and helpful.

FORMATTING RULES (PLAIN TEXT ONLY):
- Return customer-facing responses as clean plain text.
- Do not use Markdown formatting.
- Do not use ** for bold text.
- Do not use * for bullet points.
- Do not use __, ~~ or backticks.
- Do not output Markdown syntax.
- Use normal sentences and numbered lists only when necessary.
- For lists, use simple line breaks or numbered items without Markdown.
- Product information must be rendered by the frontend product cards, not repeated in the AI response.
- Order details must be rendered by the frontend order cards, not repeated in the AI response.

PRODUCT SEARCH & CART ACTIONS:
- When customers search, ask for, or inquire about products, call searchProducts to find actual products.
- When customers want to add a product to their cart:
  - If you already have the real MongoDB productId from a previous search or context, call addToCart with that productId.
  - If you do NOT have the exact productId, you MUST call searchProducts first to find the product and retrieve its real ID.
  - If searchProducts returns multiple matching products, do NOT guess or pick randomly. Ask: "Which one would you like me to add?"
- When customers want to remove an item, call removeFromCart. If you don't have the productId, call getCart first to identify the item.
- When customers ask what is in their cart, say "What's in my cart?", or want to view their cart, call getCart.
- When customers want to change or update quantity, call updateCartQuantity.

ORDER ASSISTANCE & ORDER TRACKING:
- When the customer asks about their orders, order status, or tracking:
  - If the customer does NOT provide an order ID (e.g. 'Where is my order?', 'What is my order status?', 'Show me my recent orders', 'What happened to my order?', 'My order hasn\\'t arrived yet', 'When will my order arrive?'):
    - First call getMyOrders to retrieve their recent orders.
    - If they have exactly one recent order, acknowledge that order and state its status.
    - If they have multiple recent orders, say "I found several recent orders. Which one would you like to check?" and briefly mention them.
    - If they have no orders, say "I couldn't find any orders in your account."
  - For "What's the status of my latest order?", call getMyOrders and refer to the most recent order.
  - If the customer explicitly provides an order ID (e.g. "What is the status of order 12345?", "Show me order #12345"):
    - Call getOrderStatus or getOrderDetails with that orderId.
    - If the order is not found in their account, return "I couldn't find that order in your account."
  - If the customer asks "What did I order?", call getOrderDetails to inspect the items.
  - For delivery dates: If estimated delivery is not available, say "An estimated delivery date is not available yet." Do not invent delivery dates.
  - For tracking: If tracking information is not available, say "Tracking information is not available for this order yet." Do not invent tracking numbers or URLs.
  - Convert technical database status to customer-friendly terms:
    - delivered: "Your order has been delivered."
    - shipped: "Your order has been shipped and is currently on its way."
    - confirmed: "Your order is confirmed and is being processed."
    - cancelled: "Your order has been cancelled."
    - pending: "Your order is pending payment."
  - Keep AI text responses short and conversational because the frontend will render a structured order card. Do not list all items, prices, and totals in text when an order card will display.
  - If the user is not logged in and an order operation fails with an authentication message, politely ask the customer to log in.

CRITICAL RULES:
- Never invent product information, prices, stock availability, or product names.
- Never invent product IDs. All product IDs must come from searchProducts or getCart.
- Never invent order details or order totals.
- For search queries: DO NOT list individual products in text. Return a single short introductory sentence (e.g., "I found some anime stickers that match your search.").
- For cart actions: Keep response short, conversational, and in plain text without Markdown (e.g., "Done! I've added the Naruto Sticker to your cart.", "Done! I've removed the Naruto Sticker from your cart.", "Your cart currently has 2 items."). Never use bold formatting like **Done!** or **3 items**.
- If a product is out of stock or requested quantity exceeds available stock, report the exact available stock returned by the tool.
- If the user is not logged in and a cart operation fails with an authentication message, politely ask the customer to log in.`;

/**
 * Strip raw markdown markers (**, *, __, ~~, `, bullet markers) from AI text response.
 * Defense-in-depth to guarantee clean plain-text output.
 *
 * @param {string} text
 * @returns {string}
 */
function stripMarkdown(text) {
  if (!text || typeof text !== "string") return "";
  return text
    // Remove bold/italic markers
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    // Remove strikethrough
    .replace(/~~(.*?)~~/g, "$1")
    // Remove inline backticks
    .replace(/`([^`]+)`/g, "$1")
    // Remove bullet point markers at line beginnings
    .replace(/^[\s]*[\*\-]\s+/gm, "")
    // Remove single asterisk/underscore italics around words
    .replace(/(^|\s)\*([^\*\s]+)\*(\s|$)/g, "$1$2$3")
    .replace(/(^|\s)_([^_\s]+)_(\s|$)/g, "$1$2$3")
    .trim();
}

// Default to Gemini 3.1 Flash Lite for ultra-fast conversational and tool-calling responses
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

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
        description: `Search the store's actual product catalog.

Use this tool whenever the customer asks to find, search, show, recommend, or look for products.

Never invent products. Only products returned by this tool exist in the store.`,
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: {
              type: Type.STRING,
              description: "Keywords to search in product title, description, or tags (e.g. 'anime', 'naruto', 'gaming', 'black', 'couple').",
            },
            category: {
              type: Type.STRING,
              description: "Product category name (e.g. 'Anime', 'Sports', 'Moody', 'sticker-pack', 'marvel', 'dc-universe', 'pet', 'cartoon', 'Positive Vibes').",
            },
            type: {
              type: Type.STRING,
              description: "Product type: 'badge' or 'sticker'.",
            },
            minPrice: {
              type: Type.NUMBER,
              description: "Minimum price in INR (e.g. 200).",
            },
            maxPrice: {
              type: Type.NUMBER,
              description: "Maximum price in INR (e.g. 300).",
            },
          },
        },
      },
      {
        name: "addToCart",
        description: `Add a specific product to the customer's cart. You must provide the exact MongoDB productId.
If you do not have the real productId, you MUST call searchProducts first to find the product and retrieve its actual ID.
If searchProducts returns multiple matches, do not guess; ask the customer which one they would like to add.`,
        parameters: {
          type: Type.OBJECT,
          properties: {
            productId: {
              type: Type.STRING,
              description: "The actual MongoDB ObjectId of the product.",
            },
            quantity: {
              type: Type.NUMBER,
              description: "Quantity to add (default 1).",
            },
          },
          required: ["productId"],
        },
      },
      {
        name: "removeFromCart",
        description: `Remove a product from the customer's cart using its productId.
If you do not know the productId, call getCart or searchProducts first to identify the item.`,
        parameters: {
          type: Type.OBJECT,
          properties: {
            productId: {
              type: Type.STRING,
              description: "The actual MongoDB ObjectId of the product in the cart.",
            },
          },
          required: ["productId"],
        },
      },
      {
        name: "getCart",
        description: `Get the customer's current shopping cart contents, total items, and total price.
Use this when the customer asks "What's in my cart?", "Show my cart", or wants to view their cart.`,
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
      {
        name: "updateCartQuantity",
        description: `Update the quantity of a product currently in the customer's cart.
If quantity is 0, the item will be removed.`,
        parameters: {
          type: Type.OBJECT,
          properties: {
            productId: {
              type: Type.STRING,
              description: "The actual MongoDB ObjectId of the product.",
            },
            quantity: {
              type: Type.NUMBER,
              description: "The new quantity (must be positive integer, or 0 to remove).",
            },
          },
          required: ["productId", "quantity"],
        },
      },
      {
        name: "getMyOrders",
        description: `Retrieve the authenticated customer's recent orders from the store. Call this when the customer asks "Where is my order?", "What is my order status?", "Show me my recent orders", "What's the status of my latest order?", or asks about their orders without specifying an order ID.`,
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
      {
        name: "getOrderDetails",
        description: `Retrieve full details and items of a specific order belonging to the authenticated customer using its order ID. Call this when the customer asks "What did I order?" or asks about a specific order ID.`,
        parameters: {
          type: Type.OBJECT,
          properties: {
            orderId: {
              type: Type.STRING,
              description: "The order ID or order number provided by the customer.",
            },
          },
          required: ["orderId"],
        },
      },
      {
        name: "getOrderStatus",
        description: `Check the fulfillment and delivery status of a specific order belonging to the authenticated customer.`,
        parameters: {
          type: Type.OBJECT,
          properties: {
            orderId: {
              type: Type.STRING,
              description: "The order ID or order number provided by the customer.",
            },
          },
          required: ["orderId"],
        },
      },
    ],
  },
];

/**
 * Execute tools and handle multi-turn function calling with Gemini.
 *
 * @param {string} message - Customer message
 * @param {Object} [options]
 * @param {string} [options.userId] - Authenticated user ID (null for guests)
 * @returns {Promise<{ reply: string, products: Array<Object>, cart: Object|null }>}
 */
async function generateChatResponse(message, { userId = null } = {}) {
  const ai = getClient();
  const contents = [{ role: "user", parts: [{ text: message }] }];

  let lastProducts = [];
  let lastCart = null;
  let lastOrders = [];
  const maxTurns = 5;

  for (let turn = 0; turn < maxTurns; turn++) {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: GEMINI_TOOLS,
        temperature: 0.7,
      },
    });

    const candidate = response.candidates?.[0]?.content;
    if (!candidate) break;
    contents.push(candidate);

    const functionCalls = response.functionCalls;

    // No further tool calls: we have our final text answer
    if (!functionCalls || functionCalls.length === 0) {
      let replyText = response.text || "";
      if (!replyText.trim()) {
        if (lastOrders.length > 0) {
          replyText = `I found ${lastOrders.length === 1 ? "your order" : "your recent orders"}.`;
        } else if (lastCart) {
          replyText = `Your cart currently has ${lastCart.totalItems || 0} item${lastCart.totalItems === 1 ? "" : "s"}.`;
        } else if (lastProducts.length > 0) {
          replyText = "I found some products that match your search.";
        } else {
          replyText = "I couldn't find any products matching your search. Try a different keyword or price range.";
        }
      }

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
    ? "I found some products that match your search."
    : "I couldn't find any products matching your search. Try a different keyword or price range.";

  return {
    reply: stripMarkdown(fallbackReply),
    products: lastProducts,
    cart: lastCart,
    ...(lastOrders.length > 0 ? { orders: lastOrders } : {}),
  };
}

module.exports = {
  generateChatResponse,
  SYSTEM_INSTRUCTION,
};
