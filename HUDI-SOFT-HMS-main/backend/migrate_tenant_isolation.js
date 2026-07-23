const db = require('./database');
const { columnExists, getTableState } = require('./utils/schema');

async function migrate() {
    console.log('🚀 Starting Multi-Tenant Isolation Migration...');

    const tablesToScope = [
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
        'pharmacy_purchase_orders', 'push_subscriptions', 'procedures', 'pharmacy_purchase_items',
        'pharmacy_batches', 'pharmacy_supplier_returns', 'vitals', 'hms_license'
    ];

    try {
        for (const tableName of tablesToScope) {
            const state = await getTableState(tableName);
            if (!state.exists) {
                console.log(`ℹ️ Table ${tableName} does not exist yet. Skipping.`);
                continue;
            }

            const hasTenantId = await columnExists(tableName, 'tenant_id');
            if (!hasTenantId) {
                if (!state.isOwner) {
                    console.log(`ℹ️ Skipping tenant_id migration for ${tableName}: current DB user is not the table owner.`);
                    continue;
                }
                console.log(`➕ Adding tenant_id to table: ${tableName}`);
                await db.exec(`ALTER TABLE ${tableName} ADD COLUMN tenant_id VARCHAR(255) DEFAULT '00000000-0000-0000-0000-000000000000'`);
            } else {
                console.log(`✅ Table ${tableName} already has tenant_id column.`);
            }

            if (!state.isOwner) {
                console.log(`ℹ️ Skipping tenant_id index for ${tableName}: current DB user is not the table owner.`);
                continue;
            }

            await db.exec(`CREATE INDEX IF NOT EXISTS idx_${tableName}_tenant_id ON ${tableName}(tenant_id)`);
        }

        console.log('🔄 Reconfiguring constraints for multi-tenant isolation...');

        const uniqueConstraints = [
            { table: 'users', col: 'email', name: 'users_email_key', composite: 'tenant_id, email' },
            { table: 'patients', col: 'patient_id', name: 'patients_patient_id_key', composite: 'tenant_id, patient_id' },
            { table: 'doctors', col: 'doctor_id', name: 'doctors_doctor_id_key', composite: 'tenant_id, doctor_id' },
            { table: 'appointments', col: 'appointment_id', name: 'appointments_appointment_id_key', composite: 'tenant_id, appointment_id' },
            { table: 'prescriptions', col: 'prescription_id', name: 'prescriptions_prescription_id_key', composite: 'tenant_id, prescription_id' },
            { table: 'lab_tests', col: 'test_id', name: 'lab_tests_test_id_key', composite: 'tenant_id, test_id' },
            { table: 'invoices', col: 'invoice_id', name: 'invoices_invoice_id_key', composite: 'tenant_id, invoice_id' },
            { table: 'opd_visits', col: 'visit_id', name: 'opd_visits_visit_id_key', composite: 'tenant_id, visit_id' },
            { table: 'ipd_admissions', col: 'admission_id', name: 'ipd_admissions_admission_id_key', composite: 'tenant_id, admission_id' },
            { table: 'beds', col: 'bed_number', name: 'beds_bed_number_key', composite: 'tenant_id, bed_number' },
            { table: 'department_budgets', col: 'department', name: 'department_budgets_department_key', composite: 'tenant_id, department' },
            { table: 'insurance_claims', col: 'claim_id', name: 'insurance_claims_claim_id_key', composite: 'tenant_id, claim_id' },
            { table: 'credit_customers', col: 'customer_id', name: 'credit_customers_customer_id_key', composite: 'tenant_id, customer_id' },
            { table: 'credit_transactions', col: 'transaction_id', name: 'credit_transactions_transaction_id_key', composite: 'tenant_id, transaction_id' },
            { table: 'credit_payments', col: 'payment_id', name: 'credit_payments_payment_id_key', composite: 'tenant_id, payment_id' }
        ];

        for (const constraint of uniqueConstraints) {
            const state = await getTableState(constraint.table);
            if (!state.exists) {
                console.log(`ℹ️ Skipping uniqueness update for ${constraint.table}: table does not exist.`);
                continue;
            }
            if (!state.isOwner) {
                console.log(`ℹ️ Skipping uniqueness update for ${constraint.table}: current DB user is not the table owner.`);
                continue;
            }
            if (!await columnExists(constraint.table, 'tenant_id')) {
                console.log(`ℹ️ Skipping uniqueness update for ${constraint.table}: tenant_id column is missing.`);
                continue;
            }

            await db.exec(`ALTER TABLE ${constraint.table} DROP CONSTRAINT IF EXISTS ${constraint.name}`);
            await db.exec(`ALTER TABLE ${constraint.table} DROP CONSTRAINT IF EXISTS ${constraint.table}_tenant_${constraint.col}_key`);
            await db.exec(`ALTER TABLE ${constraint.table} ADD CONSTRAINT ${constraint.table}_tenant_${constraint.col}_key UNIQUE (${constraint.composite})`);
            console.log(`✅ Updated uniqueness constraint for table ${constraint.table}: UNIQUE(${constraint.composite})`);
        }

        const revenueState = await getTableState('manual_daily_revenue');
        if (!revenueState.exists) {
            console.log('ℹ️ Skipping manual_daily_revenue composite constraint update: table does not exist.');
        } else if (!revenueState.isOwner) {
            console.log('ℹ️ Skipping manual_daily_revenue composite constraint update: current DB user is not the table owner.');
        } else if (!await columnExists('manual_daily_revenue', 'tenant_id')) {
            console.log('ℹ️ Skipping manual_daily_revenue composite constraint update: tenant_id column is missing.');
        } else {
            await db.exec(`ALTER TABLE manual_daily_revenue DROP CONSTRAINT IF EXISTS manual_daily_revenue_date_department_category_key`);
            await db.exec(`ALTER TABLE manual_daily_revenue DROP CONSTRAINT IF EXISTS manual_daily_revenue_tenant_date_dept_cat_key`);
            await db.exec(`ALTER TABLE manual_daily_revenue ADD CONSTRAINT manual_daily_revenue_tenant_date_dept_cat_key UNIQUE (tenant_id, date, department, category)`);
            console.log(`✅ Updated manual_daily_revenue composite constraint.`);
        }



        console.log('✨ Multi-Tenant Isolation Migration completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        throw err;
    }
}

module.exports = migrate;
if (require.main === module) {
    migrate().then(() => process.exit(0)).catch(() => process.exit(1));
}
