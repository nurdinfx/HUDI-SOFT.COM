const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, family: 4 });

async function run() {
  try {
    console.log('\n=== PATIENTS BY TENANT ===');
    const p = await pool.query(`SELECT tenant_id, COUNT(*) as count FROM patients GROUP BY tenant_id ORDER BY count DESC`);
    p.rows.forEach(r => console.log(`  tenant: ${r.tenant_id} → ${r.count} patients`));

    console.log('\n=== USERS BY TENANT ===');
    const u = await pool.query(`SELECT tenant_id, email, role FROM users ORDER BY tenant_id`);
    u.rows.forEach(r => console.log(`  ${r.tenant_id} | ${r.email} | ${r.role}`));

    console.log('\n=== NULL tenant_id rows ===');
    const n = await pool.query(`SELECT 'patients' as tbl, COUNT(*) as c FROM patients WHERE tenant_id IS NULL UNION ALL SELECT 'doctors', COUNT(*) FROM doctors WHERE tenant_id IS NULL UNION ALL SELECT 'appointments', COUNT(*) FROM appointments WHERE tenant_id IS NULL`);
    n.rows.forEach(r => console.log(`  ${r.tbl}: ${r.c} rows with NULL tenant_id`));

  } catch(e) { console.error('Error:', e.message); }
  finally { await pool.end(); }
}
run();
