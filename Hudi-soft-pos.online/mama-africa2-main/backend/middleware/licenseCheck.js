import License from '../models/License.js';
import machineId from 'node-machine-id';

/**
 * Middleware to check if the current device has a valid license.
 * MongoDB Version
 */
export const licenseCheck = async (req, res, next) => {
    try {
        // License check is now enforced for Cloud App (POS Online)
        // Hardware IDs (machine-id) might be unreliable in some cloud environments,
        // but it is still used for local/electron deployments.

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
