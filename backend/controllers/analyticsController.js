const pool = require("../config/db");

// ✅ Category-wise spending
exports.getCategorySpending = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT category, SUM(amount) as total
       FROM transactions
       WHERE user_id = $1
       GROUP BY category`,
      [userId]
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching category spending" });
  }
};

// ✅ Monthly spending trend
exports.getMonthlySpending = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT DATE_TRUNC('month', transaction_date) as month,
              SUM(amount) as total
       FROM transactions
       WHERE user_id = $1
       GROUP BY month
       ORDER BY month`,
      [userId]
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching monthly spending" });
  }
};