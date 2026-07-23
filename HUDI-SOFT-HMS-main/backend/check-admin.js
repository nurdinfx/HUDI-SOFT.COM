/**
 * check-admin.js — checks if admin user exists and tests login
 * Run: node check-admin.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const db = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    console.log('\n=== Checking admin users in database ===\n');

    // Find all admin users
    const result = await db.query(
      `SELECT id, name, email, role, is_active, tenant_id FROM users WHERE role = 'admin' ORDER BY created_at`
    );

    if (result.rows.length === 0) {
      console.log('❌ NO ADMIN USERS FOUND!');
      console.log('\nCreating admin user...');
      
      const bcryptjs = require('bcryptjs');
      const { v4: uuidv4 } = require('uuid');
      const id = uuidv4();
      const hash = await bcryptjs.hash('admin123', 10);
      
      await db.query(
        `INSERT INTO users (id, name, email, password_hash, role, is_active, tenant_id, created_at)
         VALUES ($1, 'Admin', 'admin@hospital.com', $2, 'admin', 1, '00000000-0000-0000-0000-000000000000', CURRENT_TIMESTAMP)
         ON CONFLICT (email, tenant_id) DO NOTHING`,
        [id, hash]
      );
      console.log('✅ Admin user created: admin@hospital.com / admin123');
    } else {
      console.log(`Found ${result.rows.length} admin user(s):\n`);
      result.rows.forEach(u => {
        console.log(`  Email:     ${u.email}`);
        console.log(`  Name:      ${u.name}`);
        console.log(`  Role:      ${u.role}`);
        console.log(`  Active:    ${u.is_active}`);
        console.log(`  Tenant:    ${u.tenant_id}`);
        console.log('');
      });
    }

    // Test password for admin@hospital.com
    const admin = await db.query(
      `SELECT password_hash FROM users WHERE email = 'admin@hospital.com' LIMIT 1`
    );
    if (admin.rows.length > 0) {
      const valid = bcrypt.compareSync('admin123', admin.rows[0].password_hash);
      console.log(`Password test (admin123): ${valid ? '✅ CORRECT' : '❌ WRONG'}`);
      if (!valid) {
        console.log('\nResetting password to admin123...');
        const newHash = bcrypt.hashSync('admin123', 10);
        await db.query(`UPDATE users SET password_hash = $1 WHERE email = 'admin@hospital.com'`, [newHash]);
        console.log('✅ Password reset done');
      }
    }

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await db.end();
  }
}

run();
