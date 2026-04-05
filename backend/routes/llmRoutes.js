const express = require("express");
const router = express.Router();

const { classifyTransaction, listModels } = require("../controllers/llmController");

router.get("/models", listModels);
router.post("/classify", classifyTransaction);

module.exports = router;