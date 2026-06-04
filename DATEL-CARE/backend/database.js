/**
 * database.js – PostgreSQL (Supabase) connection
 *
 * KEY FIX: Supabase Transaction Pooler usernames contain a dot
 * (e.g. postgres.pfythhjtdvavhpjnrzdk). When passed as a raw URL string
 * to the `pg` driver, some DNS resolvers treat the dot as a subdomain and
 * fail with ENOTFOUND. We parse the URL and pass individual connection
 * params instead, which bypasses this DNS issue entirely.
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const databaseUrl = process.env.DATABASE_URL;

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

    console.log('🔌 DB config:', {
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

if (databaseUrl) {
  const config = parseConnectionConfig(databaseUrl);
  if (config) {
    pool = new Pool(config);
    pool.on('error', (err) => {
      // Log pool errors but never crash the process
      console.error('❌ DB pool error:', err.message);
    });
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
  pool.on('error', (err) => {
    // Log pool errors but never crash the process
    console.error('❌ DB pool error:', err.message);
  });
}

// ─── SQL compatibility shim (SQLite → PostgreSQL) ─────────────────────────────
function convertSql(sql) {
  if (!sql) return sql;
  let i = 0;
  return sql
    .replace(/datetime\('now'\)/gi, 'CURRENT_TIMESTAMP')
    .replace(/date\('now'\)/gi,     'CURRENT_DATE')
    .replace(/INSERT OR IGNORE/gi,  'INSERT')
    .replace(/BEGIN TRANSACTION/gi, 'BEGIN')
    .replace(/\?/g, () => `$${++i}`);
}

// ─── Pool guard ───────────────────────────────────────────────────────────────
function getPool() {
  if (!pool) {
    throw new Error(
      'Database not configured. Set DATABASE_URL in Render → Environment Variables.'
    );
  }
  return pool;
}

// ─── Public DB module ─────────────────────────────────────────────────────────
module.exports = {
  /**
   * prepare(sql) — returns an object with .run(), .get(), .all()
   * Matches the better-sqlite3 API so existing route code works unchanged.
   */
  prepare(sql) {
    const pgSql = convertSql(sql);
    return {
      async run(...params) {
        const res = await getPool().query(pgSql, params);
        return { changes: res.rowCount };
      },
      async get(...params) {
        const res = await getPool().query(pgSql, params);
        return res.rows[0] ?? null;
      },
      async all(...params) {
        const res = await getPool().query(pgSql, params);
        return res.rows;
      },
    };
  },

  /** exec(sql) — run a raw SQL string with no params (used by migrations) */
  async exec(sql) {
    const pgSql = convertSql(sql);
    try {
      await getPool().query(pgSql);
    } catch (err) {
      console.error('❌ DB Exec Error:', err.message);
      console.error('   SQL:', pgSql.substring(0, 120));
      throw err;
    }
  },

  /** query(sql, params) — direct pg query, returns full result object */
  async query(sql, params = []) {
    return getPool().query(sql, params);
  },

  /** run(sql) — alias for exec, used by some legacy callers */
  async run(sql) {
    return this.exec(sql);
  },

  get ready()   { return pool !== null; },
  get promise() { return Promise.resolve(); }, // Legacy shim
};
