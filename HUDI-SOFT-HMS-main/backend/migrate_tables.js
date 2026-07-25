/**
 * migrate_tables.js
 * Ensures all tables have tenant_id columns and all HR/Credit tables exist.
 * Runs on every backend startup — all operations are idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
 *
 * MULTI-TENANCY: Every core table must have a tenant_id column.
 * Existing rows without tenant_id are backfilled with the current license's tenant_id.
 */
const db = require('./database');

// Core tables that need tenant_id for multi-tenant isolation
const CORE_TABLES = [
  'users', 'patients', 'doctors', 'appointments', 'invoices',
  'opd_visits', 'ipd_admissions', 'lab_tests', 'medicines',
  'pharmacy_transactions', 'pharmacy_transaction_items', 'pharmacy_returns',
  'beds', 'nurse_notes', 'doctor_rounds', 'prescriptions',
  'insurance_claims', 'patient_insurance_policies', 'patient_credits',
  'lab_audit_logs', 'audit_logs', 'procedures',
];

module.exports = async function migrateTables() {
  console.log('🔄 [Migration] Checking database schemas and tenant_id columns...');
  try {
    // ─── 1. Add tenant_id to ALL core tables ─────────────────────────────────
    for (const table of CORE_TABLES) {
      try {
        await db.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS tenant_id TEXT`);
      } catch (e) {
        // Table may not exist yet — silently skip
        if (!e.message.includes('does not exist')) {
          console.warn(`⚠️  Could not add tenant_id to ${table}:`, e.message);
        }
      }
    }

    // ─── 2. Backfill NULL tenant_ids with the current installation's tenant ──
    try {
      const licenseRes = await db.query(
        `SELECT tenant_id FROM license_info WHERE status IN ('active','demo') LIMIT 1`
      );
      const tenantId = licenseRes.rows[0]?.tenant_id;
      if (tenantId) {
        for (const table of CORE_TABLES) {
          try {
            await db.query(`UPDATE ${table} SET tenant_id = $1 WHERE tenant_id IS NULL`, [tenantId]);
          } catch (e) {
            // Ignore if table doesn't exist
          }
        }
        console.log(`✅ [Migration] Backfilled NULL tenant_ids with: ${tenantId}`);
      }
    } catch (e) {
      console.warn('⚠️  Could not backfill tenant_ids:', e.message);
    }

    // ─── 3. Employees table ───────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id UUID PRIMARY KEY,
        employee_id TEXT,
        full_name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        position TEXT,
        department TEXT,
        base_salary NUMERIC DEFAULT 0,
        outstanding_balance NUMERIC DEFAULT 0,
        payment_method TEXT DEFAULT 'cash',
        status TEXT DEFAULT 'active',
        tenant_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await db.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS outstanding_balance NUMERIC DEFAULT 0;`);
    await db.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS tenant_id TEXT;`);

    // ─── 4. Employee Expenses ─────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS employee_expenses (
        id UUID PRIMARY KEY,
        employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
        type TEXT DEFAULT 'advance',
        amount NUMERIC DEFAULT 0,
        description TEXT,
        date DATE DEFAULT CURRENT_DATE,
        status TEXT DEFAULT 'pending',
        tenant_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ─── 5. Employee Ledger ───────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS employee_ledger (
        id UUID PRIMARY KEY,
        employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
        type TEXT,
        amount NUMERIC DEFAULT 0,
        description TEXT,
        date DATE DEFAULT CURRENT_DATE,
        tenant_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ─── 6. Employee Payroll ──────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS employee_payroll (
        id UUID PRIMARY KEY,
        employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
        month_year TEXT,
        base_salary NUMERIC DEFAULT 0,
        bonuses NUMERIC DEFAULT 0,
        deductions NUMERIC DEFAULT 0,
        net_salary NUMERIC DEFAULT 0,
        status TEXT DEFAULT 'processed',
        tenant_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ─── 7. Credit Customers ──────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS credit_customers (
        id UUID PRIMARY KEY,
        customer_id TEXT,
        full_name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        patient_id UUID,
        credit_limit NUMERIC DEFAULT 1000,
        outstanding_balance NUMERIC DEFAULT 0,
        total_credit_taken NUMERIC DEFAULT 0,
        total_payments_made NUMERIC DEFAULT 0,
        status TEXT DEFAULT 'active',
        tenant_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await db.query(`ALTER TABLE credit_customers ADD COLUMN IF NOT EXISTS outstanding_balance NUMERIC DEFAULT 0;`);
    await db.query(`ALTER TABLE credit_customers ADD COLUMN IF NOT EXISTS total_credit_taken NUMERIC DEFAULT 0;`);
    await db.query(`ALTER TABLE credit_customers ADD COLUMN IF NOT EXISTS total_payments_made NUMERIC DEFAULT 0;`);
    await db.query(`ALTER TABLE credit_customers ADD COLUMN IF NOT EXISTS tenant_id TEXT;`);

    // ─── 8. Credit Ledger ─────────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS credit_ledger (
        id UUID PRIMARY KEY,
        customer_id UUID REFERENCES credit_customers(id) ON DELETE CASCADE,
        type TEXT,
        amount NUMERIC DEFAULT 0,
        description TEXT,
        tenant_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ─── 9. Credit Transactions ───────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS credit_transactions (
        id UUID PRIMARY KEY,
        customer_id UUID REFERENCES credit_customers(id) ON DELETE CASCADE,
        invoice_id UUID,
        amount NUMERIC DEFAULT 0,
        description TEXT,
        date DATE DEFAULT CURRENT_DATE,
        status TEXT DEFAULT 'unpaid',
        tenant_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ─── 10. Credit Payments ──────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS credit_payments (
        id UUID PRIMARY KEY,
        customer_id UUID REFERENCES credit_customers(id) ON DELETE CASCADE,
        amount NUMERIC DEFAULT 0,
        payment_method TEXT DEFAULT 'cash',
        reference_number TEXT,
        date DATE DEFAULT CURRENT_DATE,
        tenant_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ─── 11. Ensure is_viewed_by_doctor column for appointments ──────────────
    try {
      await db.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS is_viewed_by_doctor BOOLEAN DEFAULT FALSE;`);
    } catch(e) { /* ignore */ }

    console.log('✅ [Migration] All tables & multi-tenant columns verified/created successfully.');
  } catch (err) {
    console.error('❌ [Migration Error]:', err.message);
  }
};
