const cron = require('node-cron');
const License = require('../models/License');

// Run every day at midnight server time: '0 0 * * *'
// For testing, one could use '* * * * *' (every minute)
cron.schedule('0 0 * * *', async () => {
    console.log('Running daily expiry check job...');
    try {
        const now = new Date();

        // Find active licenses whose expiryDate has passed
        const expiredLicenses = await License.find({
            status: 'Active',
            expiryDate: { $lt: now }
        });

        if (expiredLicenses.length > 0) {
            for (const license of expiredLicenses) {
                // Optional logic: Can use gracePeriodEndDate logic if present
                license.status = 'Expired';
                await license.save();
                console.log(`License ${license.licenseKey} marked as Expired.`);
            }
        } else {
            console.log('No licenses expired today.');
        }
    } catch (error) {
        console.error('Error running expiry check job:', error);
    }
});

console.log('Cron job initialized.');
