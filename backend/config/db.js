const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "ai_wallet",
  password: "aiwallet",
  port: 5432
});

module.exports = pool;