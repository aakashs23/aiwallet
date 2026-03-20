const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");

exports.setBudget = async (req, res) => {
  try {
    const { category, monthly_limit, month, year } = req.body;
    const userId = req.user.userId;

    const result = await pool.query(
      `INSERT INTO budgets (id, user_id, category, monthly_limit, month, year)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [uuidv4(), userId, category, monthly_limit, month, year]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

exports.getBudgets = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      "SELECT * FROM budgets WHERE user_id=$1",
      [userId]
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

exports.getBudgetInsights = async (req, res) => {
  try {
    const userId = req.user.userId;

    // total spending per category
    const spending = await pool.query(
      `SELECT category, SUM(amount) as total_spent
       FROM transactions
       WHERE user_id = $1
       GROUP BY category`,
      [userId]
    );

    // budgets
    const budgets = await pool.query(
      `SELECT category, monthly_limit
       FROM budgets
       WHERE user_id = $1`,
      [userId]
    );

    // convert budgets to map
    const budgetMap = {};
    budgets.rows.forEach(b => {
      budgetMap[b.category] = Number(b.monthly_limit);
    });

    // compare
    const insights = spending.rows.map(s => {
      const category = s.category;
      const spent = Number(s.total_spent);
      const limit = budgetMap[category] || 0;

      let message = "";

      if (spent > limit) {
        message = `You overspent on ${category} by ₹${spent - limit}`;
      } else {
        message = `You are within budget for ${category}. ₹${limit - spent} remaining`;
      }

      return {
        category,
        spent,
        budget: limit,
        status: spent > limit ? "Overspent" : "Within Budget",
        difference: spent - limit
      };
    });

    res.json(insights);

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

exports.getFinancialScore = async (req, res) => {
  try {
    const userId = req.user.userId;

    let score = 100;
    let insights = [];

    // 1. Check overspending
    const spending = await pool.query(
      `SELECT category, SUM(amount) as total
       FROM transactions
       WHERE user_id=$1
       GROUP BY category`,
      [userId]
    );

    const budgets = await pool.query(
      `SELECT category, monthly_limit
       FROM budgets
       WHERE user_id=$1`,
      [userId]
    );

    const budgetMap = {};
    budgets.rows.forEach(b => {
      budgetMap[b.category] = Number(b.monthly_limit);
    });

    spending.rows.forEach(s => {
      const spent = Number(s.total);
      const limit = budgetMap[s.category] || 0;

      if (spent > limit) {
        score -= 20;
        insights.push(`Overspending in ${s.category}`);
      }
    });

    // 2. Check anomalies
    const anomalies = await pool.query(
      `SELECT amount FROM transactions WHERE user_id=$1`,
      [userId]
    );

    if (anomalies.rows.length > 5) {
      score -= 10;
      insights.push("Irregular spending patterns detected");
    }

    // 3. Check subscriptions count
    const subs = await pool.query(
      `SELECT COUNT(*) FROM transactions
       WHERE user_id=$1 AND merchant IN ('Netflix','Spotify')`,
      [userId]
    );

    if (Number(subs.rows[0].count) > 3) {
      score -= 10;
      insights.push("Too many subscriptions");
    }

    // ensure score not below 0
    if (score < 0) score = 0;

    res.json({
      score,
      status:
        score > 80
          ? "Excellent"
          : score > 60
          ? "Good"
          : score > 40
          ? "Average"
          : "Poor",
      insights
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};