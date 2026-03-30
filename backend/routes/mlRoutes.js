const express = require("express");
const router = express.Router();
const { saveTrainingData, trainModel } = require("../controllers/mlController");
const { retrainModel } = require("../services/retrainService");

router.post("/train", trainModel);
router.post("/save", saveTrainingData);

router.post("/retrain", (req, res) => {
  retrainModel();
  res.json({ message: "Retraining started" });
});

module.exports = router;