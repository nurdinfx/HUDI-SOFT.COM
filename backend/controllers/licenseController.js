const License = require('../models/License');
const mongoose = require('mongoose');

/**
 * POST /api/licenses/validate
 * Validates a license key from the desktop app or HMS web client.
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
        // CORS headers are already set by corsMiddleware before we reach here,
        // so the browser will not be blocked by CORS on this 503.
        return res.status(503).json({
            valid: false,
            message: 'License service is temporarily unavailable. Please try again in a moment.',
        });
    }

    try {
        // ── 4. DB lookup: exact match, then case-insensitive fallback ─────────
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
            `[License] Found: company=${license.companyName} status=${license.status}`
        );

        // ── 5. Status checks ──────────────────────────────────────────────────
        if (license.status === 'Suspended') {
            return res.status(403).json({
                valid: false,
                message: 'License is suspended. Please contact support.',
            });
        }

        // Auto-activate a Pending paid license on first use
        if (license.status === 'Pending' && !license.isTrial) {
            console.log('[License] Auto-activating Pending license on first use.');
            license.status = 'Active';
        }

        // ── 6. Device binding ─────────────────────────────────────────────────
        const alreadyBound = license.machineIDs.includes(machineID);
        if (!alreadyBound) {
            if (license.machineIDs.length >= license.maxDevices) {
                console.warn(
                    `[License] Max devices reached: ${license.machineIDs.length}/${license.maxDevices}`
                );
                return res.status(403).json({
                    valid: false,
                    message: `This license is already activated on the maximum number of devices (${license.maxDevices}). Please contact support to reset.`,
                });
            }
            license.machineIDs.push(machineID);
            // Activate on first device bind if still pending
            if (license.status === 'Pending') {
                license.status = 'Active';
            }
            console.log(
                `[License] Bound new machine. Total=${license.machineIDs.length}/${license.maxDevices}`
            );
            await license.save();
        } else {
            console.log(`[License] Machine already bound: ${machineID}`);
        }

        // ── 7. Expiry check ───────────────────────────────────────────────────
        const now = new Date();
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
                expiryDate: license.expiryDate,
            });
        }

        const daysRemaining = Math.max(
            0,
            Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        );

        console.log(`[License] Valid. daysRemaining=${daysRemaining}`);

        // ── 8. Success response ───────────────────────────────────────────────
        // Field names are intentionally consistent with DATEL-CARE frontend expectations:
        //   { valid, message, expiryDate, isTrial, daysRemaining, companyName, productType }
        return res.json({
            valid: true,
            message: 'License is valid.',
            expiryDate: license.expiryDate,
            activationDate: license.activationDate || license.createdAt || now,
            productType: license.productType,
            companyName: license.companyName,
            isTrial: license.isTrial || false,
            daysRemaining,
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
