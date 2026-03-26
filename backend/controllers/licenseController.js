const License = require('../models/License');

// @desc    Validate license from Desktop App
// @route   POST /api/licenses/validate
// @access  Public (Used by Desktop App)
const validateLicense = async (req, res) => {
    // Support both POST (body) and GET (query)
    const licenseKey = req?.query?.key || req?.body?.licenseKey || req?.body?.key;
    const machineID = req?.query?.machineID || req?.body?.machineID;

    console.log(`[License Validation] Attempt - Key: ${licenseKey}, Machine: ${machineID}`);

    if (!licenseKey || !machineID) {
        console.warn('[License Validation] Missing parameters');
        return res.status(400).json({ valid: false, message: 'License Key and Machine ID are required' });
    }

    try {
        const license = await License.findOne({ licenseKey });

        if (!license) {
            console.warn(`[License Validation] Invalid Key: ${licenseKey}`);
            return res.status(404).json({ valid: false, message: 'Invalid License Key' });
        }

        console.log(`[License Validation] Found License: ${license.companyName}, Status: ${license.status}`);

        if (license.status === 'Suspended') {
            return res.status(403).json({ valid: false, message: 'License is suspended. Please contact support.' });
        }

        if (license.status === 'Pending' && !license.isTrial) {
             // If it's a paid license but still pending, maybe allow activation but mark as active?
             // For now, let's keep it strict or auto-activate if first time.
             console.log('[License Validation] Status is Pending. Auto-activating...');
             license.status = 'Active';
        }

        // Bind machine ID if it's the first time
        if (!license.machineID) {
            license.machineID = machineID;
            console.log(`[License Validation] Binding Machine ID: ${machineID}`);
            await license.save();
        } else if (license.machineID !== machineID) {
            console.warn(`[License Validation] Machine Mismatch. Expected: ${license.machineID}, Got: ${machineID}`);
            return res.status(403).json({ valid: false, message: 'License is registered to another machine' });
        }

        // Check expiration
        const present = new Date();
        const expiryDate = new Date(license.expiryDate);
        
        if (expiryDate < present) {
            console.log(`[License Validation] License Expired on: ${license.expiryDate}`);
            license.status = 'Expired';
            await license.save();
            return res.status(403).json({ 
                valid: false, 
                message: 'License has expired',
                isTrial: license.isTrial,
                expiryDate: license.expiryDate
            });
        }

        const daysRemaining = Math.max(0, Math.ceil((expiryDate - present) / (1000 * 60 * 60 * 24)));

        console.log(`[License Validation] Success - Days remaining: ${daysRemaining}`);

        res.json({
            valid: true,
            message: 'License is valid',
            expiryDate: license.expiryDate,
            productType: license.productType,
            companyName: license.companyName,
            isTrial: license.isTrial || false,
            daysRemaining: daysRemaining
        });

    } catch (error) {
        console.error('[License Validation] Error:', error);
        res.status(500).json({ valid: false, message: 'Internal Server Error: ' + error.message });
    }
};

module.exports = { validateLicense };
