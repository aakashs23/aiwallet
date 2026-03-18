const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  setBudget,
  getBudgets
} = require("../controllers/budgetController");

router.post("/", authMiddleware, setBudget);
router.get("/", authMiddleware, getBudgets);

module.exports = router;