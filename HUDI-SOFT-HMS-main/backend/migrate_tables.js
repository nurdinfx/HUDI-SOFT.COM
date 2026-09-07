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
  'lab_audit_logs', 'audit_logs', 'procedures', 'wards', 'hospital_settings'
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

    // ─── 12. hospital_settings sequence in PostgreSQL ─────────────────────────
    try {
      await db.query(`CREATE SEQUENCE IF NOT EXISTS hospital_settings_id_seq;`);
      await db.query(`ALTER TABLE hospital_settings ALTER COLUMN id SET DEFAULT nextval('hospital_settings_id_seq');`);
      await db.query(`SELECT setval('hospital_settings_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM hospital_settings), 0) + 1, 1), false);`);
    } catch(e) {
      console.warn('⚠️  Could not set hospital_settings sequence:', e.message);
    }

    // ─── 13. Drop global unique constraints that violate multi-tenancy ───────
    const globalConstraints = [
      { table: 'opd_visits', constraint: 'opd_visits_visit_id_key' },
      { table: 'patients', constraint: 'patients_patient_id_key' },
      { table: 'appointments', constraint: 'appointments_appointment_id_key' },
      { table: 'ipd_admissions', constraint: 'ipd_admissions_admission_id_key' },
      { table: 'doctors', constraint: 'doctors_doctor_id_key' },
      { table: 'beds', constraint: 'beds_bed_number_key' },
    ];
    for (const item of globalConstraints) {
      try {
        await db.query(`ALTER TABLE ${item.table} DROP CONSTRAINT IF EXISTS ${item.constraint};`);
      } catch(e) { /* ignore */ }
    }

    // Add per-tenant unique constraints so each hospital is unique within its tenant
    const tenantConstraints = [
      { table: 'opd_visits', name: 'opd_visits_tenant_visit_unique', cols: 'tenant_id, visit_id' },
      { table: 'patients', name: 'patients_tenant_patient_unique', cols: 'tenant_id, patient_id' },
      { table: 'appointments', name: 'appointments_tenant_appointment_unique', cols: 'tenant_id, appointment_id' },
      { table: 'ipd_admissions', name: 'ipd_admissions_tenant_admission_unique', cols: 'tenant_id, admission_id' },
      { table: 'doctors', name: 'doctors_tenant_doctor_unique', cols: 'tenant_id, doctor_id' },
      { table: 'beds', name: 'beds_tenant_bed_unique', cols: 'tenant_id, bed_number' },
    ];
    for (const item of tenantConstraints) {
      try {
        await db.query(`ALTER TABLE ${item.table} ADD CONSTRAINT ${item.name} UNIQUE (${item.cols});`);
      } catch(e) { /* ignore if duplicates or already added */ }
    }

    // ─── 14. Ensure core table columns exist ─────────────────────────────────
    const tableColumns = [
      { table: 'patients', cols: ['allergies TEXT DEFAULT \'[]\'', 'chronic_conditions TEXT DEFAULT \'[]\'', 'emergency_contact TEXT', 'emergency_phone TEXT', 'insurance_provider TEXT', 'insurance_policy_number TEXT', 'blood_group TEXT', 'city TEXT', 'registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP', 'last_visit TIMESTAMP', 'notes TEXT'] },
      { table: 'hospital_settings', cols: ['tenant_id TEXT', 'logo TEXT', 'currency TEXT DEFAULT \'USD\'', 'tax_rate NUMERIC DEFAULT 10', 'zaad TEXT', 'sahal TEXT', 'edahab TEXT', 'mycash TEXT', 'pharmacy_zaad TEXT', 'pharmacy_sahal TEXT', 'pharmacy_edahab TEXT', 'pharmacy_mycash TEXT'] },
      { table: 'lab_tests', cols: ['tenant_id TEXT', 'admission_id UUID', 'ordered_by TEXT', 'clinical_notes TEXT', 'is_billed INTEGER DEFAULT 0', 'invoice_id UUID', 'sample_barcode TEXT', 'sample_collected_at TIMESTAMP', 'sample_collected_by TEXT', 'result_entered_by TEXT', 'result_entered_at TIMESTAMP', 'critical_flag INTEGER DEFAULT 0'] },
      { table: 'wards', cols: ['tenant_id TEXT', 'daily_rate NUMERIC DEFAULT 0', 'total_beds INTEGER DEFAULT 0'] },
      { table: 'beds', cols: ['tenant_id TEXT', 'ward_id UUID', 'daily_rate NUMERIC DEFAULT 0'] }
    ];
    for (const item of tableColumns) {
      for (const col of item.cols) {
        try {
          await db.query(`ALTER TABLE ${item.table} ADD COLUMN IF NOT EXISTS ${col};`);
        } catch(e) { /* ignore */ }
      }
    }

    console.log('✅ [Migration] All tables & multi-tenant columns verified/created successfully.');
  } catch (err) {
    console.error('❌ [Migration Error]:', err.message);
  }
};
