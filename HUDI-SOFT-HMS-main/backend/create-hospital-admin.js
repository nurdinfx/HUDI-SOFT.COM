/**
 * Creates admin@hospital.com in ALL tenants in the database
 * Run: node create-hospital-admin.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const db = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    console.log('Creating admin@hospital.com in all tenants...\n');

    // Get all unique tenant IDs from users table
    const tenants = await db.query(
      `SELECT DISTINCT tenant_id FROM users ORDER BY tenant_id`
    );

    console.log(`Found ${tenants.rows.length} tenants\n`);

    const hash = bcrypt.hashSync('admin123', 10);
    let created = 0, updated = 0;

    for (const { tenant_id } of tenants.rows) {
      const exists = await db.query(
        `SELECT id FROM users WHERE email = $1 AND tenant_id = $2`,
        ['admin@hospital.com', tenant_id]
      );

      if (exists.rows.length > 0) {
        await db.query(
          `UPDATE users SET password_hash = $1, name = 'Admin', role = 'admin', is_active = 1 
           WHERE email = $2 AND tenant_id = $3`,
          [hash, 'admin@hospital.com', tenant_id]
        );
        console.log(`✅ Updated in tenant: ${tenant_id}`);
        updated++;
      } else {
        const id = uuidv4();
        await db.query(
          `INSERT INTO users (id, name, email, password_hash, role, is_active, tenant_id, created_at)
           VALUES ($1, 'Admin', 'admin@hospital.com', $2, 'admin', 1, $3, CURRENT_TIMESTAMP)`,
          [id, hash, tenant_id]
        );
        console.log(`✅ Created in tenant: ${tenant_id}`);
        created++;
      }
    }

    // Also create in default tenant
    const defaultTenant = '00000000-0000-0000-0000-000000000000';
    const defaultExists = await db.query(
      `SELECT id FROM users WHERE email = $1 AND tenant_id = $2`,
      ['admin@hospital.com', defaultTenant]
    );
    if (defaultExists.rows.length === 0) {
      const id = uuidv4();
      await db.query(
        `INSERT INTO users (id, name, email, password_hash, role, is_active, tenant_id, created_at)
         VALUES ($1, 'Admin', 'admin@hospital.com', $2, 'admin', 1, $3, CURRENT_TIMESTAMP)`,
        [id, hash, defaultTenant]
      );
      console.log(`✅ Created in default tenant`);
      created++;
    }

    console.log(`\n✅ Done! Created: ${created}, Updated: ${updated}`);
    console.log('\nLogin credentials:');
    console.log('  Email:    admin@hospital.com');
    console.log('  Password: admin123');

  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await db.end();
  }
}

run();
