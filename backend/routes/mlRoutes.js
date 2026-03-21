const express = require("express");
const router = express.Router();
const { saveTrainingData } = require("../controllers/mlController");
const { retrainModel } = require("../services/retrainService");

router.post("/train", saveTrainingData);

router.post("/retrain", (req, res) => {
  retrainModel();
  res.json({ message: "Retraining started" });
});

module.exports = router;