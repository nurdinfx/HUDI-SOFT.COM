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
 * Activate/Validate license - MongoDB Version (Supports Cloud Deployment)
 */
router.post('/validate', async (req, res) => {
    const { licenseKey, machineId: clientMachineId } = req.body;

    if (!licenseKey) {
        return res.status(400).json({ success: false, message: 'License key is required' });
    }

    if (!clientMachineId) {
        return res.status(400).json({ success: false, message: 'Device ID (machineId) is required' });
    }

    try {
        const startDate = new Date();
        const expiryDate = new Date();
        expiryDate.setFullYear(startDate.getFullYear() + 5);

        // Find if this license is already bound to another device
        const existingLicense = await License.findOne({ licenseKey });
        
        if (existingLicense && existingLicense.deviceId && existingLicense.deviceId !== clientMachineId) {
            return res.status(403).json({ 
                success: false, 
                message: 'This license key is already linked to another device. Please contact support.' 
            });
        }

        const license = await License.findOneAndUpdate(
            { licenseKey }, // Find by license key to bind it correctly
            { 
                $set: { 
                    deviceId: clientMachineId, 
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
            expiryDate: expiryDate.toISOString(),
            status: license.status
        });
    } catch (error) {
        console.error('Activation error:', error);
        res.status(500).json({ success: false, message: 'Activation failed' });
    }
});

/**
 * Check license status - MongoDB Version
 */
router.post('/status', async (req, res) => {
    const { machineId: clientMachineId } = req.body;
    
    if (!clientMachineId) {
        return res.status(400).json({ success: false, message: 'Device ID (machineId) is required' });
    }

    try {
        const license = await License.findOne({ deviceId: clientMachineId });

        if (!license) {
            return res.json({ success: false, message: 'Not activated', deviceId: clientMachineId });
        }

        res.json({ success: true, license: license.toObject() });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to check status' });
    }
});

export default router;

