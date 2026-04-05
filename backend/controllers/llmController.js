const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.listModels = async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    res.json(response.data);
  } catch (err) {
    console.error("Error listing models:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.classifyTransaction = async (req, res) => {
  try {
    const { merchant, amount, userHistory = [] } = req.body;

    if (!merchant || !amount) {
      return res.status(400).json({
        message: "merchant and amount required"
      });
    }

    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash"
    });

    const prompt = `
    You are an expert financial transaction classifier with deep knowledge of Indian spending patterns and merchant categories.

    ## TASK
    Classify the given transaction into exactly ONE category based on the merchant name, amount, and user's transaction history.

    ## OUTPUT CONTRACT
    Respond with ONLY a raw JSON object. 
    - No markdown. No backticks. No explanation outside the JSON.
    - Deviate from this format = invalid response.

    {
        "category": "<exactly one from the allowed list>",
        "confidence": <float 0.00–1.00>,
        "reason": "<≤12 words explaining the key signal>"
    }

    ## ALLOWED CATEGORIES
    Food | Transport | Shopping | Bills | Entertainment | Health | Education | Travel | Finance | Other

    ## CLASSIFICATION RULES
    1. Merchant name is the PRIMARY signal — weight it highest.
    2. Amount is a SECONDARY signal (e.g., ₹500 at a pharmacy → likely Health, not Shopping).
    3. User history is a TIEBREAKER — use it when merchant name is ambiguous (e.g., "Amazon" could be Shopping or Electronics).
    4. If confidence < 0.5, still return your best guess — never return null or "Unknown".
    5. Assign "Other" only when no category fits after exhausting all signals.

    ## FEW-SHOT EXAMPLES
    Input:  Merchant: "Swiggy", Amount: ₹340, History: ["Zomato", "Swiggy", "Blinkit"]
    Output: {"category":"Food","confidence":0.99,"reason":"Swiggy is a food delivery platform"}

    Input:  Merchant: "BMTC", Amount: ₹15, History: ["Ola", "Metro Card Recharge"]
    Output: {"category":"Transport","confidence":0.97,"reason":"BMTC is a city bus service"}

    Input:  Merchant: "Apollo Pharmacy", Amount: ₹820, History: ["Medplus", "Dr. Reddy's"]
    Output: {"category":"Health","confidence":0.96,"reason":"Pharmacy purchase with medical history"}

    Input:  Merchant: "Amazon", Amount: ₹1200, History: ["Flipkart", "Myntra", "Ajio"]
    Output: {"category":"Shopping","confidence":0.91,"reason":"Amazon with retail-heavy user history"}

    Input:  Merchant: "Amazon", Amount: ₹199, History: ["Netflix", "Spotify", "Prime Video"]
    Output: {"category":"Entertainment","confidence":0.88,"reason":"Low amount suggests streaming subscription"}

    ## TRANSACTION TO CLASSIFY
    Merchant : ${merchant}
    Amount   : ₹${amount}
    History  : ${userHistory.length ? userHistory.join(", ") : "No history available"}

    ## REMINDER
    Output ONLY the raw JSON object. Nothing else.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch (err) {
      console.error("❌ JSON parse failed:", text);

      parsed = {
        category: "Other",
        confidence: 0.5,
        reason: "Fallback parsing failed"
      };
    }

    res.json(parsed);

  } catch (err) {
    console.error("❌ Gemini error:", err.message);

    res.json({
      category: "Other",
      confidence: 0,
      reason: "LLM failed"
    });
  }
};