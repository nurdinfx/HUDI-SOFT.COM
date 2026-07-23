/**
 * tenantQuery.js
 * Utility that wraps db.queryBypassRLS to always add tenant_id filter.
 * Use this in all route files to ensure complete tenant isolation.
 *
 * Usage:
 *   const { tenantQuery, tenantRun } = require('../utils/tenantQuery');
 *
 *   // SELECT — auto adds WHERE tenant_id = $tenantId
 *   const rows = await tenantQuery(tenantId, 'SELECT * FROM patients WHERE status = $1', ['active']);
 *
 *   // INSERT — auto adds tenant_id column + value
 *   await tenantRun(tenantId, 'INSERT INTO patients (id, name) VALUES ($1, $2)', [id, name]);
 */
const db = require('../database');

/**
 * Executes a SELECT/UPDATE/DELETE with automatic tenant_id WHERE clause injection.
 * @param {string} tenantId
 * @param {string} sql - Must use $1, $2 etc. for params
 * @param {Array} params
 * @returns {Array} rows
 */
async function tenantQuery(tenantId, sql, params = []) {
  const tid = tenantId || '00000000-0000-0000-0000-000000000000';
  const upper = sql.trim().toUpperCase();

  // For SELECT queries — add tenant_id filter
  if (upper.startsWith('SELECT')) {
    const hasWhere = upper.includes(' WHERE ');
    const nextParam = params.length + 1;
    const filtered = hasWhere
      ? sql + ` AND tenant_id = $${nextParam}`
      : sql + ` WHERE tenant_id = $${nextParam}`;
    const r = await db.queryBypassRLS(filtered, [...params, tid]);
    return r.rows;
  }

  // For UPDATE — add tenant_id to WHERE
  if (upper.startsWith('UPDATE')) {
    const hasWhere = upper.includes(' WHERE ');
    const nextParam = params.length + 1;
    const filtered = hasWhere
      ? sql + ` AND tenant_id = $${nextParam}`
      : sql + ` WHERE tenant_id = $${nextParam}`;
    const r = await db.queryBypassRLS(filtered, [...params, tid]);
    return r;
  }

  // For DELETE — add tenant_id to WHERE
  if (upper.startsWith('DELETE')) {
    const hasWhere = upper.includes(' WHERE ');
    const nextParam = params.length + 1;
    const filtered = hasWhere
      ? sql + ` AND tenant_id = $${nextParam}`
      : sql + ` WHERE tenant_id = $${nextParam}`;
    const r = await db.queryBypassRLS(filtered, [...params, tid]);
    return r;
  }

  // Default — run as-is
  const r = await db.queryBypassRLS(sql, params);
  return r.rows;
}

/**
 * Executes a SELECT and returns first row only.
 */
async function tenantGet(tenantId, sql, params = []) {
  const rows = await tenantQuery(tenantId, sql, params);
  return rows[0] || null;
}

/**
 * Executes an INSERT with automatic tenant_id column injection.
 * @param {string} tenantId
 * @param {string} sql - INSERT INTO table (col1, col2) VALUES ($1, $2)
 * @param {Array} params
 */
async function tenantRun(tenantId, sql, params = []) {
  const tid = tenantId || '00000000-0000-0000-0000-000000000000';
  const upper = sql.trim().toUpperCase();

  if (upper.startsWith('INSERT')) {
    // Check if tenant_id already in the column list
    if (sql.toLowerCase().includes('tenant_id')) {
      const r = await db.queryBypassRLS(sql, params);
      return r;
    }
    // Inject: INSERT INTO table (cols) VALUES (params) → add tenant_id
    const colsMatch = sql.match(/\(([^)]+)\)\s+VALUES\s*\(/i);
    if (colsMatch) {
      const nextParam = params.length + 1;
      // Find the VALUES (...) closing paren
      const valsStart = sql.toUpperCase().indexOf('VALUES') + 6;
      const valsSection = sql.slice(valsStart).trim(); // starts with (
      const lastParen = valsSection.lastIndexOf(')');
      const newVals = valsSection.slice(0, lastParen) + `, $${nextParam})` + valsSection.slice(lastParen + 1);
      const newCols = colsMatch[0].replace(/\)\s+VALUES\s*\(/, `, tenant_id) VALUES (`);
      const newSql = sql.slice(0, sql.match(/\([^)]+\)\s+VALUES\s*\(/i).index) + newCols + newVals;
      const r = await db.queryBypassRLS(newSql, [...params, tid]);
      return r;
    }
  }

  // UPDATE / DELETE with tenant isolation
  if (upper.startsWith('UPDATE') || upper.startsWith('DELETE')) {
    return tenantQuery(tenantId, sql, params);
  }

  const r = await db.queryBypassRLS(sql, params);
  return r;
}

module.exports = { tenantQuery, tenantGet, tenantRun };
