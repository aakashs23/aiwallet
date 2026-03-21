const cron = require("node-cron");
const { exec } = require("child_process");
const path = require("path");
const axios = require("axios");

// 🔁 Main retrain function
const retrainModel = () => {
  console.log("🔁 Retraining ML model...");

  const scriptPath = path.join(__dirname, "../../ml-service/train.py");
  const pythonPath = path.join(__dirname, "../../../.venv/Scripts/python.exe");

  exec(`"${pythonPath}" "${scriptPath}"`, async (error, stdout, stderr) => {
    if (error) {
      console.error("❌ Retrain error:", error.message);
      return;
    }

    if (stderr) {
      console.warn("⚠️ STDERR:", stderr);
      // NOTE: don't return here — warnings are okay
    }

    console.log("✅ Model retrained successfully");
    console.log(stdout);

    // 🔥 NEW: Call FastAPI reload endpoint
    try {
      await axios.post("http://localhost:8000/reload");
      console.log("🔄 ML model reloaded successfully");
    } catch (err) {
      console.error("❌ Reload failed:", err.message);
    }
  });
};

// ⏰ Schedule (daily at midnight)
cron.schedule("0 0 * * *", () => {
  console.log("⏰ Scheduled retraining triggered");
  retrainModel();
});

module.exports = { retrainModel };