import express from 'express';
import License from '../models/License.js';
import machineId from 'node-machine-id';

const router = express.Router();

/**
 * Get device ID for activation.
 */
router.get('/device-id', async (req, res) => {
    try {
        const id = await machineId.machineId();
        res.json({ success: true, deviceId: id });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to get device ID' });
    }
});

/**
 * Activate license - MongoDB Version
 */
router.post('/activate', async (req, res) => {
    const { licenseKey } = req.body;

    if (!licenseKey) {
        return res.status(400).json({ success: false, message: 'License key is required' });
    }

    try {
        const currentDeviceId = await machineId.machineId();

        const startDate = new Date();
        const expiryDate = new Date();
        expiryDate.setFullYear(startDate.getFullYear() + 5);

        await License.findOneAndUpdate(
            { deviceId: currentDeviceId },
            { 
                $set: { 
                    licenseKey, 
                    startDate, 
                    expiryDate, 
                    status: 'active', 
                    lastCheck: startDate 
                } 
            },
            { upsert: true, new: true }
        );

        res.json({
            success: true,
            message: 'HUDI-SOFT Activated successfully! License valid for 5 years.',
            expiryDate: expiryDate.toISOString()
        });
    } catch (error) {
        console.error('Activation error:', error);
        res.status(500).json({ success: false, message: 'Activation failed' });
    }
});

/**
 * Check license status - MongoDB Version
 */
router.get('/status', async (req, res) => {
    try {
        const currentDeviceId = await machineId.machineId();
        const license = await License.findOne({ deviceId: currentDeviceId });

        if (!license) {
            return res.json({ success: false, message: 'Not activated', deviceId: currentDeviceId });
        }

        res.json({ success: true, license: license.toObject() });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to check status' });
    }
});

export default router;

