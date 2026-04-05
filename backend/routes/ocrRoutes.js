const express = require("express");
const router = express.Router();

const upload = require("../middleware/upload");
const { processReceipt } = require("../controllers/ocrController");

const authMiddleware = require("../middleware/authMiddleware");

router.post(
  "/scan",
  authMiddleware,                // 🔥 ADD THIS
  upload.single("image"),
  processReceipt
); 

module.exports = router;