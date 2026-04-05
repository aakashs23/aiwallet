const pool = require('./config/db');

async function updateReasons() {
  try {
    const result = await pool.query(`
      UPDATE transactions
      SET reason = 'Predicted from merchant "' || merchant || '"'
      WHERE source = 'ml' AND (reason IS NULL OR reason = '')
    `);
    console.log('Updated', result.rowCount, 'rows');
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

updateReasons();