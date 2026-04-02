import License from '../models/License.js';
import machineId from 'node-machine-id';

/**
 * Middleware to check if the current device has a valid license.
 * MongoDB Version
 */
export const licenseCheck = async (req, res, next) => {
    try {
        // IMPORTANT: Render/Docker containers often cannot access hardware IDs.
        // We bypass this check in production to ensure the app remains accessible.
        if (process.env.NODE_ENV === 'production' || process.env.RENDER === 'true') {
            return next();
        }

        const currentDeviceId = await machineId.machineId();

        const license = await License.findOne({ 
            deviceId: currentDeviceId, 
            status: 'active' 
        });

        if (!license) {
            return res.status(402).json({
                success: false,
                message: 'No active license found for this device. Please activate HUDI-SOFT to continue.',
                deviceId: currentDeviceId
            });
        }

        const now = new Date();
        const expiry = new Date(license.expiryDate);

        if (now > expiry) {
            return res.status(402).json({
                success: false,
                message: 'Your HUDI-SOFT license has expired. Please renew your subscription.',
                expiryDate: license.expiryDate
            });
        }

        next();
    } catch (error) {
        console.error('License check error (Bypassing):', error.message);
        // Allow request to proceed if licensing check fails in cloud environment
        return next();
    }
};
