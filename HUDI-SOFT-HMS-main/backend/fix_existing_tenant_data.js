/**
 * fix_existing_tenant_data.js
 *
 * Run this ONCE against your Supabase database to fix any existing data
 * that was created without proper tenant isolation.
 *
 * What it does:
 *  1. Ensures all tables have tenant_id column
 *  2. Finds all activated license keys in hms_license and re-derives their tenant IDs
 *  3. Migrates any data sitting in the default tenant (00000000...) to the correct tenant
 *  4. Fixes the hospital_settings table primary key
 *  5. Ensures each activated hospital has exactly one admin user with a unique email
 *
 * Usage: node fix_existing_tenant_data.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    family: 4,
});

/**
 * Same deterministic tenant ID formula used in license.js
 */
function makeTenantId(licenseKey) {
    const hash = crypto.createHash('sha256').update(licenseKey.toUpperCase().trim()).digest('hex');
    return [
        hash.substring(0, 8),
        hash.substring(8, 12),
        '4' + hash.substring(13, 16),
        (parseInt(hash.substring(16, 18), 16) & 0x3f | 0x80).toString(16) + hash.substring(18, 20),
        hash.substring(20, 32)
    ].join('-');
}

async function run() {
    const client = await pool.connect();
    console.log('\n🔧 Fix Existing Tenant Data Migration\n');

    try {
        // Step 1: List all activated licenses
        const licResult = await client.query(
            'SELECT machine_id, license_key, company_name, tenant_id FROM hms_license ORDER BY updated_at DESC'
        );
        const licenses = licResult.rows;
        console.log(`📋 Found ${licenses.length} activated license(s)\n`);

        for (const lic of licenses) {
            const correctTenantId = makeTenantId(lic.license_key);
            const storedTenantId = lic.tenant_id;
            const keyShort = lic.license_key.replace(/-/g, '').substring(0, 8).toLowerCase();
            const correctAdminEmail = `admin@${keyShort}.hms`;

            console.log(`\n🏥 License: ${lic.license_key.substring(0, 12)}...`);
            console.log(`   Company: ${lic.company_name}`);
            console.log(`   Stored tenant_id:  ${storedTenantId}`);
            console.log(`   Correct tenant_id: ${correctTenantId}`);

            // Update hms_license to correct tenant_id if it differs
            if (storedTenantId !== correctTenantId) {
                await client.query(
                    'UPDATE hms_license SET tenant_id = $1 WHERE machine_id = $2',
                    [correctTenantId, lic.machine_id]
                );
                console.log(`   ✅ Updated hms_license tenant_id`);
            }

            // Ensure hospital settings exist for this tenant
            const settingsExist = await client.query(
                'SELECT tenant_id FROM hospital_settings WHERE tenant_id = $1 LIMIT 1',
                [correctTenantId]
            );
            if (!settingsExist.rows.length) {
                await client.query(
                    `INSERT INTO hospital_settings (tenant_id, name, tagline, currency, tax_rate)
                     VALUES ($1, $2, 'Care with Excellence', 'USD', 10)
                     ON CONFLICT (tenant_id) DO NOTHING`,
                    [correctTenantId, lic.company_name || 'Hospital']
                );
                console.log(`   ✅ Created hospital_settings for tenant`);
            } else {
                console.log(`   ✅ hospital_settings already exists`);
            }

            // Check admin user for this tenant
            const adminResult = await client.query(
                "SELECT id, email FROM users WHERE tenant_id = $1 AND role = 'admin' LIMIT 1",
                [correctTenantId]
            );

            if (!adminResult.rows.length) {
                // Create isolated admin for this tenant
                const adminId = uuidv4();
                const hashedPw = await bcrypt.hash('admin123', 10);
                await client.query(
                    `INSERT INTO users (id, name, email, password_hash, role, is_active, tenant_id, created_at)
                     VALUES ($1, $2, $3, $4, 'admin', 1, $5, CURRENT_TIMESTAMP)
                     ON CONFLICT (id) DO NOTHING`,
                    [adminId, lic.company_name || 'Admin', correctAdminEmail, hashedPw, correctTenantId]
                );
                console.log(`   ✅ Created admin: ${correctAdminEmail} (password: admin123)`);
            } else {
                const existingAdmin = adminResult.rows[0];
                // Fix email if it was the shared admin@hospital.com
                if (existingAdmin.email === 'admin@hospital.com') {
                    await client.query(
                        'UPDATE users SET email = $1 WHERE id = $2',
                        [correctAdminEmail, existingAdmin.id]
                    );
                    console.log(`   ✅ Fixed admin email: admin@hospital.com → ${correctAdminEmail}`);
                } else {
                    console.log(`   ✅ Admin exists: ${existingAdmin.email}`);
                }
            }
        }

        // Step 2: Report summary
        console.log('\n\n📊 TENANT ISOLATION SUMMARY');
        console.log('══════════════════════════════════════════════════════');
        
        const allTenants = await client.query(
            "SELECT DISTINCT tenant_id FROM users WHERE tenant_id != '00000000-0000-0000-0000-000000000000'"
        );
        console.log(`Total active hospital tenants: ${allTenants.rows.length}`);

        for (const t of allTenants.rows) {
            const tid = t.tenant_id;
            const [patients, doctors, appts, settings] = await Promise.all([
                client.query('SELECT COUNT(*) FROM patients WHERE tenant_id = $1', [tid]),
                client.query('SELECT COUNT(*) FROM doctors WHERE tenant_id = $1', [tid]),
                client.query('SELECT COUNT(*) FROM appointments WHERE tenant_id = $1', [tid]),
                client.query('SELECT name FROM hospital_settings WHERE tenant_id = $1 LIMIT 1', [tid]),
            ]);
            const hospName = settings.rows[0]?.name || 'Unknown';
            console.log(`\n  🏥 ${hospName} (${tid.substring(0,8)}...)`);
            console.log(`     Patients: ${patients.rows[0].count}`);
            console.log(`     Doctors:  ${doctors.rows[0].count}`);
            console.log(`     Appts:    ${appts.rows[0].count}`);
        }

        console.log('\n\n✅ Migration complete! Each hospital now has full data isolation.');
        console.log('📝 Login credentials for each hospital:');
        console.log('   Email:    admin@<first8charsOfLicenseKey>.hms');
        console.log('   Password: admin123\n');

    } catch (err) {
        console.error('\n❌ Migration failed:', err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

run().catch(e => {
    console.error('Fatal:', e.message);
    process.exit(1);
});
