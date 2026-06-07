const express = require('express');
const router = express.Router();

const LICENSE_SERVER =
    process.env.LICENSING_API_URL || 'https://hudi-soft-com.onrender.com/api';

/** Proxy to central license server — each key gets its own expiryDate from MongoDB. */
router.post('/validate', async (req, res) => {
    try {
        const licenseKey = req.body?.licenseKey || req.body?.key;
        const machineID = req.body?.machineID || req.body?.machineId || 'UNKNOWN';

        if (!licenseKey) {
            return res.status(400).json({ valid: false, message: 'License key is required' });
        }

        const upstream = await fetch(`${LICENSE_SERVER}/licenses/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ licenseKey, machineID }),
        });

        const data = await upstream.json().catch(() => ({}));
        return res.status(upstream.status).json(data);
    } catch (error) {
        console.error('❌ License proxy error:', error.message);
        res.status(502).json({
            valid: false,
            message: 'Cannot reach license server. Please try again.',
        });
    }
});

module.exports = router;
