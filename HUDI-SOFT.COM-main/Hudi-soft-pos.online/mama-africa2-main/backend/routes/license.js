import express from 'express';
import mongoose from 'mongoose';
import License from '../models/License.js';

const router = express.Router();

/**
 * Get device ID for activation.
 * node-machine-id is imported dynamically to avoid crashing the entire module
 * if the package has issues on Render containers.
 */
router.get('/device-id', async (req, res) => {
    try {
        const { machineId } = await import('node-machine-id');
        const id = await machineId();
        res.json({ success: true, deviceId: id });
    } catch (error) {
        // Fallback: return a server-generated random ID
        res.json({ success: true, deviceId: 'SERVER-' + Math.random().toString(36).substring(2, 10).toUpperCase() });
    }
});

/**
 * Activate/Validate license - MongoDB Version
 */
router.post('/validate', async (req, res) => {
    const { licenseKey, machineId: clientMachineId, startDate: bodyStartDate, expiryDate: bodyExpiryDate } = req.body;

    if (!licenseKey) {
        return res.status(400).json({ success: false, message: 'License key is required' });
    }

    if (!clientMachineId) {
        return res.status(400).json({ success: false, message: 'Device ID (machineId) is required' });
    }

    // Check MongoDB connection state before attempting DB operations
    // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
    const dbState = mongoose.connection.readyState;
    if (dbState !== 1) {
        console.warn(`[License Validate] MongoDB not ready (state: ${dbState})`);
        return res.status(503).json({ 
            success: false, 
            message: 'License server temporarily unavailable. Please try again in a moment.' 
        });
    }

    try {
        const startDate = bodyStartDate ? new Date(bodyStartDate) : new Date();
        const expiryDate = bodyExpiryDate ? new Date(bodyExpiryDate) : new Date();
        if (!bodyExpiryDate) {
            expiryDate.setFullYear(startDate.getFullYear() + 5);
        }

        const existingLicense = await License.findOne({ licenseKey });
        let license;
        
        if (!existingLicense) {
            license = new License({
                licenseKey,
                startDate,
                expiryDate,
                status: 'active',
                lastCheck: new Date()
            });
            await license.save();
        } else {
            const finalStartDate = bodyStartDate ? new Date(bodyStartDate) : (existingLicense.startDate || startDate);
            const finalExpiryDate = bodyExpiryDate ? new Date(bodyExpiryDate) : (existingLicense.expiryDate || expiryDate);

            license = await License.findOneAndUpdate(
                { licenseKey }, 
                { $set: { startDate: finalStartDate, expiryDate: finalExpiryDate, status: 'active', lastCheck: new Date() } },
                { new: true }
            );
        }

        res.json({
            success: true,
            message: 'HUDI-SOFT Activated successfully!',
            expiryDate: license.expiryDate.toISOString(),
            startDate: license.startDate.toISOString(),
            status: license.status
        });
    } catch (error) {
        console.error('Activation error:', error);
        res.status(500).json({ success: false, message: 'Activation failed: ' + error.message });
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

    const dbState = mongoose.connection.readyState;
    if (dbState !== 1) {
        return res.status(503).json({ success: false, message: 'License server temporarily unavailable.' });
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
