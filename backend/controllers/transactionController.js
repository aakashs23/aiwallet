const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const { ruleBasedCategory } = require("../utils/categorizer");
const { detectSubscriptions } = require("../utils/subscriptionDetector");

const SUBSCRIPTION_UNUSED_AFTER_DAYS = 45;

async function syncSubscriptions(userId, transactions) {
  const subs = detectSubscriptions(transactions);
  const merchants = subs.map((sub) => sub.merchant);

  for (let sub of subs) {
    const nextDue = new Date(sub.lastPaid);
    nextDue.setDate(nextDue.getDate() + Math.round(sub.avgInterval || 30));

    try {
      await pool.query(
        `INSERT INTO subscriptions 
        (id, user_id, merchant, avg_amount, billing_cycle, last_paid, next_due, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (user_id, merchant) 
        DO UPDATE SET 
          avg_amount = EXCLUDED.avg_amount,
          billing_cycle = EXCLUDED.billing_cycle,
          last_paid = EXCLUDED.last_paid,
          next_due = EXCLUDED.next_due,
          status = EXCLUDED.status`,
        [
          uuidv4(),
          userId,
          sub.merchant,
          sub.avgAmount,
          sub.billing_cycle,
          sub.lastPaid,
          nextDue.toISOString(),
          sub.status
        ]
      );
    } catch (err) {
      console.error("Error upserting subscription:", err.message);
    }
  }

  if (merchants.length > 0) {
    await pool.query(
      `UPDATE subscriptions
       SET status = 'unused'
       WHERE user_id = $1
         AND merchant NOT IN (${merchants.map((_, i) => `$${i + 2}`).join(", ")})
         AND last_paid < NOW() - INTERVAL '${SUBSCRIPTION_UNUSED_AFTER_DAYS} days'`,
      [userId, ...merchants]
    );
  } else {
    await pool.query(
      `UPDATE subscriptions
       SET status = 'unused'
       WHERE user_id = $1
         AND last_paid < NOW() - INTERVAL '${SUBSCRIPTION_UNUSED_AFTER_DAYS} days'`,
      [userId]
    );
  }
}

exports.addTransaction = async (req, res) => {
  try {
    const { amount, merchant, date } = req.body;

    if (!amount || !merchant) {
      return res.status(400).json({
        message: "Amount and merchant are required"
      });
    }

    const userId = req.user.userId;

    let result = null;

    // ✅ 1. MEMORY
    const learned = await pool.query(
      "SELECT category FROM training_data WHERE merchant=$1 LIMIT 1",
      [merchant.toLowerCase()]
    );

    if (learned.rows.length > 0) {
      result = {
        category: learned.rows[0].category,
        confidence: 1.0,
        source: "memory",
        reason: "Learned from your past corrections"
      };
    }

    // ✅ 2. RULE
    if (!result) {
      result = ruleBasedCategory(merchant);
    }

    // ✅ 3. ML
    if (!result) {
      try {
        const response = await axios.post("http://localhost:8000/predict", {
          merchant
        });

        result = {
          category: response.data.category,
          confidence: response.data.confidence,
          source: "ml",
          reason: `Predicted from merchant "${merchant}"`,
          top_predictions: response.data.top_predictions
        };

      } catch (err) {
        result = {
          category: "Other",
          confidence: 0,
          source: "fallback",
          reason: "ML service failed"
        };
      }
    }

    // ✅ Get user history
    const historyRes = await pool.query(
      `SELECT category FROM transactions 
      WHERE user_id=$1 
      ORDER BY transaction_date DESC 
      LIMIT 5`,
      [userId]
    );

    const userHistory = historyRes.rows.map(r => r.category);

    // 🔥 LLM fallback
    if (!result || result.confidence < 0.6) {
      try {
        const llmRes = await axios.post("http://localhost:5000/llm/classify", {
          merchant,
          amount,
          userHistory
        });

        result = {
          category: llmRes.data.category,
          confidence: llmRes.data.confidence,
          source: "llm",
          reason: llmRes.data.reason
        };

      } catch (err) {
        console.error("LLM fallback failed:", err.message);
      }
    }

    const needsFeedback = result.confidence < 0.6;
    const finalReason =
      result.reason ||
      (needsFeedback
        ? "Low confidence categorization - please verify"
        : "Categorized automatically");

    const finalDate = date || new Date().toISOString().split("T")[0];

    const dbResult = await pool.query(
      `INSERT INTO transactions
      (id, user_id, amount, category, merchant, transaction_date, confidence, source, reason)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [
        uuidv4(),
        userId,
        amount,
        result.category,
        merchant,
        finalDate,
        result.confidence,
        result.source,
        finalReason
      ]
    );

    let suggestedOptions = [];

    if (needsFeedback) {
      if (result.top_predictions && result.top_predictions.length > 0) {
        suggestedOptions = result.top_predictions.map(p => p.category);
      }

      if (!suggestedOptions.includes("Other")) {
        suggestedOptions.push("Other");
      }
    }

    let confidenceLabel = "high";

    if (result.confidence < 0.4) {
      confidenceLabel = "low";
    } else if (result.confidence < 0.6) {
      confidenceLabel = "medium";
    }

    let message = "";

    if (result.source === "rule") {
      message = "Categorized using known merchant pattern";
    } else if (result.source === "ml") {
      message = "Categorized using AI prediction";
    } else if (result.source === "memory") {
      message = "Learned from your past corrections";
    }

    let feedbackMessage = "";

    if (needsFeedback) {
      feedbackMessage = "Not sure about this. Please confirm category.";
    }

    const transactionRows = await pool.query(
      `SELECT merchant, amount, transaction_date as date
       FROM transactions
       WHERE user_id = $1
       ORDER BY merchant, date`,
      [userId]
    );

    try {
      await syncSubscriptions(userId, transactionRows.rows);
    } catch (syncErr) {
      console.error("Subscription sync failed after addTransaction:", syncErr.message);
    }

    res.json({
      ...dbResult.rows[0],

      confidence: result.confidence,
      confidence_label: confidenceLabel,
      source: result.source,
      reason: finalReason, // ✅ ensure frontend gets it

      message,
      needs_feedback: needsFeedback,
      feedback_message: feedbackMessage,

      top_predictions: result.top_predictions || [],
      suggested_options: suggestedOptions
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT *, COALESCE(transaction_date, created_at) AS effective_date
       FROM transactions
       WHERE user_id=$1
       ORDER BY effective_date DESC`,
      [userId]
    );

    const transactions = result.rows.map((tx) => ({
      ...tx,
      merchant: tx.merchant || tx.name || "Unknown",
      amount: Number(tx.amount || 0),
      category: tx.category || "Other",
      date: tx.date || (tx.transaction_date ? new Date(tx.transaction_date).toISOString().split("T")[0] : null)
    }));

    console.log(`Transactions API response for user ${userId}: ${transactions.length} rows`);

    res.json(transactions);

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

exports.deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      "DELETE FROM transactions WHERE id=$1",
      [id]
    );

    res.json({ message: "Transaction deleted" });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

exports.detectAnomalies = async (req, res) => {
  try {
    const userId = req.user.userId;

    // get transactions
    const result = await pool.query(
      `SELECT category, amount
       FROM transactions
       WHERE user_id = $1`,
      [userId]
    );

    const transactions = result.rows;

    // group by category
    const categoryMap = {};

    transactions.forEach(tx => {
      const category = tx.category;
      const amount = Number(tx.amount);

      if (!categoryMap[category]) {
        categoryMap[category] = [];
      }

      categoryMap[category].push(amount);
    });

    const anomalies = [];

    // detect anomalies
    for (let category in categoryMap) {
      const amounts = categoryMap[category];

      const avg =
        amounts.reduce((a, b) => a + b, 0) / amounts.length;

      amounts.forEach(amount => {
        if (amount > avg * 2) {
          anomalies.push({
            category,
            amount,
            average: Math.round(avg),
            message: `Unusual spending: You spent ₹${amount} on ${category}, average is ₹${Math.round(avg)}`
          });
        }
      });
    }

    res.json(anomalies);

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

exports.detectSubscriptions = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT merchant, amount, transaction_date as date
       FROM transactions
       WHERE user_id = $1
       ORDER BY merchant, date`,
      [userId]
    );

    const transactions = result.rows;
    await syncSubscriptions(userId, transactions);

    const storedSubs = await pool.query(
      `SELECT s.id, s.merchant, s.avg_amount, s.billing_cycle, s.next_due, s.status,
              COUNT(t.*) AS occurrence_count
       FROM subscriptions s
       LEFT JOIN transactions t
         ON t.user_id = s.user_id
         AND lower(t.merchant) = lower(s.merchant)
       WHERE s.user_id = $1
       GROUP BY s.id
       ORDER BY s.next_due`,
      [userId]
    );

    res.json(storedSubs.rows.map(sub => {
      const diffDays = Math.ceil((new Date(sub.next_due) - new Date()) / (1000 * 60 * 60 * 24));
      const next_due_label = diffDays >= 0
        ? `in ${diffDays} day${diffDays === 1 ? "" : "s"}`
        : `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} ago`;

      return {
        id: sub.id,
        merchant: sub.merchant,
        avg_amount: sub.avg_amount,
        billing_cycle: sub.billing_cycle,
        next_due: sub.next_due,
        next_due_label,
        occurrence_count: Number(sub.occurrence_count || 0),
        status: sub.status
      };
    }));

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

exports.deleteSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await pool.query(
      `DELETE FROM subscriptions WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    res.json({ message: "Subscription deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

exports.updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { category } = req.body;

    // 1️⃣ get existing transaction
    const existing = await pool.query(
      "SELECT * FROM transactions WHERE id=$1",
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const transaction = existing.rows[0];

    // 2️⃣ update category
    const updated = await pool.query(
      "UPDATE transactions SET category=$1 WHERE id=$2 RETURNING *",
      [category, id]
    );

    // 3️⃣ 🔥 AUTO SEND TO ML TRAINING
    try {
      
      const base = transaction.merchant.toLowerCase();
      await axios.post("http://localhost:5000/ml/train", [
        { merchant: base, category },
        { merchant: base + " payment", category },
        { merchant: base + " order", category }
      ]);

      console.log("📚 Sent to ML training");
    } catch (err) {
      console.error("❌ ML training failed:", err.message);
    }

    res.json(updated.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

exports.bulkAddTransactions = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { merchant, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Items array is required and must not be empty"
      });
    }

    console.log(`[BULK TXN] Starting save for ${items.length} items for user ${userId}`);

    const savedTransactions = [];
    let skippedCount = 0;

    for (const item of items) {
      const { name, amount, category, confidence, reason, date } = item;

      if (!amount || !category) {
        console.warn(`[BULK TXN] Skipping item: name=${name}, amount=${amount}, category=${category}`);
        skippedCount++;
        continue;
      }

      try {
        const dbResult = await pool.query(
          `INSERT INTO transactions
          (id, user_id, amount, category, merchant, transaction_date, confidence, source, reason)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          RETURNING *`,
          [
            uuidv4(),
            userId,
            amount,
            category,
            name || merchant || "Receipt Item",
            date || new Date(),
            confidence || 0.8,
            "ocr",
            reason || "From receipt scan"
          ]
        );

        savedTransactions.push(dbResult.rows[0]);
        console.log(`[BULK TXN] Saved transaction: ${name} - ${amount} (${category})`);

        // 🔥 AUTO SEND TO ML TRAINING (non-blocking)
        try {
          const base = (name || merchant || "item").toLowerCase();
          await axios.post("http://localhost:5000/ml/train", [
            { merchant: base, category }
          ]);
          console.log(`[ML TRAIN] Training data saved for merchant: ${base}`);
        } catch (err) {
          console.warn(`[ML TRAIN] Training failed for ${name} (${base}): ${err.message}`);
        }

      } catch (err) {
        console.error(`[BULK TXN] Error inserting item "${name}": ${err.message}`);
      }
    }

    console.log(`[BULK TXN] Saved ${savedTransactions.length} transactions, skipped ${skippedCount}`);

    const transactionRows = await pool.query(
      `SELECT merchant, amount, transaction_date as date
       FROM transactions
       WHERE user_id = $1
       ORDER BY merchant, date`,
      [userId]
    );

    try {
      await syncSubscriptions(userId, transactionRows.rows);
    } catch (syncErr) {
      console.error("Subscription sync failed after bulkAddTransactions:", syncErr.message);
    }

    res.json({
      message: `Successfully saved ${savedTransactions.length} transactions`,
      transactions: savedTransactions,
      skipped: skippedCount
    });

  } catch (err) {
    console.error("[BULK TXN] Unexpected error:", err);
    res.status(500).json({ message: "Server error" });
  }
};