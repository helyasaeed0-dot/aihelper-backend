const puppeteer = require("puppeteer");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Business = require("../models/Business");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Website kholta hai ek "invisible browser" (Puppeteer) mein - taake
// JavaScript se load hone wala content bhi mil sake (jaise React/Vue sites)
async function scrapeWebsiteText(url) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    );
    await page.setViewport({ width: 1280, height: 900 });

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 25000,
    });

    // Kuch modern sites (React/Vue) thora aur time lete hain content dikhane mein
    // isliye networkidle ke baad bhi thora rukte hain
    await new Promise((r) => setTimeout(r, 2000));

    // Page ka <title> tag - agar AI ko storeName na mile to fallback ke liye
    const pageTitle = await page.title();

    // Poora visible text nikalo (jaise ek insaan browser mein dekhta)
    const bodyText = await page.evaluate(() => document.body.innerText);

    return {
      text: bodyText.replace(/\s+/g, " ").trim().slice(0, 8000),
      pageTitle: pageTitle || "",
    };
  } finally {
    await browser.close();
  }
}

// ============ AUTO IMPORT FROM WEBSITE ============
exports.importFromWebsite = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ message: "Website URL zaroori hai" });
    }

    const business = await Business.findOne({ owner: req.userId });
    if (!business) {
      return res.status(404).json({ message: "Pehle business banao" });
    }

    let scraped;
    try {
      scraped = await scrapeWebsiteText(url);
    } catch (err) {
      return res.status(400).json({
        message: "Website access nahi ho payi. URL check karo ya koi doosra page try karo.",
      });
    }

    const { text: websiteText, pageTitle } = scraped;

    if (!websiteText || websiteText.length < 30) {
      return res.status(400).json({
        message: "Is page se koi useful content nahi mila. Ho sakta hai ye page bahut kam text rakhta ho (jaise sirf images/buttons).",
      });
    }

    // AI ko instruction do - GENERIC rehna hai, kisi bhi business type
    // (products bechne wala, service dene wala, agency, restaurant, kuch bhi)
    // ke liye kaam karna chahiye
    const extractionPrompt = `Neeche ek website ka text diya gaya hai. Ye kisi bhi tarah
ka business ho sakta hai - online store, service company, restaurant, agency, ride/booking
app, kuch bhi. Isme se jo bhi relevant business information mile usay nikal kar SIRF ek
valid JSON object return karo (koi extra text, koi markdown backticks nahi) is exact
format mein:

{
  "storeName": "business/company ka naam",
  "aboutBusiness": "1-3 sentences mein bataO ye business kya karta hai, kis tarah ki service/product deta hai - jo bhi general info mile",
  "products": [{ "name": "product ya service ka naam", "price": number ya null agar price na mile, "description": "optional short description" }],
  "deliveryCharges": number (agar na mile to 0),
  "deliveryTime": "string ya empty string",
  "returnPolicy": "string ya empty string",
  "openingHours": "string ya empty string",
  "faqs": [{ "question": "string", "answer": "string" }]
}

ZAROORI RULES:
- "products" sirf tab bharo jab website mein actual products ya named services list hon.
  Agar business sirf ek general service deta hai (jaise "ride booking app"), to products
  khali chhod do aur uski info "aboutBusiness" mein likh do.
- "aboutBusiness" hamesha bharne ki koshish karo, chahe products/FAQs na milein bhi -
  isme business ka general purpose/description likho.
- Agar koi cheez bilkul nahi milti, usay empty string, null, ya empty array rakho -
  kabhi bhi khud se fake data mat banao.

Website ka page title (agar madad chahiye storeName ke liye): "${pageTitle}"

Website Text:
${websiteText}
`;

    const modelsToTry = ["gemini-flash-latest", "gemini-3.6-flash", "gemini-2.5-flash"];
    let extractedText = null;
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(extractionPrompt);
        extractedText = result.response.text();
        break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!extractedText) {
      throw lastError || new Error("AI se data extract nahi ho saka");
    }

    const cleanJson = extractedText.replace(/```json|```/g, "").trim();

    let parsedData;
    try {
      parsedData = JSON.parse(cleanJson);
    } catch (err) {
      return res.status(500).json({
        message: "AI ka response samajh nahi aya, dobara try karo.",
      });
    }

    // Fallback: agar AI ne storeName khali chhoda, page title use karo
    if (!parsedData.storeName && pageTitle) {
      parsedData.storeName = pageTitle;
    }

    res.status(200).json({ extractedData: parsedData });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};