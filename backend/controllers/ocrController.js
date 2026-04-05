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

    const metadata = await sharp(imagePath).metadata();

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

    // 🧱 2. LLM PARSING & CLASSIFICATION (Gemini)
    const classifyRes = await axios.post("http://localhost:5000/llm/classify", {
      texts: rawText
    });

    const llmResult = classifyRes.data;

    const extracted = llmResult.parsed;
    const result = llmResult.classification;

    // 🧱 4. SAVE TRANSACTION
    const dbResult = await pool.query(
      `INSERT INTO transactions
        (id, user_id, amount, category, merchant, confidence, source, reason, raw_text, cleaned_text)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING *`,
      [
        uuidv4(),
        userId,
        extracted.amount || fallbackAmount,
        result.category,
        extracted.merchant,
        result.confidence,
        "ocr+llm",
        result.reason,
        rawText,
        cleanedText
      ]
    );

    // 🧠 5. LEARNING LOOP — WRITE SIDE
    // If this merchant was seen before → increment counter + update timestamp
    // If new merchant → insert fresh row
    await pool.query(
      `INSERT INTO training_data (id, merchant, category, times_seen, last_seen_at)
       VALUES ($1, $2, $3, 1, NOW())
       ON CONFLICT (merchant)
       DO UPDATE SET
         times_seen   = training_data.times_seen + 1,
         last_seen_at = NOW(),
         category     = EXCLUDED.category`,
      [uuidv4(), extracted.merchant.toLowerCase(), result.category]
    );

    console.log("LEARNING LOOP: saved", extracted.merchant, "→", result.category);

    res.json({
      message: "Receipt processed successfully",
      rawText,
      extracted,
      classification: result,
      transaction: dbResult.rows[0]
    });

  } catch (err) {
    console.error("OCR PIPELINE ERROR:", err);
    res.status(500).json({ message: "OCR processing failed" });
  }
};