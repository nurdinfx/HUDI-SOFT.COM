const License = require('../models/License');
const User = require('../models/User');
const mongoose = require('mongoose');
const syncCustomerEmail = require('../utils/syncCustomerEmail');

/**
 * POST /api/licenses/validate
 * Validates a license key from the desktop app or HMS web client.
 *
 * Rules:
 *   - Each license key has its OWN independent startDate and expiryDate.
 *   - These dates are NEVER recalculated or overwritten after license creation.
 *   - A license key can be activated on up to maxDevices (default: 10) devices.
 *   - The 11th unique device will be rejected.
 *
 * Accepts both:
 *   { licenseKey, machineID }  — primary field names
 *   { key, machineId }         — legacy aliases
 */
const validateLicense = async (req, res) => {
    // ── 1. Parse + normalise inputs ───────────────────────────────────────────
    const rawKey =
        (req.body && (req.body.licenseKey || req.body.key)) ||
        req.query.licenseKey ||
        req.query.key ||
        '';
    const licenseKey = String(rawKey).trim().toUpperCase().replace(/\s+/g, '');

    const machineID =
        (req.body && (req.body.machineID || req.body.machineId)) ||
        req.query.machineID ||
        req.query.machineId ||
        'UNKNOWN';

    const origin = req.headers.origin || req.headers.referer || 'direct';
    console.log(
        `[License] POST origin=${origin} key=${licenseKey.substring(0, 10)}… machine=${machineID}`
    );

    // ── 2. Validate inputs ────────────────────────────────────────────────────
    if (!licenseKey) {
        return res.status(400).json({
            valid: false,
            message: 'License key is required',
        });
    }

    // ── 3. Guard: MongoDB must be connected ───────────────────────────────────
    const dbState = mongoose.connection.readyState;
    if (dbState !== 1) {
        console.warn(`[License] MongoDB not ready (state=${dbState}). Returning 503.`);
        return res.status(503).json({
            valid: false,
            message: 'License service is temporarily unavailable. Please try again in a moment.',
        });
    }

    try {
        // ── 4. DB lookup: exact match on licenseKey, then case-insensitive fallback ──
        let license = await License.findOne({ licenseKey });

        if (!license) {
            license = await License.findOne({
                licenseKey: {
                    $regex: new RegExp(
                        `^${licenseKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
                        'i'
                    ),
                },
            });
        }

        if (!license) {
            console.warn(`[License] Not found: ${licenseKey}`);
            return res.status(404).json({
                valid: false,
                message: 'Invalid license key. Please check and try again.',
            });
        }

        console.log(
            `[License] Found: company=${license.companyName} status=${license.status} key=${licenseKey.substring(0, 10)}…`
        );

        // ── 5. Status checks ──────────────────────────────────────────────────
        if (license.status === 'Suspended') {
            return res.status(403).json({
                valid: false,
                message: 'License is suspended. Please contact support.',
            });
        }

        if (license.userId) {
            const user = await User.findById(license.userId);
            if (user && user.status === 'Suspended') {
                return res.status(403).json({
                    valid: false,
                    message: 'Your account has been suspended. Please contact support.',
                });
            }
        }

        // Auto-activate a Pending paid license on first use
        if (license.status === 'Pending' && !license.isTrial) {
            console.log('[License] Auto-activating Pending license on first use.');
            license.status = 'Active';
        }

        // Ensure activeDevices and machineIDs arrays are initialized safely
        if (!license.activeDevices) {
            license.activeDevices = [];
        }
        if (!license.machineIDs) {
            license.machineIDs = [];
        }

        if (license.activeDevices.length === 0) {
            if (license.machineIDs.length > 0) {
                license.activeDevices = [...license.machineIDs];
            }
        }

        const alreadyBound = license.activeDevices.includes(machineID) || license.machineIDs.includes(machineID);

        if (!alreadyBound) {
            const maxDev = license.maxDevices || 10;
            if (license.activeDevices.length >= maxDev) {
                console.warn(
                    `[License] Max devices reached: ${license.activeDevices.length}/${maxDev}`
                );
                return res.status(403).json({
                    valid: false,
                    message: `This license is already activated on the maximum number of devices (${maxDev}). Please contact support to reset or purchase an additional license.`,
                });
            }

            // Bind this new device
            license.activeDevices.push(machineID);
            // Keep machineIDs in sync for backward compatibility
            if (!license.machineIDs.includes(machineID)) {
                license.machineIDs.push(machineID);
            }

            // Activate on first device bind if still pending
            if (license.status === 'Pending') {
                license.status = 'Active';
            }

            console.log(
                `[License] Bound new device. Total=${license.activeDevices.length}/${license.maxDevices || 10}`
            );
            await license.save();
        } else {
            console.log(`[License] Device already bound: ${machineID}`);
        }

        // ── 7. Expiry check ───────────────────────────────────────────────────
        const now = new Date();
        // Always load dates from THIS license record – never from another record.
        const startDate = new Date(license.startDate || license.activationDate || license.createdAt || now);
        const expiryDate = new Date(license.expiryDate);

        if (expiryDate < now) {
            console.log(`[License] Expired on ${license.expiryDate}`);
            if (license.status !== 'Expired') {
                license.status = 'Expired';
                await license.save();
            }
            return res.status(403).json({
                valid: false,
                message: 'This license has expired. Please renew to continue.',
                isTrial: license.isTrial || false,
                startDate: startDate,
                expiryDate: license.expiryDate,
            });
        }

        const daysRemaining = Math.max(
            0,
            Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        );

        console.log(`[License] Valid. daysRemaining=${daysRemaining}`);

        // ── 8. Success response ───────────────────────────────────────────────
        // Sync email to central marketing database
        if (license.userId) {
            const userRecord = await User.findById(license.userId);
            if (userRecord) {
                await syncCustomerEmail({
                    email: userRecord.email,
                    name: userRecord.companyName,
                    companyName: userRecord.companyName,
                    product: license.productType,
                    source: 'activation',
                    subscriptionStatus: 'Active',
                    hasActiveLicense: true
                });
            }
        }

        // Return dates directly from THIS license record.
        // Every license key has its own independent lifecycle.
        return res.json({
            valid: true,
            message: 'License is valid.',
            tenantId: license._id.toString(),
            startDate: startDate,
            expiryDate: license.expiryDate,
            activationDate: startDate, // alias kept for backward compat
            productType: license.productType,
            companyName: license.companyName,
            isTrial: license.isTrial || false,
            daysRemaining,
            maxDevices: license.maxDevices || 10,
            activeDeviceCount: license.activeDevices.length,
            machineId: machineID,
        });
    } catch (error) {
        console.error('[License] Unhandled error:', error);
        return res.status(500).json({
            valid: false,
            message: 'Internal server error during license validation.',
        });
    }
};

/**
 * GET /api/licenses/my
 * Returns all licenses belonging to the authenticated user.
 */
const getMyLicenses = async (req, res) => {
    try {
        const licenses = await License.find({ userId: req.user._id });
        res.json(licenses);
    } catch (error) {
        console.error('[License] getMyLicenses error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { validateLicense, getMyLicenses };
