/**
 * create-user.js — creates a custom admin user
 * Edit the USER object below then run: node create-user.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const db = new Pool({ connectionString: process.env.DATABASE_URL });

// ── Edit these ──────────────────────────────────────────────────
const USER = {
  email:    'admin@gmail.com',
  password: 'admin123',
  name:     'Admin',
  role:     'admin',
};
// ───────────────────────────────────────────────────────────────

async function run() {
  try {
    // Get all tenant IDs that have settings (active tenants)
    const tenants = await db.query(
      `SELECT DISTINCT tenant_id FROM hospital_settings LIMIT 20`
    );

    if (tenants.rows.length === 0) {
      console.log('No tenants found. Using default tenant.');
      tenants.rows = [{ tenant_id: '00000000-0000-0000-0000-000000000000' }];
    }

    const hash = bcrypt.hashSync(USER.password, 10);
    let created = 0;

    for (const { tenant_id } of tenants.rows) {
      // Check if user already exists in this tenant
      const exists = await db.query(
        `SELECT id FROM users WHERE email = $1 AND tenant_id = $2`,
        [USER.email, tenant_id]
      );

      if (exists.rows.length > 0) {
        // Update password
        await db.query(
          `UPDATE users SET password_hash = $1, name = $2, role = $3, is_active = 1 WHERE email = $4 AND tenant_id = $5`,
          [hash, USER.name, USER.role, USER.email, tenant_id]
        );
        console.log(`✅ Updated existing user in tenant: ${tenant_id}`);
      } else {
        // Create new
        const id = uuidv4();
        await db.query(
          `INSERT INTO users (id, name, email, password_hash, role, is_active, tenant_id, created_at)
           VALUES ($1, $2, $3, $4, $5, 1, $6, CURRENT_TIMESTAMP)`,
          [id, USER.name, USER.email, hash, USER.role, tenant_id]
        );
        console.log(`✅ Created user in tenant: ${tenant_id}`);
        created++;
      }
    }

    console.log(`\n✅ Done! User ready:`);
    console.log(`   Email:    ${USER.email}`);
    console.log(`   Password: ${USER.password}`);
    console.log(`   Role:     ${USER.role}`);
    console.log(`   Tenants:  ${tenants.rows.length}`);

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await db.end();
  }
}

run();
