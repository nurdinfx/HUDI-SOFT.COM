/**
 * database.js – PostgreSQL implementation for Supabase
 * Connects to a cloud database for persistence on free tiers.
 */
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

/**
 * Parse DATABASE_URL into individual pg connection params.
 * This avoids the Supabase "tenant/user dot in hostname" DNS bug on Render.
 */
function parseConnectionConfig(urlString) {
  if (!urlString) return null;

  try {
    const url = new URL(urlString);
    const config = {
      host:     url.hostname,
      port:     parseInt(url.port, 10) || 5432,
      database: url.pathname.replace(/^\//, ''),
      user:     decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      ssl:      { rejectUnauthorized: false },
      family:   4,                       // Force IPv4 — fixes ENETUNREACH on Render
      connectionTimeoutMillis: 15000,
      max:      3,                       // Supabase free tier: keep pool small
      idleTimeoutMillis: 10000,
    };

    console.log('🔌 Using DATABASE_URL:', {
      host:     config.host,
      port:     config.port,
      database: config.database,
      user:     config.user,
      ssl:      true,
    });

    return config;
  } catch (e) {
    console.error('❌ DATABASE_URL parse error:', e.message);
    return null;
  }
}

let pool = null;
const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl) {
  const config = parseConnectionConfig(databaseUrl);
  if (config) {
    pool = new Pool(config);
  }
} else {
  console.log('🔌 Using individual DB credentials (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME)');
  pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || 5432, 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
    family: 4,
    connectionTimeoutMillis: 30000,
    max: 3,
    idleTimeoutMillis: 5000
  });
}

pool.on('error', (err) => {
  console.error('❌ Unexpected database pool error:', err.message);
  if (err.code === 'ENETUNREACH') {
    console.error('💡 TIP: This is a network reachability issue. Try using the Supabase "Transaction Pooler" URL (port 6543) instead of 5432.');
  }
});

// Helper to convert SQLite SQL to PostgreSQL SQL
function convertSql(sql) {
  if (!sql) return sql;
  return sql
    .replace(/datetime\('now'\)/g, 'CURRENT_TIMESTAMP')
    .replace(/date\('now'\)/g, 'CURRENT_DATE')
    .replace(/INSERT OR IGNORE/gi, 'INSERT')
    .replace(/BEGIN TRANSACTION/gi, 'BEGIN')
    .replace(/\?/g, (match, offset, string) => {
      // Simple replacement for ? to $1, $2 etc.
      let count = (string.substring(0, offset).match(/\?/g) || []).length + 1;
      return '$' + count;
    });
}

// ------------------------------------------------------------------
// Wrapper for compatibility with existing code
// ------------------------------------------------------------------
module.exports = {
  prepare(sql) {
    const pgSql = convertSql(sql);
    return {
      async run(...params) {
        try {
          const result = await pool.query(pgSql, params);
          return { changes: result.rowCount };
        } catch (err) {
          console.error('❌ DB Run Error:', err.message, '\nSQL:', pgSql);
          throw err;
        }
      },
      async get(...params) {
        try {
          const result = await pool.query(pgSql, params);
          return result.rows[0];
        } catch (err) {
          console.error('❌ DB Get Error:', err.message, '\nSQL:', pgSql);
          throw err;
        }
      },
      async all(...params) {
        try {
          const result = await pool.query(pgSql, params);
          return result.rows;
        } catch (err) {
          console.error('❌ DB All Error:', err.message, '\nSQL:', pgSql);
          throw err;
        }
      }
    };
  },
  async exec(sql) {
    const pgSql = convertSql(sql);
    try {
      await pool.query(pgSql);
    } catch (err) {
      console.error('❌ DB Exec Error:', err.message, '\nSQL:', pgSql);
      throw err;
    }
  },
  async query(sql, params = []) {
    return pool.query(sql, params);
  },
  async run(sql) {
    return this.exec(sql);
  },
  get ready() { return true; }, // Pool is ready on creation
  get promise() { return Promise.resolve(); } // Shim for server.js
};
