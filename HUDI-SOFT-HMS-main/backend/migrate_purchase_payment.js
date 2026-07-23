const { addColumnIfMissing } = require('./utils/schema');

async function migratePurchasePayment() {
    console.log('🚀 Starting Purchase Payment Migration (Adding payment_type)...');
    try {
        const state = await addColumnIfMissing('pharmacy_purchase_orders', 'payment_type', `TEXT DEFAULT 'cash'`);
        if (state === 'added') {
            console.log('✨ Purchase Payment Migration completed successfully!');
        } else if (state === 'exists') {
            console.log('ℹ️ Column payment_type already exists.');
        } else if (state === 'not_owner') {
            console.log('ℹ️ Skipping payment_type migration: current DB user is not the table owner.');
        } else {
            console.log('ℹ️ Skipping payment_type migration: pharmacy_purchase_orders table does not exist.');
        }
    } catch (err) {
        console.error('❌ Purchase Payment Migration Error:', err.message);
        throw err;
    }
}

if (require.main === module) {
    migratePurchasePayment();
}

module.exports = migratePurchasePayment;
