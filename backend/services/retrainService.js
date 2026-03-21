const cron = require("node-cron");
const { exec } = require("child_process");
const path = require("path");

const retrainModel = () => {
  console.log("🔁 Retraining ML model...");

  const scriptPath = path.join(__dirname, "../../ml-service/train.py");
  const pythonPath = path.join(__dirname, "../../../.venv/Scripts/python.exe");

  exec(`"${pythonPath}" "${scriptPath}"`, (error, stdout, stderr) => {
    if (error) {
      console.error("❌ Retrain error:", error);
      return;
    }

    if (stderr) {
      console.error("⚠️ STDERR:", stderr);
      return;
    }

    console.log("✅ Model retrained successfully");
    console.log(stdout);
  });
};

// run every day at midnight
cron.schedule("0 0 * * *", () => {
  retrainModel();
});

module.exports = { retrainModel };