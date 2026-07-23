const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  family: 4
});

async function run() {
  try {
    const r = await pool.query('SELECT COUNT(*) as cnt FROM users');
    console.log('✅ DB Connected! Users count:', r.rows[0].cnt);
    
    const admins = await pool.query("SELECT email, tenant_id FROM users WHERE email = 'admin@hospital.com'");
    if (admins.rows.length > 0) {
      console.log('✅ admin@hospital.com exists in tenants:', admins.rows.map(r => r.tenant_id).join(', '));
    } else {
      console.log('❌ admin@hospital.com NOT FOUND');
    }
  } catch(e) {
    console.log('❌ DB Error:', e.message);
  } finally {
    await pool.end();
  }
}
run();
