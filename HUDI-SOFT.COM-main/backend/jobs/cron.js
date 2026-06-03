const cron = require('node-cron');
const License = require('../models/License');

// Run every hour: '0 * * * *'
cron.schedule('0 * * * *', async () => {
    console.log('Running hourly expiry check job...');
    try {
        const now = new Date();

        // Find active licenses whose expiryDate has passed
        const expiredLicenses = await License.find({
            status: 'Active',
            expiryDate: { $lt: now }
        });

        if (expiredLicenses.length > 0) {
            for (const license of expiredLicenses) {
                // For trials, we use 'Suspended' to clearly indicate they need to pay
                // For regular licenses, 'Expired' is also fine.
                license.status = license.isTrial ? 'Suspended' : 'Expired';
                await license.save();
                console.log(`License ${license.licenseKey} (${license.isTrial ? 'Trial' : 'Regular'}) marked as ${license.status}.`);
            }
        } else {
            console.log('No licenses expired this hour.');
        }
    } catch (error) {
        console.error('Error running expiry check job:', error);
    }
});

console.log('Cron job initialized.');
