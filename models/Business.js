const mongoose = require("mongoose");

// Ek product/service ka structure (jaise: T-shirt = $20, ya sirf "Ride Booking" service)
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number }, // optional - kai services (jaise ride booking) ki fixed price nahi hoti
  description: { type: String },
});

// Ek FAQ ka structure (jaise: "Do you deliver to Canada?" -> "Yes")
const faqSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
});

const businessSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // batata hai ke ye business kis User (owner) ka hai
      required: true,
    },
    storeName: {
      type: String,
      required: true,
    },
    aboutBusiness: {
      type: String, // general description - kisi bhi business type ke liye
      // (jaise "Ye ek ride-booking service hai jo shehar ke andar rides deti hai")
      default: "",
    },
    aiTone: {
      type: String, // AI kis andaaz mein baat kare
      enum: ["friendly", "professional", "casual"],
      default: "friendly",
    },
    welcomeMessage: {
      type: String, // chatbot khulte hi ye message dikhega
      default: "Hi! How can I help you today?",
    },
    products: [productSchema], // list of products/services

    deliveryCharges: {
      type: Number,
      default: 0,
    },
    deliveryTime: {
      type: String, // jaise "3-5 business days"
      default: "",
    },
    returnPolicy: {
      type: String, // jaise "7 days return policy"
      default: "",
    },
    openingHours: {
      type: String, // jaise "Mon-Sat, 10am - 8pm"
      default: "",
    },
    faqs: [faqSchema], // list of FAQs

    contactInfo: {
      phone: { type: String, default: "" },
      email: { type: String, default: "" },
      address: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Business", businessSchema);