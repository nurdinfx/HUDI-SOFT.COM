/**
 * init_schema.js
 * Ensures basic PostgreSQL schema tables from schema.sql exist before running delta migrations.
 */
const fs = require('fs');
const path = require('path');
const db = require('./database');

module.exports = async function initSchema() {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      await db.exec(sql);
      console.log('✅ [Schema] Core schema tables verified / initialized');
    }
  } catch (err) {
    console.error('⚠️ [Schema] Initialization error:', err.message);
  }
};
