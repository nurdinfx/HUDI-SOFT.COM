const License = require('../models/License');

// @desc    Validate license from Desktop App
// @route   POST /api/licenses/validate
// @access  Public (Used by Desktop App)
const validateLicense = async (req, res) => {
    // Support both POST (body) and GET (query)
    const licenseKey = req?.query?.key || req?.body?.licenseKey || req?.body?.key;
    const machineID = req?.query?.machineID || req?.body?.machineID;

    console.log(`Validation attempt: Key=${licenseKey}, Machine=${machineID}`);

    if (!licenseKey || !machineID) {
        return res.status(400).json({ valid: false, message: 'License Key and Machine ID (key/machineID) are required' });
    }

    try {
        const license = await License.findOne({ licenseKey });

        if (!license) {
            return res.status(404).json({ valid: false, message: 'Invalid License Key' });
        }

        if (license.status === 'Suspended') {
            return res.status(403).json({ valid: false, message: 'License is suspended' });
        }

        // Bind machine ID if it's the first time
        if (!license.machineID) {
            license.machineID = machineID;
            await license.save();
        } else if (license.machineID !== machineID) {
            return res.status(403).json({ valid: false, message: 'License is registered to another machine' });
        }

        // Check expiration
        const present = new Date();
        const expiryDate = new Date(license.expiryDate);
        
        if (expiryDate < present) {
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
        res.status(500).json({ valid: false, message: error.message });
    }
};

module.exports = { validateLicense };
