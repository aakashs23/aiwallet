const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { detectAnomalies } = require("../controllers/transactionController");
const { detectSubscriptions } = require("../controllers/transactionController");

const {
  addTransaction,
  getTransactions,
  deleteTransaction
} = require("../controllers/transactionController");

router.post("/", authMiddleware, addTransaction);
router.get("/", authMiddleware, getTransactions);
router.delete("/:id", authMiddleware, deleteTransaction);
router.get("/anomalies", authMiddleware, detectAnomalies);
router.get("/subscriptions", authMiddleware, detectSubscriptions);

module.exports = router;