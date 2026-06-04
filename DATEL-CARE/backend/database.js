/**
 * database.js – PostgreSQL implementation for Supabase
 * Connects to a cloud database for persistence on free tiers.
 */
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl) {
  try {
    const parsed = new URL(databaseUrl);
    console.log('🔌 DB Connection Attempt:', {
      protocol: parsed.protocol,
      host: parsed.hostname,
      port: parsed.port,
      database: parsed.pathname.split('/')[1]
    });
  } catch (e) {
    console.warn('⚠️ DATABASE_URL is not a valid URL format:', databaseUrl.substring(0, 15) + '...');
  }
} else {
  console.error('❌ DATABASE_URL is MISSING in environment variables!');
}

// Pool is created lazily — if DATABASE_URL is missing, queries will fail
// gracefully with a connection error rather than crashing on module load.
const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
      family: 4,                      // Force IPv4 — avoids ENETUNREACH on Render
      connectionTimeoutMillis: 30000,
      max: 3,                         // Supabase free tier limit
      idleTimeoutMillis: 5000,
    })
  : null;

if (pool) {
  pool.on('error', (err) => {
    console.error('❌ Unexpected database pool error:', err.message);
    if (err.code === 'ENETUNREACH') {
      console.error('💡 TIP: Use the Supabase "Transaction Pooler" URL (port 6543), not 5432.');
    }
  });
}

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
function requirePool() {
  if (!pool) throw new Error('DATABASE_URL is not configured. Set it in Render → Environment Variables.');
  return pool;
}

module.exports = {
  prepare(sql) {
    const pgSql = convertSql(sql);
    return {
      async run(...params) {
        try {
          const result = await requirePool().query(pgSql, params);
          return { changes: result.rowCount };
        } catch (err) {
          console.error('❌ DB Run Error:', err.message, '\nSQL:', pgSql);
          throw err;
        }
      },
      async get(...params) {
        try {
          const result = await requirePool().query(pgSql, params);
          return result.rows[0];
        } catch (err) {
          console.error('❌ DB Get Error:', err.message, '\nSQL:', pgSql);
          throw err;
        }
      },
      async all(...params) {
        try {
          const result = await requirePool().query(pgSql, params);
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
      await requirePool().query(pgSql);
    } catch (err) {
      console.error('❌ DB Exec Error:', err.message, '\nSQL:', pgSql);
      throw err;
    }
  },
  async query(sql, params = []) {
    return requirePool().query(sql, params);
  },
  async run(sql) {
    return this.exec(sql);
  },
  get ready() { return pool !== null; },
  get promise() { return Promise.resolve(); }, // Shim for legacy code
};
