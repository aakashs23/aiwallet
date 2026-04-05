const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
  getCategorySpending,
  getMonthlySpending,
  getTopMerchants,
  getCategoryTrends,
  getFinancialScore,
  getSavingsRate
} = require("../controllers/analyticsController");

router.get("/categories", authMiddleware, getCategorySpending);
router.get("/monthly", authMiddleware, getMonthlySpending);
router.get("/top-merchants", authMiddleware, getTopMerchants);
router.get("/category-trends", authMiddleware, getCategoryTrends);
router.get("/financial-score", authMiddleware, getFinancialScore);
router.get("/savings-rate", authMiddleware, getSavingsRate);

module.exports = router;