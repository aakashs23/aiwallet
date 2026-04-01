const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
  getCategorySpending,
  getMonthlySpending
} = require("../controllers/analyticsController");

router.get("/categories", authMiddleware, getCategorySpending);
router.get("/monthly", authMiddleware, getMonthlySpending);

module.exports = router;