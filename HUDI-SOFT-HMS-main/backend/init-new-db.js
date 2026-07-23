/**
 * init-new-db.js
 * Initializes a fresh Supabase database with the HMS schema and admin user.
 * Run: node init-new-db.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  family: 4,
  connectionTimeoutMillis: 15000
});

async function run() {
  console.log('\n🚀 Initializing new HMS database...\n');
  console.log('DB URL (masked):', process.env.DATABASE_URL?.substring(0, 50) + '...');

  try {
    // Test connection
    await pool.query('SELECT 1');
    console.log('✅ Database connected!\n');
  } catch(e) {
    console.error('❌ Cannot connect to database:', e.message);
    process.exit(1);
  }

  try {
    // Run schema
    console.log('📋 Creating tables from schema.sql...');
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    
    // Split on semicolons and run each statement
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'));
    
    let ok = 0, failed = 0;
    for (const stmt of statements) {
      try {
        await pool.query(stmt);
        ok++;
      } catch(e) {
        // Skip "already exists" errors
        if (e.message.includes('already exists') || e.message.includes('duplicate')) {
          ok++;
        } else {
          console.warn(`  ⚠️ Statement warning: ${e.message.substring(0, 80)}`);
          failed++;
        }
      }
    }
    console.log(`✅ Schema done: ${ok} statements OK, ${failed} warnings\n`);

  } catch(e) {
    console.error('❌ Schema error:', e.message);
  }

  // Create admin user
  try {
    console.log('👤 Creating admin user...');
    const hash = bcrypt.hashSync('admin123', 10);
    const id = uuidv4();
    const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000000';
    
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, is_active, tenant_id, created_at)
       VALUES ($1, 'Admin', 'admin@hospital.com', $2, 'admin', 1, $3, CURRENT_TIMESTAMP)
       ON CONFLICT DO NOTHING`,
      [id, hash, DEFAULT_TENANT]
    );
    console.log('✅ Admin user ready: admin@hospital.com / admin123\n');
  } catch(e) {
    console.warn('⚠️ Admin seed warning:', e.message);
  }

  // Create default hospital settings
  try {
    await pool.query(
      `INSERT INTO hospital_settings (id, name, tagline, currency, tax_rate)
       VALUES (1, 'Hudi Hospital', 'Care with Excellence', 'USD', 10)
       ON CONFLICT (id) DO NOTHING`
    );
    console.log('✅ Hospital settings ready\n');
  } catch(e) {
    console.warn('⚠️ Settings warning:', e.message);
  }

  console.log('🎉 Database initialization complete!');
  console.log('\nLogin credentials:');
  console.log('  Email:    admin@hospital.com');
  console.log('  Password: admin123\n');
  
  await pool.end();
}

run().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
