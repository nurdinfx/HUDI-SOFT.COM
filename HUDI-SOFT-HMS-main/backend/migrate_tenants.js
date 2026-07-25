/**
 * migrate_tenants.js
 * Adds tenant_id column to all existing data tables for multi-tenancy.
 * Uses ALTER TABLE IF NOT EXISTS pattern — safe to run multiple times.
 */
const db = require('./database');

const TABLES_WITH_TENANT = [
  'patients',
  'doctors',
  'appointments',
  'medicines',
  'prescriptions',
  'lab_tests',
  'lab_catalog',
  'lab_audit_logs',
  'invoices',
  'opd_visits',
  'ipd_admissions',
  'wards',
  'beds',
  'nurse_notes',
  'doctor_rounds',
  'account_entries',
  'department_budgets',
  'hospital_settings',
  'audit_logs',
  'insurance_companies',
  'patient_insurance_policies',
  'insurance_claims',
  'daily_operations',
  'manual_daily_revenue',
  'users',
  'inventory_items',
  'pos_orders',
  'pos_order_items',
  'pharmacy_transactions',
  'pharmacy_transaction_items',
  'pharmacy_returns',
  'pharmacy_purchases',
  'employees',
  'employee_expenses',
  'employee_ledger',
  'employee_payroll',
  'credit_customers',
  'credit_ledger',
  'credit_transactions',
  'credit_payments',
  'pharmacy_purchase_items',
  'hr_employees',
  'hr_payroll',
  'hr_attendance',
  'patient_credits',
  'credit_transactions',
  'procedures',
  'patient_procedures',
  'vitals',
  'revenue_analytics',
];

module.exports = async function migrateTenants() {
  console.log('🏢 [Tenants] Adding tenant_id to all data tables...');

  for (const table of TABLES_WITH_TENANT) {
    try {
      // Check if table exists first
      const tableCheck = await db.query(
        `SELECT to_regclass('public.${table}') AS exists`
      );
      if (!tableCheck.rows[0]?.exists) continue;

      // Add tenant_id column if it doesn't exist
      await db.query(`
        ALTER TABLE ${table}
        ADD COLUMN IF NOT EXISTS tenant_id UUID
      `);

      // Backfill: assign all existing rows to the first tenant
      await db.query(`
        UPDATE ${table}
        SET tenant_id = (SELECT tenant_id FROM license_info LIMIT 1)
        WHERE tenant_id IS NULL
      `);

      console.log(`  ✅ ${table}: tenant_id added & backfilled`);
    } catch (err) {
      // Table might not exist yet — skip silently
      console.warn(`  ⚠️  ${table}: ${err.message}`);
    }
  }

  console.log('✅ [Tenants] Multi-tenant migration complete');
};
