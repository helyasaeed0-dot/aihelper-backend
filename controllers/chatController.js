const { GoogleGenerativeAI } = require("@google/generative-ai");
const Business = require("../models/Business");
const Lead = require("../models/Lead");
const Conversation = require("../models/Conversation");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Business ke data ko ek achhe "prompt" mein convert karta hai
function buildBusinessContext(business) {
  const productsText = business.products
    .map((p) => {
      const priceText = p.price !== undefined && p.price !== null ? `$${p.price}` : "price not specified";
      return `- ${p.name}: ${priceText}${p.description ? " (" + p.description + ")" : ""}`;
    })
    .join("\n") || "Koi specific products/services list nahi ki gayi";

  const faqsText = business.faqs
    .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
    .join("\n\n") || "Koi FAQs add nahi ki gayi";

  return `
Store Name: ${business.storeName}
About This Business: ${business.aboutBusiness || "Not specified"}
Delivery Charges: $${business.deliveryCharges}
Delivery Time: ${business.deliveryTime || "Not specified"}
Return Policy: ${business.returnPolicy || "Not specified"}
Opening Hours: ${business.openingHours || "Not specified"}
Contact: Phone - ${business.contactInfo?.phone || "N/A"}, Email - ${business.contactInfo?.email || "N/A"}

Products/Services:
${productsText}

FAQs:
${faqsText}
`;
}

// Email ko message se dhundne ke liye simple pattern
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

// Message se naam nikalne ki koshish karta hai (simple heuristic)
// Jaise: "Ahmed, ahmed@gmail.com" -> "Ahmed"
// Jaise: "My name is Ahmed and email is ahmed@gmail.com" -> "Ahmed"
function extractName(message, email) {
  let text = message.replace(email, "").trim();

  // Common phrases hata do
  text = text.replace(/my name is/gi, "");
  text = text.replace(/email is/gi, "");
  text = text.replace(/name:/gi, "");
  text = text.replace(/email:/gi, "");
  text = text.replace(/and/gi, "");
  text = text.replace(/[,.:;]/g, " ");

  text = text.trim().split(/\s+/).slice(0, 2).join(" "); // pehle 1-2 words lo

  return text || "Unknown";
}

// Business ke products list mein se dekhta hai ke conversation mein
// kisi product ka naam mention hua hai ya nahi (interest track karne ke liye)
function detectInterest(business, historyText) {
  for (const product of business.products) {
    if (historyText.toLowerCase().includes(product.name.toLowerCase())) {
      return product.name;
    }
  }
  return "General inquiry";
}

// ============ CHAT ENDPOINT ============
exports.chat = async (req, res) => {
  try {
    const { businessId, message, history, sessionId } = req.body;
    // history = [{ role: "user", text: "..." }, { role: "model", text: "..." }, ...]
    // sessionId = widget browser session ki ek unique ID (conversation group karne ke liye)

    if (!businessId || !message) {
      return res.status(400).json({ message: "businessId aur message zaroori hain" });
    }

    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({ message: "Business nahi mila" });
    }

    const context = buildBusinessContext(business);

    const toneInstructions = {
      friendly: "Garmjoshi aur dosti wale andaaz mein baat karo, emojis kabhi kabhi use kar sakte ho.",
      professional: "Formal aur professional andaaz mein baat karo, emojis use mat karo.",
      casual: "Ek relaxed, casual andaaz mein baat karo, jaise kisi dost se baat kar rahe ho.",
    };
    const toneInstruction = toneInstructions[business.aiTone] || toneInstructions.friendly;

    const systemPrompt = `Tum "${business.storeName}" ke customer support AI assistant ho.
Sirf neeche di gayi business information use karke customer ke sawaalon ka jawab do.
Agar koi cheez is info mein nahi hai, to kaho "Mujhe iski jankari nahi, aap humse contact kar sakte hain."
Kabhi bhi fake ya galat info mat do. Jawab chhota aur clear rakho.

TONE: ${toneInstruction}

IMPORTANT: Agar customer kahe ke wo kharidna chahta hai (jaise "I want to buy", "mujhe lena hai", "order karna hai"),
to usse uska NAAM aur EMAIL maango, taake hum usse contact kar sakein.

LANGUAGE RULE: Customer jis language ya style mein sawaal poochay (English, Urdu, ya Roman Urdu/Hinglish jaise "price kya hai"),
usi language/style mein jawab do. Agar customer English mein poochay to English mein jawab do,
agar Urdu (ya Roman Urdu) mein poochay to usi mein jawab do.

Business Information:
${context}
`;

    // Purani history ko Gemini ke format mein convert karo
    const formattedHistory = (history || []).map((h) => ({
      role: h.role === "assistant" ? "model" : "user",
      parts: [{ text: h.text }],
    }));

    const modelsToTry = ["gemini-flash-latest", "gemini-3.6-flash", "gemini-2.5-flash"];
    let aiReply = null;
    let lastError = null;

    for (const modelName of modelsToTry) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: systemPrompt,
          });
          const chatSession = model.startChat({ history: formattedHistory });
          const result = await chatSession.sendMessage(message);
          aiReply = result.response.text();
          break;
        } catch (err) {
          lastError = err;
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
      if (aiReply) break;
    }

    if (!aiReply) {
      throw lastError || new Error("AI se jawab nahi mil saka");
    }

    // ===== LEAD DETECTION =====
    // Check karo ke customer ke is message mein email hai ya nahi
    let leadCaptured = false;
    const emailMatch = message.match(EMAIL_REGEX);

    if (emailMatch) {
      const email = emailMatch[0];
      const name = extractName(message, email);

      // Poori conversation ka text jodo interest detect karne ke liye
      const historyText = (history || []).map((h) => h.text).join(" ") + " " + message;
      const interest = detectInterest(business, historyText);

      await Lead.create({
        business: business._id,
        name,
        email,
        interest,
        status: "New",
      });

      leadCaptured = true;
    }

    // ===== CONVERSATION LOGGING =====
    // Is business+session ki conversation dhundo, na mile to nayi banao
    if (sessionId) {
      let conversation = await Conversation.findOne({
        business: business._id,
        sessionId,
      });

      if (!conversation) {
        conversation = new Conversation({
          business: business._id,
          sessionId,
          messages: [],
        });
      }

      conversation.messages.push({ sender: "user", text: message });
      conversation.messages.push({ sender: "ai", text: aiReply });
      await conversation.save();
    }

    res.status(200).json({ reply: aiReply, leadCaptured });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};