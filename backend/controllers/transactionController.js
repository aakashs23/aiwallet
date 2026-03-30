const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const { ruleBasedCategory } = require("../utils/categorizer");

exports.addTransaction = async (req, res) => {
  try {
    const { amount, merchant } = req.body;

    if (!amount || !merchant) {
      return res.status(400).json({
        message: "Amount and merchant are required"
      });
    }

    const userId = req.user.userId;

    let result = null;

    // ✅ 1. MEMORY LAYER (FIRST PRIORITY)
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

    // ✅ 2. RULE-BASED (SECOND)
    if (!result) {
      result = ruleBasedCategory(merchant);
    }

    // 🔥 If no rule match → call ML
    if (!result) {
      try {
        const response = await axios.post("http://localhost:8000/predict", {
          merchant
        });

        result = {
          category: response.data.category,
          confidence: response.data.confidence,
          source: "ml",
          reason: "Predicted using ML model",
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

    let needsFeedback = false;

    if (
      result.source === "ml" &&
      (result.confidence < 0.6 || result.category === "Other")
    ) {
      needsFeedback = true;
    }

    // 🔥 Save to DB (for now without new columns)
    const dbResult = await pool.query(
      `INSERT INTO transactions 
      (id, user_id, amount, category, merchant, confidence, source)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
      [
        uuidv4(),
        userId,
        amount,
        result.category,
        merchant,
        result.confidence,
        result.source
      ]
    );

    let suggestedOptions = [];

    if (needsFeedback) {
      if (result.top_predictions && result.top_predictions.length > 0) {
        suggestedOptions = result.top_predictions.map(p => p.category);
      }

      // always add fallback
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

    res.json({
      ...dbResult.rows[0],

      // AI fields
      confidence: result.confidence,
      confidence_label: confidenceLabel,
      source: result.source,
      reason: result.reason,

      // UX improvements
      message: message,
      needs_feedback: needsFeedback,
      feedback_message: feedbackMessage,

      // suggestions
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
      "SELECT * FROM transactions WHERE user_id=$1 ORDER BY transaction_date DESC",
      [userId]
    );

    res.json(result.rows);

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
      `SELECT merchant, amount, transaction_date
       FROM transactions
       WHERE user_id = $1
       ORDER BY merchant, transaction_date`,
      [userId]
    );

    const transactions = result.rows;

    const grouped = {};

    // group by merchant + amount
    transactions.forEach(tx => {
      const key = `${tx.merchant}-${tx.amount}`;

      if (!grouped[key]) {
        grouped[key] = [];
      }

      grouped[key].push(new Date(tx.transaction_date));
    });

    const subscriptions = [];

    for (let key in grouped) {
      const dates = grouped[key];

      if (dates.length < 2) continue;

      // sort dates
      dates.sort((a, b) => a - b);

      // check intervals
      let intervals = [];

      for (let i = 1; i < dates.length; i++) {
        const diffDays =
          (dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24);

        intervals.push(diffDays);
      }

      // check if intervals are ~30 days
      const isMonthly = intervals.every(
        d => d > 25 && d < 35
      );

      if (isMonthly) {
        const [merchant, amount] = key.split("-");

        subscriptions.push({
          merchant,
          amount,
          billing_cycle: "monthly",
          message: `${merchant} subscription detected (~₹${amount}/month)`
        });
      }
    }

    res.json(subscriptions);

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