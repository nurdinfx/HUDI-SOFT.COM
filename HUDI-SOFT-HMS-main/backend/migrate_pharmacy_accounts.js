/**
 * migrate_pharmacy_accounts.js
 * Adds pharmacy_zaad, pharmacy_sahal, pharmacy_edahab, pharmacy_mycash columns to hospital_settings.
 */
const { addColumnIfMissing } = require('./utils/schema');

async function migrate() {
    try {
        console.log('🚀 Starting Pharmacy Accounts Migration...');

        // In SQLite (local) and PostgreSQL (production), adding a column gracefully
        const columns = ['pharmacy_zaad', 'pharmacy_sahal', 'pharmacy_edahab', 'pharmacy_mycash'];
        
        for (const col of columns) {
            try {
                const state = await addColumnIfMissing('hospital_settings', col, `TEXT DEFAULT ''`);
                if (state === 'added') {
                    console.log(`✅ Added column ${col}`);
                } else if (state === 'exists') {
                    console.log(`ℹ️ Column ${col} already exists`);
                } else if (state === 'not_owner') {
                    console.log(`ℹ️ Skipping column ${col}: current DB user is not the hospital_settings owner`);
                } else {
                    console.log(`ℹ️ Skipping column ${col}: hospital_settings table does not exist`);
                }
            } catch (err) {
                console.warn(`⚠️ Warning adding ${col}: ${err.message}`);
            }
        }

        console.log('✨ Pharmacy Accounts Migration completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

module.exports = migrate;

if (require.main === module) {
    migrate();
}
