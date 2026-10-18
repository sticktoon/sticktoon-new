const { generateAIChatResponse, streamAIChatResponse } = require("../services/ai.service");

/**
 * Handle incoming customer chat message (Standard JSON API).
 * POST /api/chat
 *
 * Request body:
 * {
 *   "message": "Show me anime stickers under 300",
 *   "history": [ { "role": "user", "content": "..." }, { "role": "assistant", "content": "..." } ]
 * }
 */
const handleChatMessage = async (req, res) => {
  const reqStart = Date.now();
  try {
    const { message, history } = req.body || {};

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const userId = req.user ? req.user._id || req.user.id : null;
    const historyList = Array.isArray(history) ? history : [];

    const { reply, products, cart, orders, provider } = await generateAIChatResponse(
      message.trim(),
      { userId, history: historyList }
    );

    const totalDuration = Date.now() - reqStart;
    res.setHeader("X-Response-Time-Ms", String(totalDuration));

    return res.status(200).json({
      success: true,
      reply: reply || "",
      products: Array.isArray(products) ? products : [],
      cart: cart || null,
      ...(Array.isArray(orders) && orders.length > 0 ? { orders } : {}),
      provider,
      latencyMs: totalDuration,
    });
  } catch (error) {
    console.error("Chatbot Controller Error:", error.message || error);
    return res.status(503).json({
      success: false,
      message: "AI assistant is temporarily unavailable. Please try again later.",
    });
  }
};

/**
 * Handle streaming chat responses via Server-Sent Events (SSE).
 * POST /api/chat/stream
 */
const handleChatStream = async (req, res) => {
  const reqStart = Date.now();
  try {
    const { message, history } = req.body || {};

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const userId = req.user ? req.user._id || req.user.id : null;
    const historyList = Array.isArray(history) ? history : [];

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    if (typeof res.flushHeaders === "function") {
      res.flushHeaders();
    }

    const onChunk = (chunkText) => {
      res.write(`data: ${JSON.stringify({ type: "chunk", text: chunkText })}\n\n`);
    };

    const finalResult = await streamAIChatResponse(
      message.trim(),
      { userId, history: historyList },
      onChunk
    );

    const totalDuration = Date.now() - reqStart;
    res.write(
      `data: ${JSON.stringify({
        type: "done",
        reply: finalResult.reply || "",
        products: Array.isArray(finalResult.products) ? finalResult.products : [],
        cart: finalResult.cart || null,
        orders: Array.isArray(finalResult.orders) ? finalResult.orders : [],
        provider: finalResult.provider,
        latencyMs: totalDuration,
      })}\n\n`
    );

    res.end();
  } catch (error) {
    console.error("Chatbot Stream Error:", error.message || error);
    if (!res.headersSent) {
      return res.status(503).json({
        success: false,
        message: "AI assistant is temporarily unavailable.",
      });
    }
    res.write(
      `data: ${JSON.stringify({
        type: "error",
        message: "AI assistant is temporarily unavailable. Please try again later.",
      })}\n\n`
    );
    res.end();
  }
};

module.exports = {
  handleChatMessage,
  handleChatStream,
};
