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