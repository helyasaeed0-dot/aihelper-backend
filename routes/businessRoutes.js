const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  createBusiness,
  getMyBusiness,
  updateBusinessInfo,
  addProduct,
  deleteProduct,
  addFaq,
  deleteFaq,
  getLeads,
  getConversations,
  getAnalytics,
  getPublicSettings,
} = require("../controllers/businessController");

// Ye sab routes "protected" hain - authMiddleware pehle check karega
// ke login hai ya nahi, tabhi aage jayega

// POST /api/business  -> naya business banao
router.post("/", authMiddleware, createBusiness);

// GET /api/business  -> apna business data lo
router.get("/", authMiddleware, getMyBusiness);

// PUT /api/business  -> business info update karo
router.put("/", authMiddleware, updateBusinessInfo);

// POST /api/business/product  -> naya product add karo
router.post("/product", authMiddleware, addProduct);

// DELETE /api/business/product/:productId  -> product delete karo
router.delete("/product/:productId", authMiddleware, deleteProduct);

// POST /api/business/faq  -> nayi FAQ add karo
router.post("/faq", authMiddleware, addFaq);

// DELETE /api/business/faq/:faqId  -> FAQ delete karo
router.delete("/faq/:faqId", authMiddleware, deleteFaq);

// GET /api/business/leads  -> saare leads dekho
router.get("/leads", authMiddleware, getLeads);

// GET /api/business/conversations  -> saari chat conversations dekho
router.get("/conversations", authMiddleware, getConversations);

// GET /api/business/analytics  -> basic stats dekho
router.get("/analytics", authMiddleware, getAnalytics);

// GET /api/business/public/:businessId  -> PUBLIC route, widget ke liye
router.get("/public/:businessId", getPublicSettings);

module.exports = router;