const { addColumnIfMissing } = require('./utils/schema');

async function migrateReturnsV2() {
    console.log('🚀 Starting Returns V2 Migration (Adding medicine_id)...');
    try {
        const state = await addColumnIfMissing('pharmacy_supplier_returns', 'medicine_id', 'UUID REFERENCES medicines(id)');
        if (state === 'added') {
            console.log('✨ Returns V2 Migration completed successfully!');
        } else if (state === 'exists') {
            console.log('ℹ️ Column medicine_id already exists.');
        } else if (state === 'not_owner') {
            console.log('ℹ️ Skipping medicine_id migration: current DB user is not the table owner.');
        } else {
            console.log('ℹ️ Skipping medicine_id migration: pharmacy_supplier_returns table does not exist.');
        }
    } catch (err) {
        console.error('❌ Returns V2 Migration Error:', err.message);
        throw err;
    }
}

if (require.main === module) {
    migrateReturnsV2();
}

module.exports = migrateReturnsV2;
