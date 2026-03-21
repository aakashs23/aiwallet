const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const authMiddleware = require("./middleware/authMiddleware");
const transactionRoutes = require("./routes/transactionRoutes");
const budgetRoutes = require("./routes/budgetRoutes");
const mlRoutes = require("./routes/mlRoutes");

const { retrainModel } = require("./services/retrainService");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/auth", authRoutes);
app.use("/transactions", transactionRoutes);
app.use("/budgets", budgetRoutes);
app.use("/ml", mlRoutes);

app.get("/", (req, res) => {
  res.send("AI Wallet API running 🚀");
});

app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database connection error");
  }
});

app.get("/protected", authMiddleware, (req, res) => {
  res.json({
    message: "Access granted",
    user: req.user
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
