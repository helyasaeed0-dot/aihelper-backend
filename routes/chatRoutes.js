const express = require("express");
const router = express.Router();
const { chat } = require("../controllers/chatController");

// POST /api/chat
// Ye route PUBLIC hai (protected nahi) - kyunki customer login nahi karta,
// wo seedha business ki website se chatbot use karega
router.post("/", chat);

module.exports = router;