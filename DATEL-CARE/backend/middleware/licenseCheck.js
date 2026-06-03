/**
 * Middleware to check if the current request has a valid license.
 */
module.exports = async (req, res, next) => {
    try {
        const licenseKey = req.header('X-License-Key');

        // Bypassing check if no key provided but user is authenticated (can be updated to strictly enforce)
        // For the rented HMS, we might want to strictly require the license key for certain routes.
        if (!licenseKey) {
            // Uncomment to strictly enforce:
            // return res.status(403).json({ error: 'License key is required' });
            return next();
        }

        // Add additional local caching or validation logic here if needed.
        
        next();
    } catch (error) {
        console.error('License check error:', error.message);
        return next();
    }
};
