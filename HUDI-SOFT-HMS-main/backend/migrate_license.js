/**
 * migrate_license.js
 * Creates license_info table for the SaaS multi-tenant system.
 * Each installation gets a unique tenant_id bound to its license key.
 */
const db = require('./database');

module.exports = async function migrateLicense() {
  try {
    // License info table — one row per tenant installation
    await db.exec(`
      CREATE TABLE IF NOT EXISTS license_info (
        id                SERIAL PRIMARY KEY,
        tenant_id         UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
        license_key       TEXT UNIQUE,
        customer_name     TEXT,
        customer_email    TEXT,
        hospital_name     TEXT DEFAULT 'My Hospital',
        plan              TEXT DEFAULT 'demo',
        status            TEXT DEFAULT 'demo',
        activated_at      TIMESTAMP,
        expires_at        TIMESTAMP,
        last_verified_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        demo_started_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure at least one row exists (the current installation's record)
    const existing = await db.query('SELECT id FROM license_info LIMIT 1');
    if (!existing.rows || existing.rows.length === 0) {
      await db.query(`
        INSERT INTO license_info (hospital_name, status, plan, demo_started_at)
        VALUES ('My Hospital', 'demo', 'demo', CURRENT_TIMESTAMP)
      `);
    }

    console.log('✅ [License] license_info table ready');
  } catch (err) {
    console.error('⚠️ [License] Migration error:', err.message);
  }
};
