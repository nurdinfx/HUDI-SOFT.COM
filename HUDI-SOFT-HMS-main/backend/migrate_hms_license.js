/**
 * migrate_hms_license.js
 * Creates/upgrades the hms_license table for multi-tenant license caching.
 *
 * MULTI-TENANT: tenant_id column is critical — each activated hospital
 * gets a deterministic tenant_id derived from their license key.
 */
const db = require('./database');

async function migrate() {
    try {
        console.log('🚀 Starting HMS License Cache Table Migration...');

        // Check if table exists with machine_id column
        let hasMachineId = false;
        try {
            await db.query("SELECT machine_id FROM hms_license LIMIT 1;");
            hasMachineId = true;
        } catch (e) {
            // Table either doesn't exist, or doesn't have machine_id column
        }

        if (!hasMachineId) {
            console.log('⚠️ Legacy hms_license table detected (or missing) – recreating for multi-tenant support...');
            await db.exec("DROP TABLE IF EXISTS hms_license;");
        }

        // Create hms_license table with tenant_id for multi-tenant isolation
        await db.exec(`
            CREATE TABLE IF NOT EXISTS hms_license (
                machine_id VARCHAR(255) PRIMARY KEY,
                license_key VARCHAR(255) NOT NULL,
                company_name VARCHAR(255),
                product_type VARCHAR(255) DEFAULT 'HMS',
                start_date TIMESTAMP,
                expiry_date TIMESTAMP,
                status VARCHAR(50) DEFAULT 'Active',
                is_trial INTEGER DEFAULT 0,
                tenant_id VARCHAR(255) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
                last_checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Ensure tenant_id column exists on existing tables (upgrade path)
        try {
            await db.exec(`ALTER TABLE hms_license ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(255) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'`);
        } catch (e) { /* already exists */ }

        // Create index for fast tenant lookup
        try {
            await db.exec(`CREATE INDEX IF NOT EXISTS idx_hms_license_tenant_id ON hms_license(tenant_id)`);
            await db.exec(`CREATE INDEX IF NOT EXISTS idx_hms_license_key ON hms_license(license_key)`);
        } catch (e) { /* already exists */ }

        console.log('✅ hms_license table created/verified with tenant_id isolation');

        // Upgrade hospital_settings table to use tenant_id as primary key
        // (replaces the old single-row INTEGER id=1 design)
        await upgradeHospitalSettings();

        console.log('✨ License migration completed successfully!');
    } catch (err) {
        console.error('❌ License migration failed:', err.message);
        throw err;
    }
}

/**
 * Upgrade hospital_settings to a per-tenant design.
 * Old: INTEGER PRIMARY KEY (id=1) — one global row for all hospitals
 * New: tenant_id TEXT PRIMARY KEY — one row per hospital
 */
async function upgradeHospitalSettings() {
    try {
        // 1. Ensure tenant_id column exists
        const hasTenantId = await db.query(
            `SELECT 1 FROM information_schema.columns
             WHERE table_name='hospital_settings' AND column_name='tenant_id' AND table_schema='public'`
        );
        
        if (!hasTenantId.rows.length) {
            console.log('⚠️  hospital_settings: adding tenant_id column...');
            await db.exec(`ALTER TABLE hospital_settings ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(255) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'`);
        }

        // 2. Drop the old id PK constraint
        const pkInfo = await db.query(
            `SELECT column_name FROM information_schema.key_column_usage
             WHERE table_name='hospital_settings' AND constraint_name='hospital_settings_pkey' AND table_schema='public'`
        );
        const currentPK = pkInfo.rows.map(r => r.column_name);

        if (currentPK.length !== 1 || currentPK[0] !== 'tenant_id') {
            console.log('⚠️  hospital_settings: dropping old primary key constraint...');
            try {
                await db.exec(`ALTER TABLE hospital_settings DROP CONSTRAINT IF EXISTS hospital_settings_pkey`);
            } catch (e) { /* ignore */ }
        }

        // 3. Drop legacy id column if it exists to avoid NOT NULL violations on insert
        const hasId = await db.query(
            `SELECT 1 FROM information_schema.columns
             WHERE table_name='hospital_settings' AND column_name='id' AND table_schema='public'`
        );
        if (hasId.rows.length) {
            console.log('⚠️  hospital_settings: dropping legacy id column...');
            try {
                await db.exec(`ALTER TABLE hospital_settings DROP COLUMN IF EXISTS id`);
            } catch (e) {
                console.warn('⚠️  Failed to drop id column (non-fatal):', e.message.substring(0, 100));
            }
        }

        // 4. Set tenant_id as the primary key if not already done
        const pkInfoAfter = await db.query(
            `SELECT column_name FROM information_schema.key_column_usage
             WHERE table_name='hospital_settings' AND constraint_name='hospital_settings_pkey' AND table_schema='public'`
        );
        const currentPKAfter = pkInfoAfter.rows.map(r => r.column_name);
        
        if (currentPKAfter.length !== 1 || currentPKAfter[0] !== 'tenant_id') {
            console.log('⚠️  hospital_settings: setting tenant_id as primary key...');
            try {
                await db.exec(`ALTER TABLE hospital_settings ADD PRIMARY KEY (tenant_id)`);
                console.log('✅ hospital_settings: now keyed by tenant_id (one row per hospital)');
            } catch (pkErr) {
                console.warn('⚠️  hospital_settings PK upgrade (non-fatal):', pkErr.message.substring(0, 100));
            }
        } else {
            console.log('✅ hospital_settings: already keyed by tenant_id');
        }

        // Create index
        try {
            await db.exec(`CREATE INDEX IF NOT EXISTS idx_hospital_settings_tenant_id ON hospital_settings(tenant_id)`);
        } catch (e) { /* already exists */ }

    } catch (err) {
        console.warn('⚠️  hospital_settings upgrade (non-fatal):', err.message.substring(0, 100));
    }
}

module.exports = migrate;
if (require.main === module) {
    migrate().then(() => process.exit(0)).catch(() => process.exit(1));
}
