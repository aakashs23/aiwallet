const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");
const categorizeTransaction = require("../utils/categorizer");
const axios = require("axios");

exports.addTransaction = async (req, res) => {
  try {
    let { amount, category, merchant } = req.body;

    // call ML service
  if (!category) {
    try {
      const response = await axios.post("http://localhost:8000/predict", {
        merchant
      });

      if (!amount || !merchant) {
        return res.status(400).json({
          message: "Amount and merchant are required"
        });
      }

      category = response.data.category;
    } catch (err) {
    category = "Other";
    }
  }
  
  const userId = req.user.userId;
     
    const result = await pool.query(
      `INSERT INTO transactions (id, user_id, amount, category, merchant)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [uuidv4(), userId, amount, category, merchant]
    );

    res.json(result.rows[0]);

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