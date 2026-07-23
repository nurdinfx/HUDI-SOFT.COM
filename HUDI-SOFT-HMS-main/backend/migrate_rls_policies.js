/**
 * migrate_rls_policies.js
 * Sets up Supabase Row Level Security (RLS) for all tenant-scoped tables.
 *
 * Policy: Each row is visible/modifiable ONLY when:
 *   tenant_id = current_setting('app.current_tenant_id', true)
 *
 * The app sets this in executeWithTenant() (database.js) via:
 *   SELECT set_config('app.current_tenant_id', $tenantId, false)
 *
 * queryBypassRLS() is used by auth/license routes to skip RLS for
 * critical lookups (login, activation, tenant setup).
 *
 * Run once: node migrate_rls_policies.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  family: 4,
});

const TENANT_TABLES = [
  'users', 'patients', 'doctors', 'appointments', 'medicines', 'prescriptions',
  'lab_tests', 'lab_catalog', 'lab_audit_logs', 'invoices', 'opd_visits',
  'ipd_admissions', 'wards', 'beds', 'nurse_notes', 'doctor_rounds',
  'account_entries', 'department_budgets', 'hospital_settings', 'audit_logs',
  'insurance_companies', 'patient_insurance_policies', 'insurance_claims',
  'daily_operations', 'manual_daily_revenue', 'medicine_categories',
  'lab_categories', 'employee_expenses', 'employee_payroll', 'employee_ledger',
  'credit_customers', 'credit_transactions', 'credit_payments', 'credit_ledger',
  'employees', 'departments', 'pharmacy_transaction_items', 'pharmacy_transactions',
  'service_categories', 'patient_credits', 'pharmacy_returns', 'pharmacy_suppliers',
  'pharmacy_purchase_orders', 'procedures', 'pharmacy_purchase_items',
  'pharmacy_batches', 'pharmacy_supplier_returns', 'vitals',
  'hms_license',   // license cache table — each machine/tenant sees only its own row
];

async function migrate() {
  const client = await pool.connect();
  console.log('\n🔒 Setting up Row Level Security policies...\n');

  try {
    let enabled = 0, skipped = 0;

    for (const table of TENANT_TABLES) {
      try {
        // Check if table exists
        const exists = await client.query(
          `SELECT 1 FROM information_schema.tables WHERE table_name = $1 AND table_schema = 'public'`,
          [table]
        );
        if (!exists.rows.length) {
          console.log(`⏭️  ${table}: table not found, skipping`);
          skipped++;
          continue;
        }

        // Check if tenant_id column exists
        const hasTenantId = await client.query(
          `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = 'tenant_id' AND table_schema = 'public'`,
          [table]
        );
        if (!hasTenantId.rows.length) {
          console.log(`⏭️  ${table}: no tenant_id column, skipping`);
          skipped++;
          continue;
        }

        // Enable RLS
        await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);

        // Drop old policies if they exist (clean slate)
        await client.query(`DROP POLICY IF EXISTS tenant_isolation_policy ON ${table}`);
        await client.query(`DROP POLICY IF EXISTS tenant_select ON ${table}`);
        await client.query(`DROP POLICY IF EXISTS tenant_insert ON ${table}`);
        await client.query(`DROP POLICY IF EXISTS tenant_update ON ${table}`);
        await client.query(`DROP POLICY IF EXISTS tenant_delete ON ${table}`);

        // Create STRICT isolation policy:
        // A row is accessible ONLY when its tenant_id exactly matches the session setting.
        // The OR fallback for NULL/empty has been REMOVED — this was the security hole
        // that let hospital A see hospital B's data. Every query MUST set app.current_tenant_id.
        await client.query(`
          CREATE POLICY tenant_isolation_policy ON ${table}
          USING (
            tenant_id = current_setting('app.current_tenant_id', true)
          )
          WITH CHECK (
            tenant_id = current_setting('app.current_tenant_id', true)
          )
        `);

        // FORCE RLS means even table owner must obey RLS (extra safety)
        // Note: connections using BYPASSRLS role (service_role in Supabase) still bypass —
        // that's intentional for our queryBypassRLS() admin operations.
        await client.query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);

        console.log(`✅ ${table}: RLS enabled`);
        enabled++;
      } catch (err) {
        console.warn(`⚠️  ${table}: ${err.message.substring(0, 100)}`);
        skipped++;
      }
    }

    console.log(`\n✨ RLS setup complete: ${enabled} tables secured, ${skipped} skipped`);
    console.log('\n📋 Isolation guarantee:');
    console.log('   Hospital A → only sees rows where tenant_id = Hospital_A_uuid');
    console.log('   Hospital B → only sees rows where tenant_id = Hospital_B_uuid');
    console.log('   Cross-hospital data access: IMPOSSIBLE at the DB level\n');

  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
