/**
 * database.js – PostgreSQL implementation for Supabase
 * Connects to a cloud database for persistence on free tiers.
 */
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

let databaseUrl = process.env.DATABASE_URL;
if (databaseUrl) {
  databaseUrl = databaseUrl.trim();
  if (databaseUrl.startsWith('DATABASE_URL=')) {
    databaseUrl = databaseUrl.substring(13).trim();
  }
  if ((databaseUrl.startsWith('"') && databaseUrl.endsWith('"')) || 
      (databaseUrl.startsWith("'") && databaseUrl.endsWith("'"))) {
    databaseUrl = databaseUrl.substring(1, databaseUrl.length - 1).trim();
  }
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

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false
  },
  // Force IPv4 to avoid ENETUNREACH errors on environments with poor IPv6 support
  family: 4,
  connectionTimeoutMillis: 15000, 
  max: 3, // Lowered to 3 to be extremely safe for Supabase session mode
  idleTimeoutMillis: 5000 // Lowered to 5s to release connections almost immediately
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database pool error:', err.message);
  if (err.code === 'ENETUNREACH') {
    console.error('💡 TIP: This is a network reachability issue. Try using the Supabase "Transaction Pooler" URL (port 6543) instead of 5432.');
  }
});

// Tables that have tenant_id and should be automatically scoped
const TENANT_SCOPED_TABLES = new Set([
  'users','patients','doctors','appointments','medicines','prescriptions',
  'lab_tests','lab_catalog','lab_audit_logs','invoices','opd_visits',
  'ipd_admissions','wards','beds','nurse_notes','doctor_rounds',
  'account_entries','department_budgets','hospital_settings','audit_logs',
  'insurance_companies','patient_insurance_policies','insurance_claims',
  'daily_operations','manual_daily_revenue','medicine_categories',
  'lab_categories','employee_expenses','employee_payroll','employee_ledger',
  'credit_customers','credit_transactions','credit_payments','credit_ledger',
  'employees','departments','pharmacy_transaction_items','pharmacy_transactions',
  'service_categories','patient_credits','pharmacy_returns','pharmacy_suppliers',
  'pharmacy_purchase_orders','push_subscriptions','procedures','pharmacy_purchase_items',
  'pharmacy_batches','pharmacy_supplier_returns','vitals','inventory',
  'pharmacy_supplier_return_items',
]);

// Extract the primary table name from a SQL statement
function extractTableName(sql) {
  const normalized = sql.trim().toUpperCase();
  let match;
  // SELECT ... FROM table / UPDATE table / DELETE FROM table
  match = normalized.match(/(?:FROM|UPDATE|INTO|JOIN)\s+([A-Z_][A-Z0-9_]*)/);
  if (match) return match[1].toLowerCase();
  return null;
}

// Inject tenant_id into INSERT statements automatically
function injectTenantInsert(sql, params, tenantId) {
  if (!tenantId || tenantId === '00000000-0000-0000-0000-000000000000') return { sql, params };
  
  const upper = sql.trim().toUpperCase();
  if (!upper.startsWith('INSERT')) return { sql, params };
  
  // Extract table name from INSERT INTO tablename (...)
  const tableMatch = sql.match(/INSERT\s+INTO\s+([a-z_][a-z0-9_]*)\s*\(/i);
  if (!tableMatch) return { sql, params };
  
  const tableName = tableMatch[1].toLowerCase();
  if (!TENANT_SCOPED_TABLES.has(tableName)) return { sql, params };
  
  // Check if tenant_id is already in the column list
  const colsMatch = sql.match(/\(([^)]+)\)\s+VALUES/i);
  if (!colsMatch) return { sql, params };
  
  const cols = colsMatch[1];
  if (cols.toLowerCase().includes('tenant_id')) return { sql, params }; // already there
  
  // Add tenant_id to columns and value placeholder
  const newCols = cols + ', tenant_id';
  const newSql = sql.replace(colsMatch[0], `(${newCols}) VALUES`);
  
  // Add tenant value - find VALUES (...) section and add placeholder
  const valsMatch = newSql.match(/VALUES\s*\(([^)]+)\)/i);
  if (!valsMatch) return { sql, params };
  
  const nextParamIndex = (params.length) + 1;
  const newVals = valsMatch[1] + `, $${nextParamIndex}`;
  const finalSql = newSql.replace(valsMatch[0], `VALUES (${newVals})`);
  const newParams = [...params, tenantId];
  
  return { sql: finalSql, params: newParams };
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

async function executeWithTenant(callback, options = {}) {
  const client = await pool.connect();
  const store = global.tenantStorage ? global.tenantStorage.getStore() : null;
  const tenantId = store || '00000000-0000-0000-0000-000000000000';
  
  try {
    // Always set the tenant config — RLS policies use current_setting('app.current_tenant_id')
    await client.query(`SELECT set_config('app.current_tenant_id', $1, false)`, [tenantId]);
    
    return await callback(client, tenantId);
  } finally {
    client.release();
  }
}


// ------------------------------------------------------------------
// Wrapper for compatibility with existing code
// Auto-injects tenant_id into INSERT and WHERE clauses
// ------------------------------------------------------------------
module.exports = {
  prepare(sql) {
    const pgSql = convertSql(sql);
    return {
      async run(...params) {
        try {
          return await executeWithTenant(async (client, tenantId) => {
            // Auto-inject tenant_id into INSERT statements
            let finalSql = pgSql;
            let finalParams = params;
            if (pgSql.trim().toUpperCase().startsWith('INSERT')) {
              const injected = injectTenantInsert(pgSql, params, tenantId);
              finalSql = injected.sql;
              finalParams = injected.params;
            }
            const result = await client.query(finalSql, finalParams);
            return { changes: result.rowCount };
          });
        } catch (err) {
          console.error('❌ DB Run Error:', err.message, '\nSQL:', pgSql);
          throw err;
        }
      },
      async get(...params) {
        try {
          return await executeWithTenant(async (client) => {
            const result = await client.query(pgSql, params);
            return result.rows[0];
          });
        } catch (err) {
          console.error('❌ DB Get Error:', err.message, '\nSQL:', pgSql);
          throw err;
        }
      },
      async all(...params) {
        try {
          return await executeWithTenant(async (client) => {
            const result = await client.query(pgSql, params);
            return result.rows;
          });
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
      await executeWithTenant(async (client) => {
        await client.query(pgSql);
      });
    } catch (err) {
      console.error('❌ DB Exec Error:', err.message, '\nSQL:', pgSql);
      throw err;
    }
  },
  async query(sql, params = []) {
    try {
      return await executeWithTenant(async (client) => {
        return await client.query(sql, params);
      });
    } catch (err) {
      console.error('❌ DB Query Error:', err.message, '\nSQL:', sql);
      throw err;
    }
  },
  async queryBypassRLS(sql, params = []) {
    const pgSql = convertSql(sql);
    const client = await pool.connect();
    try {
      return await client.query(pgSql, params);
    } catch (err) {
      console.error('❌ DB queryBypassRLS Error:', err.message, '\nSQL:', pgSql);
      throw err;
    } finally {
      client.release();
    }
  },
  async run(sql) {
    return this.exec(sql);
  },
  // Expose tenant injection helper for routes that need it
  injectTenantInsert,
  getCurrentTenantId() {
    return global.tenantStorage ? global.tenantStorage.getStore() : '00000000-0000-0000-0000-000000000000';
  },
  get ready() { return true; },
  get promise() { return Promise.resolve(); }
};
