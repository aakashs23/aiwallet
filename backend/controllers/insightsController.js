const pool = require("../config/db");
exports.getInsights = async (req, res) => {
  try {
    const userId = req.user.userId;

    let insights = [];

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    // ✅ TOTAL
    const totalRes = await pool.query(
      `SELECT SUM(amount) as total FROM transactions WHERE user_id = $1`,
      [userId]
    );

    const total = Number(totalRes.rows[0].total) || 0;

    if (total === 0) {
      return res.json([{ message: "No spending data available yet" }]);
    }

    // ✅ CATEGORY
    const categoryRes = await pool.query(
      `SELECT category, SUM(amount) as total
       FROM transactions
       WHERE user_id = $1
       GROUP BY category`,
      [userId]
    );

    const categories = categoryRes.rows.map(c => ({
      category: c.category,
      total: Number(c.total)
    }));

    categories.sort((a, b) => b.total - a.total);

    const top = categories[0];
    const topPercent = ((top.total / total) * 100).toFixed(1);

    insights.push({
      type: "spending_pattern",
      priority: "high",
      message: `${top.category} is your highest expense (${topPercent}% of total spending)`
    });

    if (categories.length >= 2) {
      const second = categories[1];
      const combined = ((top.total + second.total) / total * 100).toFixed(1);

      if (combined > 60) {
        insights.push({
          type: "concentration",
          priority: "medium",
          message: `${top.category} and ${second.category} together account for ${combined}% of your spending`
        });
      }
    }

    if (topPercent > 45) {
      insights.push({
        type: "warning",
        priority: "high",
        message: `High dependency on ${top.category}`
      });
    }

    // ✅ TREND
    const currentRes = await pool.query(
      `SELECT COALESCE(SUM(amount),0) as total
       FROM transactions
       WHERE user_id=$1
       AND EXTRACT(MONTH FROM transaction_date)=$2
       AND EXTRACT(YEAR FROM transaction_date)=$3`,
      [userId, currentMonth, currentYear]
    );

    const lastRes = await pool.query(
      `SELECT COALESCE(SUM(amount),0) as total
       FROM transactions
       WHERE user_id=$1
       AND EXTRACT(MONTH FROM transaction_date)=$2
       AND EXTRACT(YEAR FROM transaction_date)=$3`,
      [userId, lastMonth, lastMonthYear]
    );

    const currentTotal = Number(currentRes.rows[0].total);
    const lastTotal = Number(lastRes.rows[0].total);

    if (lastTotal > 0) {
      const change = ((currentTotal - lastTotal) / lastTotal) * 100;

      if (change > 10) {
        insights.push({
          type: "trend",
          priority: "high",
          message: `Your spending increased by ${change.toFixed(1)}% compared to last month`
        });
      } else if (change < -10) {
        insights.push({
          type: "trend",
          priority: "positive",
          message: `Good job! Spending decreased by ${Math.abs(change).toFixed(1)}%`
        });
      }
    }

    // ✅ SUMMARY
    insights.push({
      type: "summary",
      priority: "low",
      message: `This month you spent ₹${currentTotal}`
    });

    // ✅ BUDGET INSIGHTS
    const budgetRes = await pool.query(
      `SELECT b.category, b.monthly_limit,
              COALESCE(SUM(t.amount), 0) as spent
       FROM budgets b
       LEFT JOIN transactions t
       ON LOWER(b.category) = LOWER(t.category)
       AND t.user_id = b.user_id
       AND EXTRACT(MONTH FROM t.transaction_date) = $2
       AND EXTRACT(YEAR FROM t.transaction_date) = $3
       WHERE b.user_id = $1
       AND b.month = $2
       AND b.year = $3
       GROUP BY b.category, b.monthly_limit`,
      [userId, currentMonth, currentYear]
    );

    budgetRes.rows.forEach(b => {
      const spent = Number(b.spent) || 0;
      const limit = Number(b.monthly_limit) || 0;

      if (limit === 0) return;

      const percent = (spent / limit) * 100;

      if (spent > limit) {
        insights.push({
          type: "budget_alert",
          priority: "high",
          message: `You exceeded your ${b.category} budget by ₹${spent - limit}`
        });
      } else if (percent > 80) {
        insights.push({
          type: "budget_warning",
          priority: "medium",
          message: `You are close to your ${b.category} budget (${percent.toFixed(1)}%)`
        });
      }
    });

    // ✅ SORT
    const priorityOrder = { high: 1, medium: 2, low: 3, positive: 4 };
    insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // ✅ FINAL RESPONSE (ONLY ONCE)
    res.json(insights);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error generating insights" });
  }
};