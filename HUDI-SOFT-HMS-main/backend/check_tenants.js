/**
 * check_tenants.js — shows which tenants have data and how much
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');
const db = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const q = async (sql) => { try { return (await db.query(sql)).rows; } catch(e) { return []; } };

    console.log('\n=== TENANTS WITH DATA ===\n');

    const inv = await q(`SELECT tenant_id, COUNT(*) as count FROM invoices GROUP BY tenant_id ORDER BY count DESC`);
    console.log('Invoices by tenant:');
    inv.forEach(r => console.log(`  ${r.tenant_id} → ${r.count} rows`));

    const acc = await q(`SELECT tenant_id, COUNT(*) as count FROM account_entries GROUP BY tenant_id ORDER BY count DESC`);
    console.log('\nAccount entries by tenant:');
    acc.forEach(r => console.log(`  ${r.tenant_id} → ${r.count} rows`));

    const pos = await q(`SELECT tenant_id, COUNT(*) as count FROM pharmacy_transactions GROUP BY tenant_id ORDER BY count DESC`);
    console.log('\nPharmacy transactions by tenant:');
    pos.forEach(r => console.log(`  ${r.tenant_id} → ${r.count} rows`));

    const usr = await q(`SELECT tenant_id, COUNT(*) as count FROM users GROUP BY tenant_id ORDER BY count DESC`);
    console.log('\nUsers by tenant:');
    usr.forEach(r => console.log(`  ${r.tenant_id} → ${r.count} rows`));

    console.log('');
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await db.end();
  }
}
run();
