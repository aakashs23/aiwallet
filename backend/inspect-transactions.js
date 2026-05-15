const pool = require('./config/db');
(async () => {
  try {
    const r = await pool.query("SELECT id,user_id,merchant,amount,transaction_date,created_at FROM transactions ORDER BY created_at DESC LIMIT 50");
    console.log(JSON.stringify(r.rows, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
})();
