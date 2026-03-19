const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");

exports.addTransaction = async (req, res) => {
  try {
    const { amount, category, merchant } = req.body;
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