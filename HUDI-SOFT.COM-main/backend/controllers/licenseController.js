const License = require('../models/License');

// @desc    Validate license from Desktop App
// @route   POST /api/licenses/validate
// @access  Public (Used by Desktop App)
const validateLicense = async (req, res) => {
    // Support both POST (body) and GET (query)
    const rawKey = (req.body && req.body.licenseKey) || req.query.licenseKey || (req.body && req.body.key) || req.query.key || '';
    const licenseKey = String(rawKey).trim().toUpperCase().replace(/\s+/g, '');
    const machineID = (req.body && req.body.machineID) || req.query.machineID || (req.body && req.body.machineId) || req.query.machineId || 'UNKNOWN';

    const dbState = require('mongoose').connection.readyState;
    if (dbState !== 1) {
        console.warn(`[License Validation] MongoDB not ready (state: ${dbState})`);
        return res.status(503).json({ valid: false, message: 'License service temporarily unavailable. Please try again later.' });
    }
    const origin = req.headers.origin || req.headers.referer || 'direct';
    console.log(`[License Validation] POST origin=${origin} key=${licenseKey.substring(0, 8)}… machine=${machineID}`);

    if (!licenseKey || !machineID) {
        console.warn('[License Validation] Missing parameters');
        return res.status(400).json({ valid: false, message: 'License Key and Machine ID are required' });
    }

    try {
        let license = await License.findOne({ licenseKey });
        if (!license && licenseKey) {
            license = await License.findOne({
                licenseKey: { $regex: new RegExp(`^${licenseKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
            });
        }

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

        // Bind machine ID if it's new
        if (!license.machineIDs.includes(machineID)) {
            if (license.machineIDs.length < license.maxDevices) {
                license.machineIDs.push(machineID);
                console.log(`[License Validation] Binding New Machine ID: ${machineID} (${license.machineIDs.length}/${license.maxDevices})`);
                
                // If it was pending, auto-activate on first device bind
                if (license.status === 'Pending') {
                    license.status = 'Active';
                }
                
                await license.save();
            } else {
                console.warn(`[License Validation] Max Machines Reached. Machines: ${license.machineIDs.length}, Max: ${license.maxDevices}`);
                return res.status(403).json({ 
                    valid: false, 
                    message: `License is already registered to the maximum number of devices (${license.maxDevices}). Please contact support to reset.` 
                });
            }
        } else {
            console.log(`[License Validation] Machine ID already linked: ${machineID}`);
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
            activationDate: license.activationDate || license.createdAt || new Date(),
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

// @desc    Get my licenses
// @route   GET /api/licenses/my
// @access  Private
const getMyLicenses = async (req, res) => {
    try {
        const licenses = await License.find({ userId: req.user._id });
        res.json(licenses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { validateLicense, getMyLicenses };
