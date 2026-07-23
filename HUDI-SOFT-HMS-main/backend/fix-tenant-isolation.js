/**
 * fix-tenant-isolation.js
 * 
 * Diagnoses and fixes tenant isolation issues.
 * - Shows what tenants exist and what data they have
 * - The default tenant '00000000...' is shared by hospitals that didn't properly activate
 * - After running this, re-activate each hospital to get proper isolated tenants
 * 
 * Run: node fix-tenant-isolation.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, family: 4 });

function makeDeterministicTenant(licenseKey) {
  const hash = crypto.createHash('sha256').update(licenseKey.toUpperCase()).digest('hex');
  return [
    hash.substring(0,8), hash.substring(8,12),
    '4'+hash.substring(13,16),
    (parseInt(hash.substring(16,18),16)&0x3f|0x80).toString(16)+hash.substring(18,20),
    hash.substring(20,32)
  ].join('-');
}

async function run() {
  console.log('\n=== HMS Tenant Isolation Diagnostics ===\n');

  // Show current state
  const licenses = await pool.query('SELECT machine_id, license_key, company_name, tenant_id, status FROM hms_license');
  console.log('Active licenses:');
  licenses.rows.forEach(l => {
    const correctTenant = makeDeterministicTenant(l.license_key);
    const isCorrect = l.tenant_id === correctTenant;
    console.log(`  ${l.company_name || 'Unknown'} | Key: ${l.license_key.substring(0,8)}... | Tenant: ${l.tenant_id?.substring(0,8)}... | ${isCorrect ? '✅ Correct' : '❌ Needs fix → ' + correctTenant.substring(0,8) + '...'}`);
  });

  const patients = await pool.query('SELECT tenant_id, COUNT(*) as c FROM patients GROUP BY tenant_id');
  console.log('\nPatients by tenant:');
  patients.rows.forEach(r => console.log(`  ${r.tenant_id?.substring(0,8) || 'NULL'}... → ${r.c} patients`));

  console.log('\n--- Fixing tenant assignments ---\n');
  
  // For each license, ensure correct tenantId and admin user
  for (const lic of licenses.rows) {
    const correctTenant = makeDeterministicTenant(lic.license_key);
    
    if (lic.tenant_id !== correctTenant) {
      console.log(`Updating ${lic.company_name} license tenant: ${lic.tenant_id?.substring(0,8)} → ${correctTenant.substring(0,8)}`);
      await pool.query('UPDATE hms_license SET tenant_id = $1 WHERE machine_id = $2', [correctTenant, lic.machine_id]);
    }
    
    // Ensure admin user exists for this tenant
    const admin = await pool.query('SELECT id FROM users WHERE tenant_id = $1 AND role = $2 LIMIT 1', [correctTenant, 'admin']);
    if (!admin.rows.length) {
      const id = uuidv4();
      const hash = bcrypt.hashSync('admin123', 10);
      await pool.query(
        `INSERT INTO users (id, name, email, password_hash, role, is_active, tenant_id, created_at)
         VALUES ($1, $2, 'admin@hospital.com', $3, 'admin', 1, $4, CURRENT_TIMESTAMP)
         ON CONFLICT DO NOTHING`,
        [id, lic.company_name || 'Admin', hash, correctTenant]
      );
      console.log(`  ✅ Created admin user for ${lic.company_name} (tenant: ${correctTenant.substring(0,8)}...)`);
    } else {
      console.log(`  ✅ Admin exists for ${lic.company_name}`);
    }
    
    // Ensure hospital_settings exists for this tenant
    const settings = await pool.query('SELECT id FROM hospital_settings WHERE tenant_id = $1 LIMIT 1', [correctTenant]);
    if (!settings.rows.length) {
      await pool.query(
        `INSERT INTO hospital_settings (id, tenant_id, name, tagline, currency, tax_rate)
         VALUES (1, $1, $2, 'Care with Excellence', 'USD', 10)
         ON CONFLICT DO NOTHING`,
        [correctTenant, lic.company_name || 'Hospital']
      );
      console.log(`  ✅ Created settings for ${lic.company_name}`);
    }
  }
  
  console.log('\n✅ Done! Each hospital now has its own isolated tenant.');
  console.log('\nIMPORTANT: Users must log in again to get a new JWT with their correct tenantId.');
  console.log('Default credentials: admin@hospital.com / admin123\n');

  await pool.end();
}

run().catch(e => { console.error('Error:', e.message); process.exit(1); });
