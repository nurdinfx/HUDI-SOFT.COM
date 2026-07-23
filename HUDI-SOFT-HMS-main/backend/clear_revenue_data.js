/**
 * clear_revenue_data.js
 * Clears ALL revenue/financial test data from the live Supabase database.
 * Keeps: users, patients, doctors, medicines, settings, appointments.
 *
 * Run:  node clear_revenue_data.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

const db = new Pool({ connectionString: process.env.DATABASE_URL });

const TABLES = [
  'pharmacy_transaction_items',
  'pharmacy_transactions',
  'pharmacy_returns',
  'pharmacy_supplier_returns',
  'pharmacy_purchase_items',
  'pharmacy_purchase_orders',
  'procedures',
  'prescriptions',
  'invoices',
  'account_entries',
  'manual_daily_revenue',
  'daily_operations',
  'insurance_claims',
  'credit_payments',
  'credit_ledger',
  'credit_transactions',
  'employee_payroll',
  'employee_expenses',
  'employee_ledger',
  'audit_logs',
];

async function run() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   HUDI-SOFT HMS — Revenue Data Cleaner       ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // First show what's in the database
  console.log('📊 Checking current data...\n');
  try {
    const check = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM invoices) as invoices,
        (SELECT COUNT(*) FROM account_entries) as accounts,
        (SELECT COUNT(*) FROM pharmacy_transactions) as pharmacy,
        (SELECT COUNT(*) FROM daily_operations) as daily_ops,
        (SELECT COUNT(*) FROM credit_transactions) as credits
    `);
    const r = check.rows[0];
    console.log(`  Invoices:             ${r.invoices}`);
    console.log(`  Account entries:      ${r.accounts}`);
    console.log(`  Pharmacy transactions:${r.pharmacy}`);
    console.log(`  Daily operations:     ${r.daily_ops}`);
    console.log(`  Credit transactions:  ${r.credits}`);
    console.log('');
  } catch(e) {
    console.log('  (Could not pre-check counts)\n');
  }

  let cleared = 0;

  for (const table of TABLES) {
    try {
      const result = await db.query(`DELETE FROM ${table}`);
      const rows = result.rowCount || 0;
      if (rows > 0) {
        console.log(`✅  ${table}: ${rows} rows deleted`);
      } else {
        console.log(`⏭️  ${table}: already empty`);
      }
      cleared++;
    } catch (err) {
      if (err.message.includes('does not exist') || err.message.includes('relation')) {
        console.log(`⏭️  ${table}: not found (skip)`);
      } else {
        console.warn(`⚠️  ${table}: ${err.message}`);
      }
    }
  }

  console.log('\n════════════════════════════════════════════════');
  console.log('✅  Revenue data cleared!');
  console.log('');
  console.log('  Cleared: invoices, POS, accounts, pharmacy,');
  console.log('           daily ops, credits, insurance, audit');
  console.log('');
  console.log('  Kept:    users, patients, doctors, medicines,');
  console.log('           settings, appointments, lab catalog');
  console.log('════════════════════════════════════════════════\n');

  await db.end();
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
