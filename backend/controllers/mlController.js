const { v4: uuidv4 } = require("uuid");
const pool = require("../config/db");

exports.saveTrainingData = async (req, res) => {
  try {
    const { merchant, category } = req.body;

    if (!merchant || !category) {
      return res.status(400).json({
        message: "merchant and category required"
      });
    }

    await pool.query(
      `INSERT INTO training_data (id, merchant, category)
       VALUES ($1, $2, $3)`,
      [uuidv4(), merchant.toLowerCase(), category]
    );

    res.json({ message: "Training data saved" });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};