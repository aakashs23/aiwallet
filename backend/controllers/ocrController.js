const axios = require("axios");
const pool = require("../config/db");
const sharp = require("sharp");
const fs = require("fs");
const FormData = require("form-data");

exports.processReceipt = async (req, res) => {
  try {
    const userId = req.user.userId;

    const imagePath = req.file.path;
    const processedPath = "uploads/processed-" + Date.now() + ".png";

    // 🧱 0. PREPROCESS IMAGE (IMPORTANT)
    await sharp(imagePath)
      .resize({ width: 800 }) // 🔥 normalize size
      .grayscale()
      .normalize()
      .sharpen()
      .png({ compressionLevel: 9 })  // maximize compression
      .toFile(processedPath);

    // 🧱 1. OCR via Paddle (Python service)
    const formData = new FormData();
    formData.append("image", fs.createReadStream(processedPath));

    let ocrRes;
    try {
      ocrRes = await axios.post(
        "http://localhost:8001/ocr",
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 120000 // 🔥 increase timeout for large receipts
        }
      );
    } catch (ocrErr) {
      if (ocrErr.code === 'ECONNREFUSED') {
        throw new Error("OCR Service is not running on localhost:8001. Please start the OCR service.");
      } else if (ocrErr.response?.status === 404) {
        throw new Error("OCR endpoint /ocr not found. Check if the OCR service app.py has the /ocr endpoint.");
      }
      throw ocrErr;
    }

    const rawText = ocrRes.data.text;

    console.log("PADDLE OCR TEXT:", rawText);

    // 🧠 USER HISTORY (for classification boost)
    const historyResult = await pool.query(
      `SELECT merchant, category, times_seen
       FROM training_data
       ORDER BY times_seen DESC, last_seen_at DESC
       LIMIT 10`
    );

    const userHistory = historyResult.rows.map(
      r => `${r.merchant} → ${r.category} (seen ${r.times_seen}x)`
    );

    // 🔥 FALLBACK AMOUNT
    const amountMatch = rawText.match(/(total|amount)[^\d]*(\d+(\.\d+)?)/i);
    const fallbackAmount = amountMatch ? Number(amountMatch[2]) : 0;

    // 🧼 CLEAN TEXT (VERY IMPORTANT FOR LLM)
    let cleanedText = rawText
      .replace(/[^\x00-\x7F]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // 🧱 2. PARSE RECEIPT
    const parseRes = await axios.post(
      "http://localhost:5000/llm/parse-receipt",
      {
        text: cleanedText
      }
    );

    const parsed = parseRes.data;

    // 🧱 3. CLASSIFY EACH ITEM (HYBRID)
    const { ruleBasedCategory } = require("../utils/rules");

    const items = [];

    for (let item of parsed.items || []) {

      let category = ruleBasedCategory(item.name);

      let classification;

      if (category) {
        // ✅ RULE HIT
        classification = {
          category,
          confidence: 0.95,
          reason: "Rule-based classification"
        };
      } else {
        // 🤖 LLM fallback
        try {
          const classifyRes = await axios.post("http://localhost:5000/llm/classify", {
            merchant: item.name + " food item",
            amount: item.amount,
            userHistory
          });

          classification = classifyRes.data.classification;

        } catch {
          classification = {
            category: "Other",
            confidence: 0.5,
            reason: "Fallback"
          };
        }
      }

      items.push({
        name: item.name,
        amount: item.amount,
        ...classification
      });
    }

    // 🧹 CLEANUP FILES
    try {
      fs.unlinkSync(imagePath);
      fs.unlinkSync(processedPath);
    } catch (e) {
      console.log("Cleanup warning:", e.message);
    }

    // ✅ RESPONSE
    res.json({
      merchant: parsed.merchant,
      date: parsed.date,
      total: parsed.total || fallbackAmount,
      items,
      rawText
    });

  } catch (err) {
    console.error("OCR PIPELINE ERROR:", err);
    res.status(500).json({ message: "OCR processing failed" });
  }
};