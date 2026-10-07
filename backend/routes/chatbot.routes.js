const express = require("express");
const router = express.Router();
const optionalAuth = require("../middleware/optionalAuth");
const { handleChatMessage } = require("../controllers/chatbot.controller");

router.post("/", optionalAuth, handleChatMessage);

module.exports = router;
