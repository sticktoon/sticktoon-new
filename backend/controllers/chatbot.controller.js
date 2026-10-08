const { generateAIChatResponse } = require("../services/ai.service");

/**
 * Handle incoming customer chat message.
 * POST /api/chat
 *
 * Request body:
 * { "message": "Show me anime stickers under 300" }
 *
 * Response body (Success):
 * {
 *   "success": true,
 *   "reply": "...",
 *   "products": [...]
 * }
 *
 * Response body (Failure):
 * {
 *   "success": false,
 *   "message": "AI assistant is temporarily unavailable. Please try again later."
 * }
 */
const handleChatMessage = async (req, res) => {
  try {
    const { message } = req.body || {};

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const userId = req.user ? (req.user._id || req.user.id) : null;
    const { reply, products, cart, orders } = await generateAIChatResponse(message.trim(), { userId });

    return res.status(200).json({
      success: true,
      reply: reply || "",
      products: Array.isArray(products) ? products : [],
      cart: cart || null,
      ...(Array.isArray(orders) && orders.length > 0 ? { orders } : {}),
    });
  } catch (error) {
    // Log internal error with stack/message for backend debugging
    console.error("Chatbot Controller Error:", error.message || error);

    // Return friendly, non-sensitive error to the client
    return res.status(503).json({
      success: false,
      message: "AI assistant is temporarily unavailable. Please try again later.",
    });
  }
};

module.exports = {
  handleChatMessage,
};
