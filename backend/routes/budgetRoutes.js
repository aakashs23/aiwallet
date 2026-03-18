const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { getBudgetInsights } = require("../controllers/budgetController");

const {
  setBudget,
  getBudgets
} = require("../controllers/budgetController");

router.post("/", authMiddleware, setBudget);
router.get("/", authMiddleware, getBudgets);
router.get("/insights", authMiddleware, getBudgetInsights);

module.exports = router;