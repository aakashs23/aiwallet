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

exports.getTopMerchants = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT merchant, SUM(amount) as total
       FROM transactions
       WHERE user_id = $1
       GROUP BY merchant
       ORDER BY total DESC
       LIMIT 5`,
      [userId]
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching top merchants" });
  }
};

exports.getFinancialScore = async (req, res) => {
  try {
    const userId = req.user.userId;

    let score = 100;

    // 🔴 Spending total
    const totalRes = await pool.query(
      `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id=$1`,
      [userId]
    );

    const total = Number(totalRes.rows[0].total);

    // 🔴 Category concentration
    const categoryRes = await pool.query(
      `SELECT category, SUM(amount) as total
       FROM transactions
       WHERE user_id=$1
       GROUP BY category`,
      [userId]
    );

    const categories = categoryRes.rows;

    if (categories.length > 0) {
      const max = Math.max(...categories.map(c => Number(c.total)));

      if ((max / total) > 0.5) {
        score -= 20;
      }
    }

    // 🔴 Budget overspending
    const budgetRes = await pool.query(
      `SELECT b.monthly_limit, COALESCE(SUM(t.amount),0) as spent
       FROM budgets b
       LEFT JOIN transactions t
       ON LOWER(b.category) = LOWER(t.category)
       AND t.user_id = b.user_id
       GROUP BY b.monthly_limit`,
    );

    budgetRes.rows.forEach(b => {
      if (Number(b.spent) > Number(b.monthly_limit)) {
        score -= 30;
      }
    });

    // 🔴 Savings rate
    const savings = total > 0 ? 100 - (total / (total + 1)) * 100 : 0;

    if (savings < 20) score -= 20;
    if (savings > 50) score += 10;

    // clamp
    score = Math.max(0, Math.min(100, score));

    res.json({ score });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error calculating score" });
  }
};

exports.getCategoryTrends = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT 
        category,
        SUM(CASE WHEN EXTRACT(MONTH FROM transaction_date) = EXTRACT(MONTH FROM CURRENT_DATE)
          THEN amount ELSE 0 END) as current,
        SUM(CASE WHEN EXTRACT(MONTH FROM transaction_date) = EXTRACT(MONTH FROM CURRENT_DATE)-1
          THEN amount ELSE 0 END) as previous
       FROM transactions
       WHERE user_id = $1
       GROUP BY category`,
      [userId]
    );

    const trends = result.rows.map(row => {
      const current = Number(row.current);
      const previous = Number(row.previous);

      let change = 0;

      if (previous > 0) {
        change = ((current - previous) / previous) * 100;
      }

      return {
        category: row.category,
        change: change.toFixed(1)
      };
    });

    res.json(trends);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching trends" });
  }
};

exports.getSavingsRate = async (req, res) => {
  try {
    const userId = req.user.userId;

    const totalSpendRes = await pool.query(
      `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id=$1`,
      [userId]
    );

    const totalBudgetRes = await pool.query(
      `SELECT COALESCE(SUM(monthly_limit),0) as total FROM budgets WHERE user_id=$1`,
      [userId]
    );

    const spent = Number(totalSpendRes.rows[0].total);
    const budget = Number(totalBudgetRes.rows[0].total);

    if (budget === 0) {
      return res.json({ savingsRate: 0 });
    }

    const savingsRate = ((budget - spent) / budget) * 100;

    res.json({
      savingsRate: Math.max(0, savingsRate).toFixed(1)
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error calculating savings rate" });
  }
};