const express = require("express");
const router = express.Router();
const { saveTrainingData } = require("../controllers/mlController");

router.post("/train", saveTrainingData);

module.exports = router;