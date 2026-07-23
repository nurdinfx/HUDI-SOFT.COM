/**
 * backend/routes/settingsRoutes.js
 *
 * Public license routes for the HMS PWA overlay.
 * Delegates directly to the proven validateLicense controller —
 * only intercepts res.json() to add the { success, isLicensed } fields
 * that the HMS frontend expects.
 *
 * NO authentication required.
 */

const express = require('express');
const router = express.Router();
const { validateLicense } = require('../controllers/licenseController');

// ─── POST /api/settings/activate-license ─────────────────────────────────────
router.post('/activate-license', (req, res) => {
    // Map HMS field name (machineId) → controller field name (machineID)
    if (req.body && req.body.machineId && !req.body.machineID) {
        req.body.machineID = req.body.machineId;
    }

    // Intercept res.json to add `success` based on `valid`
    const originalJson = res.json.bind(res);
    res.json = function (data) {
        if (data && typeof data === 'object') {
            data.success = !!data.valid;
            if (!data.message) {
                data.message = data.valid
                    ? 'License activated successfully!'
                    : 'License activation failed.';
            }
        }
        return originalJson(data);
    };

    // Delegate directly — same code path as POS desktop validation
    return validateLicense(req, res);
});

// ─── GET /api/settings/license-status ────────────────────────────────────────
router.get('/license-status', (req, res) => {
    // Map HMS field names
    if (req.query && req.query.machineId && !req.query.machineID) {
        req.query.machineID = req.query.machineId;
    }

    // Intercept res.json to add `isLicensed` based on `valid`
    const originalJson = res.json.bind(res);
    res.json = function (data) {
        if (data && typeof data === 'object') {
            data.isLicensed = !!data.valid;
            data.success = !!data.valid;
            if (!data.message) {
                data.message = data.valid
                    ? 'License is active.'
                    : 'No active license found.';
            }
        }
        return originalJson(data);
    };

    return validateLicense(req, res);
});

module.exports = router;
