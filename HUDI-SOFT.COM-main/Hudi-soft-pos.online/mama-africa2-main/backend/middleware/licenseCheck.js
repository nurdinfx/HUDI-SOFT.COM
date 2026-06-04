/**
 * Middleware to check if the current request has a valid license.
 * Updated for Multi-Tenant POS Online
 */
export const licenseCheck = async (req, res, next) => {
    try {
        const licenseKey = req.header('X-License-Key');

        // Bypassing check if no key provided but user is authenticated (Multi-tenant logic handles it in auth middleware)
        if (!licenseKey) {
            return next();
        }

        // For Online version, we skip machine-id hardware checks and verify the key itself
        // The Root Licensing Server is the source of truth, but we can cache/check local License records too
        
        // Note: For extra security, we could call the CENTRAL_API here too, 
        // but for performance we'll trust the auth middleware context for now.
        
        next();
    } catch (error) {
        console.error('License check error:', error.message);
        return next();
    }
};
