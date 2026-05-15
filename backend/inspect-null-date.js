const pool = require('./config/db');
(async () => {
  try {
    const r1 = await pool.query("SELECT COUNT(*) FROM transactions WHERE transaction_date IS NULL");
    const r2 = await pool.query("SELECT COUNT(*) FROM transactions WHERE user_id = '71ec76ea-8cf7-4a67-bc04-d1fb6b690f5e' AND transaction_date IS NULL");
    console.log({nullTransactionDateCount: r1.rows[0].count, userNullCount: r2.rows[0].count});
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
})();
