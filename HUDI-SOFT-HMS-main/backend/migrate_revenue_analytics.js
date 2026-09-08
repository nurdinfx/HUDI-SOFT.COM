/**
 * migrate_revenue_analytics.js
 * Creates departments and service_categories tables for dynamic reporting.
 */
const db = require('./database');
const { v4: uuidv4 } = require('uuid');

async function migrate() {
    try {
        console.log('🚀 Starting Revenue Analytics Migration...');

        // 1. Create Departments Table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS departments (
                id UUID PRIMARY KEY,
                name TEXT NOT NULL,
                code TEXT,
                is_active INTEGER DEFAULT 1,
                tenant_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        try {
            await db.query(`ALTER TABLE departments ADD COLUMN IF NOT EXISTS tenant_id TEXT`);
            // Drop global unique constraint on name so each tenant can have their own standard departments
            await db.query(`ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_name_key`);
            await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_departments_tenant_name ON departments(tenant_id, name)`);
        } catch (e) {}
        console.log('✅ Departments table created/verified');

        // 2. Create Service Categories Table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS service_categories (
                id UUID PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                is_active INTEGER DEFAULT 1,
                tenant_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        try {
            await db.query(`ALTER TABLE service_categories ADD COLUMN IF NOT EXISTS tenant_id TEXT`);
            // Drop global unique constraint on name so each tenant can have their own standard categories
            await db.query(`ALTER TABLE service_categories DROP CONSTRAINT IF EXISTS service_categories_name_key`);
            await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_service_categories_tenant_name ON service_categories(tenant_id, name)`);
        } catch (e) {}
        console.log('✅ Service Categories table created/verified');

        // 3. Create Manual Daily Revenue Table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS manual_daily_revenue (
                id UUID PRIMARY KEY,
                date DATE NOT NULL,
                department TEXT NOT NULL,
                category TEXT NOT NULL,
                amount NUMERIC DEFAULT 0,
                tenant_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        try {
            await db.query(`ALTER TABLE manual_daily_revenue ADD COLUMN IF NOT EXISTS tenant_id TEXT`);
            await db.query(`ALTER TABLE manual_daily_revenue DROP CONSTRAINT IF EXISTS manual_daily_revenue_date_department_category_key`);
            await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_manual_revenue_tenant_date ON manual_daily_revenue(tenant_id, date, department, category)`);
        } catch (e) {}
        console.log('✅ Manual Daily Revenue table created/verified');

        // Backfill NULL tenant_ids
        let fallbackTenantId = null;
        try {
            const licRes = await db.query(`SELECT tenant_id FROM license_info LIMIT 1`);
            fallbackTenantId = licRes.rows[0]?.tenant_id;
            if (fallbackTenantId) {
                await db.query(`UPDATE departments SET tenant_id = $1 WHERE tenant_id IS NULL`, [fallbackTenantId]);
                await db.query(`UPDATE service_categories SET tenant_id = $1 WHERE tenant_id IS NULL`, [fallbackTenantId]);
                await db.query(`UPDATE manual_daily_revenue SET tenant_id = $1 WHERE tenant_id IS NULL`, [fallbackTenantId]);
            }
        } catch (e) {}

        // 4. Seed Initial Departments if none exist for this tenant
        const initialDepts = [
            'Cardiology', 'Laboratory', 'Radiology', 'Pharmacy', 'Emergency', 'Surgery', 'OPD', 'IPD'
        ];
        for (const name of initialDepts) {
            try {
                const check = await db.query(
                    fallbackTenantId 
                        ? `SELECT 1 FROM departments WHERE name = $1 AND tenant_id = $2`
                        : `SELECT 1 FROM departments WHERE name = $1`,
                    fallbackTenantId ? [name, fallbackTenantId] : [name]
                );
                if (check.rows.length === 0) {
                    await db.query(
                        `INSERT INTO departments (id, name, is_active, tenant_id) VALUES ($1, $2, 1, $3)`,
                        [uuidv4(), name, fallbackTenantId]
                    );
                }
            } catch (e) {}
        }
        console.log('✅ Initial departments seeded');

        // 5. Seed Initial Service Categories if none exist for this tenant
        const initialServices = [
            'Consultation', 'Lab Tests', 'Radiology Exams', 'Procedures', 'Medicines', 'Ward Charges', 'Vaccination', 'Physiotherapy'
        ];
        for (const name of initialServices) {
            try {
                const check = await db.query(
                    fallbackTenantId 
                        ? `SELECT 1 FROM service_categories WHERE name = $1 AND tenant_id = $2`
                        : `SELECT 1 FROM service_categories WHERE name = $1`,
                    fallbackTenantId ? [name, fallbackTenantId] : [name]
                );
                if (check.rows.length === 0) {
                    await db.query(
                        `INSERT INTO service_categories (id, name, is_active, tenant_id) VALUES ($1, $2, 1, $3)`,
                        [uuidv4(), name, fallbackTenantId]
                    );
                }
            } catch (e) {}
        }
        console.log('✅ Initial service categories seeded');

        console.log('✨ Migration completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        throw err;
    }
}

module.exports = migrate;
if (require.main === module) {
    migrate();
}
