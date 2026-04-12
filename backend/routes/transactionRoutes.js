const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { detectAnomalies } = require("../controllers/transactionController");
const { detectSubscriptions } = require("../controllers/transactionController");

const {
  addTransaction,
  getTransactions,
  deleteTransaction,
  updateTransaction,
  bulkAddTransactions
} = require("../controllers/transactionController");

router.post("/bulk", authMiddleware, bulkAddTransactions);
router.post("/", authMiddleware, addTransaction);
router.get("/", authMiddleware, getTransactions);
router.delete("/:id", authMiddleware, deleteTransaction);
router.get("/anomalies", authMiddleware, detectAnomalies);
router.get("/subscriptions", authMiddleware, detectSubscriptions);

router.put("/:id", authMiddleware, updateTransaction);

module.exports = router;