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