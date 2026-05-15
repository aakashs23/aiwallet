const axios = require("axios");
const pool = require("../config/db");
const path = require("path");
const sharp = require("sharp");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const FormData = require("form-data");
const { parseReceipt } = require("../services/receiptParser");
const { parseBankStatement } = require("../services/bankParser");
const { ruleBasedCategory } = require("../utils/rules");

const OCR_SERVICE_URL = "http://127.0.0.1:8001/ocr";

const isPdfFile = (file) => {
  if (!file) return false;
  const extension = path.extname(file.path || file.originalname || "").toLowerCase();
  return file.mimetype === "application/pdf" || extension === ".pdf";
};

const cleanOcrText = (text) => {
  return text
    .replace(/[^\w\s.,:\-&/]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

const normalizeReceiptItem = (item) => ({
  name: item.name || item.merchant || "Unknown",
  amount: Number(item.amount || 0),
  category: item.category || "Other",
  date: item.date || item.transaction_date || new Date().toISOString().split("T")[0],
  confidence: item.confidence ?? 0.8,
  reason: item.reason || "Parsed from OCR"
});

const classifyMerchant = async (merchant, amount, userHistory) => {
  const category = ruleBasedCategory(merchant);

  if (category) {
    return {
      category,
      confidence: 0.95,
      source: "rule",
      reason: "Rule-based classification"
    };
  }

  try {
    const classifyRes = await axios.post("http://localhost:5000/llm/classify", {
      merchant,
      amount,
      userHistory
    });

    return {
      category: classifyRes.data.category || "Other",
      confidence: classifyRes.data.confidence ?? 0.5,
      source: classifyRes.data.source || "llm",
      reason: classifyRes.data.reason || "LLM fallback"
    };
  } catch (error) {
    return {
      category: "Other",
      confidence: 0.5,
      source: "fallback",
      reason: "Classification fallback"
    };
  }
};

const storeBankTransactions = async (userId, transactions, userHistory) => {
  const stored = [];

  for (const txn of transactions) {
    try {
      const classification = await classifyMerchant(txn.merchant, txn.amount, userHistory);

      const transactionDate = txn.date || new Date().toISOString().split("T")[0];

      const insertResult = await pool.query(
        `INSERT INTO transactions
          (id, user_id, amount, category, merchant, transaction_date, confidence, source, reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, user_id, amount, category, merchant, transaction_date, confidence, source, reason`,
        [
          uuidv4(),
          userId,
          txn.amount,
          classification.category,
          txn.merchant,
          transactionDate,
          classification.confidence,
          classification.source,
          classification.reason
        ]
      );

      const insertedRow = insertResult.rows[0];
      insertedRow.amount = Number(insertedRow.amount);
      stored.push(insertedRow);
    } catch (err) {
      console.error("Bank transaction store error:", err.message);
    }
  }

  return stored;
};

exports.processReceipt = async (req, res) => {
  try {
    const userId = req.user.userId;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded. Use the 'image' field in multipart/form-data." });
    }

    const isPdf = isPdfFile(req.file);
    const imagePath = req.file.path;
    let uploadPath = imagePath;
    let processedPath = null;

    if (!isPdf) {
      processedPath = `uploads/processed-${Date.now()}.png`;
      await sharp(imagePath)
        .resize({ width: 800 })
        .grayscale()
        .normalize()
        .sharpen()
        .png({ compressionLevel: 9 })
        .toFile(processedPath);
      uploadPath = processedPath;
    }

    const formData = new FormData();
    formData.append("image", fs.createReadStream(uploadPath));

    let ocrRes;
    try {
      ocrRes = await axios.post(OCR_SERVICE_URL, formData, {
        headers: formData.getHeaders(),
        timeout: 200000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      });
    } catch (ocrErr) {
      if (ocrErr.code === "ECONNREFUSED") {
        throw new Error("OCR Service is not running on 127.0.0.1:8001. Please start the OCR service.");
      } else if (ocrErr.code === "ETIMEDOUT" || ocrErr.code === "ECONNABORTED") {
        throw new Error("OCR Service request timed out. The OCR service may be busy or processing a large file.");
      } else if (ocrErr.response?.status === 404) {
        throw new Error("OCR endpoint /ocr not found. Check if the OCR service app.py has the /ocr endpoint.");
      }
      throw ocrErr;
    }

    const rawText = ocrRes.data?.text || "";
    console.log("PADDLE OCR TEXT:", rawText);

    const historyResult = await pool.query(
      `SELECT merchant, category, times_seen
       FROM training_data
       ORDER BY times_seen DESC, last_seen_at DESC
       LIMIT 10`
    );

    const userHistory = historyResult.rows.map(
      (row) => `${row.merchant} → ${row.category} (seen ${row.times_seen}x)`
    );

    const cleanedText = cleanOcrText(rawText);
    let result;

    if (isPdf) {
      result = await parseBankStatement(cleanedText);
    } else {
      result = await parseReceipt(cleanedText);
    }

    const cleanupPaths = [imagePath];
    if (processedPath && processedPath !== imagePath) {
      cleanupPaths.push(processedPath);
    }

    try {
      cleanupPaths.forEach((filePath) => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    } catch (cleanupErr) {
      console.log("Cleanup warning:", cleanupErr.message);
    }

    if (!isPdf) {
      const items = [];
      const amountMatch = rawText.match(/(total|amount)[^\d]*(\d+(\.\d+)?)/i);
      const fallbackAmount = amountMatch ? Number(amountMatch[2]) : 0;

      for (const item of result.items || []) {
        let category = ruleBasedCategory(item.name);
        let classification;

        if (category) {
          classification = {
            category,
            confidence: 0.95,
            reason: "Rule-based classification"
          };
        } else {
          try {
            const classifyRes = await axios.post("http://localhost:5000/llm/classify", {
              merchant: item.name,
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

      return res.json({
        type: "receipt",
        merchant: result.merchant,
        date: result.date,
        total: result.total || fallbackAmount,
        items: items.map(normalizeReceiptItem),
        rawText
      });
    }

    const insertedTransactions = await storeBankTransactions(userId, result.transactions || [], userHistory);

    // Return bank statement as receipt-like structure for frontend compatibility
    const totalAmount = insertedTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

    const normalizedItems = insertedTransactions.map((t) => normalizeReceiptItem({
      merchant: t.merchant,
      amount: t.amount,
      category: t.category,
      confidence: t.confidence,
      date: t.transaction_date,
      reason: t.reason
    }));

    console.log("OCR PDF normalized items:", normalizedItems);

    return res.json({
      type: "receipt",
      merchant: "Bank Statement",
      date: null,
      total: totalAmount,
      items: normalizedItems,
      rawText,
      isBankStatement: true,
      alreadySaved: true,
      transactionCount: normalizedItems.length
    });
  } catch (err) {
    console.error("OCR PIPELINE ERROR:", err);
    res.status(500).json({ message: err.message || "OCR processing failed" });
  }
};