const { addColumnIfMissing } = require('./utils/schema');

async function migrateMultiTest() {
    console.log('Adding selected_tests to daily_operations table...');
    try {
        const state = await addColumnIfMissing('daily_operations', 'selected_tests', 'JSONB');
        if (state === 'added') {
            console.log('Successfully added selected_tests column.');
        } else if (state === 'exists') {
            console.log('ℹ️ selected_tests column already exists.');
        } else if (state === 'not_owner') {
            console.log('ℹ️ Skipping selected_tests migration: current DB user is not the table owner.');
        } else {
            console.log('ℹ️ Skipping selected_tests migration: daily_operations table does not exist yet.');
        }
    } catch (err) {
        console.error('Migration notice:', err.message);
    }
}

module.exports = migrateMultiTest;
if (require.main === module) {
    migrateMultiTest();
}
