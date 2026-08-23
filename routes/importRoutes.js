const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { importFromWebsite } = require("../controllers/importController");

// POST /api/import/website
router.post("/website", authMiddleware, importFromWebsite);

module.exports = router;