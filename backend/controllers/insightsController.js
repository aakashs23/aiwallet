const pool = require("../config/db");

exports.getInsights = async (req, res) => {
  try {
    const userId = req.user.userId;

    const insights = [];

    // ✅ 1. Total spending
    const totalRes = await pool.query(
      `SELECT SUM(amount) as total FROM transactions WHERE user_id = $1`,
      [userId]
    );

    const total = Number(totalRes.rows[0].total) || 0;

    if (total === 0) {
      return res.json(["No spending data available yet"]);
    }

    // ✅ 2. Category breakdown
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

    // sort descending
    categories.sort((a, b) => b.total - a.total);

    // 🧠 INSIGHT 1 — Top category dominance
    const top = categories[0];
    const topPercent = ((top.total / total) * 100).toFixed(1);

    insights.push({
      type: "spending_pattern",
      priority: "high",
      message: `${top.category} is your highest expense (${topPercent}% of total spending)`
    });

    // 🧠 INSIGHT 2 — Multi-category concentration
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

    // 🧠 INSIGHT 3 — Overspending flag
    if (topPercent > 45) {
      insights.push({
        type: "warning",
        priority: "high",
        message: `High dependency on ${top.category}. Consider reducing this category`
      });
    }

    // 🧠 INSIGHT 4 — Monthly trend
    const monthlyRes = await pool.query(
      `SELECT DATE_TRUNC('month', transaction_date) as month,
              SUM(amount) as total
       FROM transactions
       WHERE user_id = $1
       GROUP BY month
       ORDER BY month DESC
       LIMIT 2`,
      [userId]
    );

    if (monthlyRes.rows.length === 2) {
      const current = Number(monthlyRes.rows[0].total);
      const previous = Number(monthlyRes.rows[1].total);

      if (previous > 0) {
        const change = ((current - previous) / previous) * 100;

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
            message: `Good job! Your spending decreased by ${Math.abs(change).toFixed(1)}%`
          });
        }
      }
    }

    // 🧠 INSIGHT 5 — Low diversity detection
    if (categories.length <= 2) {
      insights.push({
        type: "behavior",
        priority: "low",
        message: `Your spending is concentrated in very few categories`
      });
    }

    // ✅ Sort insights by priority
    const priorityOrder = {
      high: 1,
      medium: 2,
      low: 3,
      positive: 4
    };

    insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // ✅ Return only messages (clean API)
    res.json(insights.map(i => i.message));

    // 🧠 INSIGHT — Budget awareness
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
      [userId, new Date().getMonth() + 1, new Date().getFullYear()]
    );

    const budgets = budgetRes.rows;

    budgets.forEach(b => {
      const spent = Number(b.spent) || 0;
      const budgetLimit = Number(b.monthly_limit) || 0;

      if (budgetLimit === 0) return;

      const percent = (spent / budgetLimit) * 100;

      // 🚨 Overspending
      if (spent > budgetLimit) {
        const excess = spent - budgetLimit;

        insights.push({
          type: "budget_alert",
          priority: "high",
          message: `You exceeded your ${b.category} budget by ₹${excess}`
        });
      }

      // ⚠ Near limit warning
      else if (percent > 80) {
        insights.push({
          type: "budget_warning",
          priority: "medium",
          message: `You are close to your ${b.category} budget (${percent.toFixed(1)}%)`
        });
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error generating insights" });
  }
};

