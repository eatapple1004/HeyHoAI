const { Pool } = require('pg');
const { env } = require('../config');
const log = require('../lib/logger')('DB');

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  log.error('Pool error:', err.message);
});

/**
 * @param {string} text
 * @param {any[]} [params]
 */
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (env.NODE_ENV === 'development') {
    log.debug(text.slice(0, 80), `${duration}ms`, `rows:${result.rowCount}`);
  }
  return result;
}

module.exports = { pool, query };
