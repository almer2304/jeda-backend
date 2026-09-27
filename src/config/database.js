const { Pool } = require('pg');

let connectionString = process.env.DATABASE_URL || '';
connectionString = connectionString.trim();
if (connectionString.startsWith('"') && connectionString.endsWith('"')) {
  connectionString = connectionString.substring(1, connectionString.length - 1);
}

const pool = new Pool({
  connectionString: connectionString,
  ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

/**
 * Execute a SQL query against the database pool.
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  if (process.env.NODE_ENV === 'development') {
    console.log('📦 Query executed', { text: text.substring(0, 80), duration: `${duration}ms`, rows: result.rowCount });
  }

  return result;
}

/**
 * Get a client from the pool for transactions.
 * @returns {Promise<import('pg').PoolClient>}
 */
async function getClient() {
  return pool.connect();
}

/**
 * Test database connectivity.
 */
async function testConnection() {
  const client = await pool.connect();
  try {
    await client.query('SELECT NOW()');
  } finally {
    client.release();
  }
}

module.exports = { pool, query, getClient, testConnection };
