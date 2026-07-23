const CustomerEmail = require('../models/CustomerEmail');

async function syncCustomerEmail({ email, name, companyName, product, source, subscriptionStatus, hasActiveLicense }) {
    if (!email) return;
    try {
        const updateFields = {};
        if (name) updateFields.name = name;
        if (companyName) updateFields.companyName = companyName;
        if (subscriptionStatus) updateFields.subscriptionStatus = subscriptionStatus;
        if (hasActiveLicense !== undefined) updateFields.hasActiveLicense = hasActiveLicense;

        const updateQuery = {
            $set: updateFields
        };

        const addToSet = {};
        if (source) addToSet.sources = source;
        if (product) addToSet.products = product;

        if (Object.keys(addToSet).length > 0) {
            updateQuery.$addToSet = addToSet;
        }

        await CustomerEmail.findOneAndUpdate(
            { email: email.toLowerCase().trim() },
            updateQuery,
            { upsert: true, new: true }
        );
        console.log(`[SyncEmail] Successfully synced ${email} from source: ${source || 'unknown'}`);
    } catch (err) {
        console.error(`[SyncEmail] Error syncing email ${email}:`, err.message);
    }
}

module.exports = syncCustomerEmail;
