const Business = require("../models/Business");
const Lead = require("../models/Lead");
const Conversation = require("../models/Conversation");

// ============ CREATE BUSINESS ============
// Owner apna business pehli baar banata hai (storeName ke sath)
exports.createBusiness = async (req, res) => {
  try {
    const { storeName } = req.body;

    if (!storeName) {
      return res.status(400).json({ message: "Store name zaroori hai" });
    }

    // Check karo kahin owner ka business pehle se to nahi bana
    const existing = await Business.findOne({ owner: req.userId });
    if (existing) {
      return res.status(400).json({ message: "Aapka business pehle se bana hua hai" });
    }

    const business = await Business.create({
      owner: req.userId, // authMiddleware se aata hai
      storeName,
    });

    res.status(201).json({ message: "Business ban gaya!", business });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ============ GET MY BUSINESS ============
// Owner apna business data dekhta hai (dashboard load karte waqt)
exports.getMyBusiness = async (req, res) => {
  try {
    const business = await Business.findOne({ owner: req.userId });

    if (!business) {
      return res.status(404).json({ message: "Business nahi mila" });
    }

    res.status(200).json({ business });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ============ UPDATE BUSINESS INFO ============
// Delivery, return policy, opening hours, contact info update karna
exports.updateBusinessInfo = async (req, res) => {
  try {
    const { storeName, aboutBusiness, aiTone, welcomeMessage, deliveryCharges, deliveryTime, returnPolicy, openingHours, contactInfo } = req.body;

    const business = await Business.findOne({ owner: req.userId });
    if (!business) {
      return res.status(404).json({ message: "Business nahi mila" });
    }

    // Sirf jo fields bheji gayi hain unhi ko update karo
    if (storeName !== undefined) business.storeName = storeName;
    if (aboutBusiness !== undefined) business.aboutBusiness = aboutBusiness;
    if (aiTone !== undefined) business.aiTone = aiTone;
    if (welcomeMessage !== undefined) business.welcomeMessage = welcomeMessage;
    if (deliveryCharges !== undefined) business.deliveryCharges = deliveryCharges;
    if (deliveryTime !== undefined) business.deliveryTime = deliveryTime;
    if (returnPolicy !== undefined) business.returnPolicy = returnPolicy;
    if (openingHours !== undefined) business.openingHours = openingHours;
    if (contactInfo !== undefined) business.contactInfo = contactInfo;

    await business.save();

    res.status(200).json({ message: "Business info update ho gayi", business });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ============ ADD PRODUCT ============
exports.addProduct = async (req, res) => {
  try {
    const { name, price, description } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ message: "Product name aur price zaroori hai" });
    }

    const business = await Business.findOne({ owner: req.userId });
    if (!business) {
      return res.status(404).json({ message: "Business nahi mila" });
    }

    business.products.push({ name, price, description });
    await business.save();

    res.status(201).json({ message: "Product add ho gaya", products: business.products });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ============ DELETE PRODUCT ============
exports.deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const business = await Business.findOne({ owner: req.userId });
    if (!business) {
      return res.status(404).json({ message: "Business nahi mila" });
    }

    // productId wala product list se hatao
    business.products = business.products.filter(
      (p) => p._id.toString() !== productId
    );
    await business.save();

    res.status(200).json({ message: "Product delete ho gaya", products: business.products });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ============ ADD FAQ ============
exports.addFaq = async (req, res) => {
  try {
    const { question, answer } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ message: "Question aur answer zaroori hai" });
    }

    const business = await Business.findOne({ owner: req.userId });
    if (!business) {
      return res.status(404).json({ message: "Business nahi mila" });
    }

    business.faqs.push({ question, answer });
    await business.save();

    res.status(201).json({ message: "FAQ add ho gayi", faqs: business.faqs });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ============ DELETE FAQ ============
exports.deleteFaq = async (req, res) => {
  try {
    const { faqId } = req.params;

    const business = await Business.findOne({ owner: req.userId });
    if (!business) {
      return res.status(404).json({ message: "Business nahi mila" });
    }

    business.faqs = business.faqs.filter((f) => f._id.toString() !== faqId);
    await business.save();

    res.status(200).json({ message: "FAQ delete ho gayi", faqs: business.faqs });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ============ GET LEADS ============
// Owner apne saare leads dekhta hai (chatbot ne jo capture kiye)
exports.getLeads = async (req, res) => {
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) {
      return res.status(404).json({ message: "Business nahi mila" });
    }

    // Naye leads sabse upar dikhein
    const leads = await Lead.find({ business: business._id }).sort({ createdAt: -1 });

    res.status(200).json({ leads });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ============ GET CONVERSATIONS ============
// Owner apni saari chat conversations dekhta hai (naye pehle)
exports.getConversations = async (req, res) => {
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) {
      return res.status(404).json({ message: "Business nahi mila" });
    }

    const conversations = await Conversation.find({ business: business._id }).sort({
      updatedAt: -1,
    });

    res.status(200).json({ conversations });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ============ GET ANALYTICS ============
// Owner ke liye basic stats: total conversations, total leads, status ke hisaab se breakdown
exports.getAnalytics = async (req, res) => {
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) {
      return res.status(404).json({ message: "Business nahi mila" });
    }

    const totalConversations = await Conversation.countDocuments({ business: business._id });
    const totalLeads = await Lead.countDocuments({ business: business._id });

    const newLeads = await Lead.countDocuments({ business: business._id, status: "New" });
    const warmLeads = await Lead.countDocuments({ business: business._id, status: "Warm" });
    const hotLeads = await Lead.countDocuments({ business: business._id, status: "Hot" });

    res.status(200).json({
      totalConversations,
      totalLeads,
      leadsByStatus: { New: newLeads, Warm: warmLeads, Hot: hotLeads },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ============ GET PUBLIC SETTINGS ============
// Ye route PUBLIC hai (login ki zarurat nahi) - widget isay load hote hi
// call karega taake welcomeMessage jaisi customizations mil sakein
exports.getPublicSettings = async (req, res) => {
  try {
    const { businessId } = req.params;
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({ message: "Business nahi mila" });
    }

    res.status(200).json({
      storeName: business.storeName,
      welcomeMessage: business.welcomeMessage,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};