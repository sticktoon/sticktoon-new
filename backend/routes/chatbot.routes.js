const express = require("express");
const router = express.Router();
const optionalAuth = require("../middleware/optionalAuth");
const { handleChatMessage, handleChatStream } = require("../controllers/chatbot.controller");

router.post("/", optionalAuth, handleChatMessage);
router.post("/stream", optionalAuth, handleChatStream);

module.exports = router;
