const express = require("express");
const router = express.Router();

const { classifyTransaction, listModels, parseReceipt } = require("../controllers/llmController");

router.get("/models", listModels);
router.post("/classify", classifyTransaction);
router.post("/parse-receipt", parseReceipt);

module.exports = router;