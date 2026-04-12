const Tesseract = require("tesseract.js");
const axios = require("axios");
const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const fs = require("fs");

exports.processReceipt = async (req, res) => {
  try {
    const userId = req.user.userId;

    const imagePath = req.file.path;
    const processedPath = "uploads/processed-" + Date.now() + ".png";

    await sharp(imagePath)
        .grayscale()
        .normalize()
        .sharpen()
        .threshold(150)
        .toFile(processedPath);

    // 🧱 1. OCR
    const ocrResult = await Tesseract.recognize(processedPath, "eng", {
        logger: m => console.log(m),
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789₹.,:- ",
    });
    const rawText = ocrResult.data.text;

    console.log("OCR TEXT:", rawText);

    const historyResult = await pool.query(
      `SELECT merchant, category, times_seen
       FROM training_data
       ORDER BY times_seen DESC, last_seen_at DESC
       LIMIT 10`,
    );
    const userHistory = historyResult.rows.map(
      r => `${r.merchant} → ${r.category} (seen ${r.times_seen}x)`
    );
    console.log("TRAINING HISTORY:", userHistory);

    // 🔥 FALLBACK AMOUNT EXTRACTION
    const amountMatch = rawText.match(/(total|amount)[^\d]*(\d+(\.\d+)?)/i);
    const fallbackAmount = amountMatch ? Number(amountMatch[2]) : 0;

    let cleanedText = rawText
        .replace(/[^\x00-\x7F]/g, "")   // remove weird unicode
        .replace(/\s+/g, " ")           // normalize spaces
        .trim();

    // 🧱 2. PARSE RECEIPT (multi-item)
    const parseRes = await axios.post("http://localhost:5000/llm/parse-receipt", {
      text: rawText
    });

    const parsed = parseRes.data;

    // 🧱 3. CLASSIFY EACH ITEM
    const items = [];

    for (let item of parsed.items || []) {
      const classifyRes = await axios.post("http://localhost:5000/llm/classify", {
      merchant: item.name,
      amount: item.amount,
      userHistory
    });

    const classification = classifyRes.data.classification;

    items.push({
      name: item.name,
      amount: item.amount,
      category: classification.category,
      confidence: classification.confidence,
      reason: classification.reason
    });
  }
   
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