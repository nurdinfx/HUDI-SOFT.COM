const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

let poolConfig;

if (connectionString) {
  // When connectionString is provided (e.g. Supabase), do NOT set host/port/database
  // as node-postgres will use host: 'localhost' if both are provided!
  poolConfig = {
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: { rejectUnauthorized: false },
  };
} else {
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'datel_clinic_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  };
}

const pool = new Pool(poolConfig);

pool.on('connect', () => {
  console.log('[DB] PostgreSQL client connected');
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected PostgreSQL error:', err.message);
});

/**
 * Execute a parameterized query.
 * @param {string} text - SQL query
 * @param {Array} params - query parameters
 */
const query = async (text, params) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === 'development') {
    console.log('[DB] query', { text: text.substring(0, 80), duration, rows: res.rowCount });
  }
  return res;
};

/**
 * Get a client from the pool (for transactions).
 */
const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
