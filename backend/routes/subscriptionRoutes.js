const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    await pool.query(
      `DELETE FROM subscriptions WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    res.json({ message: "Subscription deleted" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Delete failed" });
  }
});

module.exports = router;