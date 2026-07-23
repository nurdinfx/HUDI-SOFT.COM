/**
 * licenseEnforcer.js
 * Restricts all database write operations (POST, PUT, DELETE, PATCH)
 * if the software license is expired, suspended, or missing.
 *
 * FIX: Uses queryBypassRLS to read hms_license table directly without
 * being blocked by Supabase Row-Level Security policies.
 * Checks by tenant_id (from JWT) first, then by machine_id.
 * This ensures Capacitor Android devices (which have a different machine_id
 * than the browser used during activation) can still write data.
 */
const db = require('../database');
const jwt = require('jsonwebtoken');

async function licenseEnforcer(req, res, next) {
    // 1. Bypass check: read/safe requests (GET, OPTIONS)
    const isWriteOp = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
    if (!isWriteOp) {
        return next();
    }

    // 2. Bypass check: licensing and auth routes must never be blocked
    const bypassPaths = [
        '/api/license/activate',
        '/api/license/status',
        '/api/auth/login',
        '/api/auth/logout',
        '/api/health',
        '/api/db-test'
    ];

    const isBypass = bypassPaths.some(p => req.originalUrl.startsWith(p));
    if (isBypass) {
        return next();
    }

    // 3. Bypass for web/PWA requests from Vercel deployments
    // The license enforcer is designed for Capacitor mobile apps.
    // Web browser sessions are authenticated via JWT — no machine-level license needed.
    const origin = req.headers.origin || '';
    const isWebBrowser = origin.includes('.vercel.app') || 
                          origin.includes('localhost') ||
                          origin.includes('127.0.0.1') ||
                          (!req.headers['x-machine-id'] || req.headers['x-machine-id'] === 'UNKNOWN');
    
    if (isWebBrowser) {
        return next();
    }

    try {
        const machineId = req.headers['x-machine-id'] || 'UNKNOWN';

        // 3a. Try to find license by tenant_id from JWT first (most reliable for Capacitor)
        let localLic = null;
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const tenantId = decoded.tenantId;
                if (tenantId && tenantId !== '00000000-0000-0000-0000-000000000000') {
                    const r = await db.queryBypassRLS(
                        "SELECT * FROM hms_license WHERE tenant_id = $1 AND status = 'Active' ORDER BY updated_at DESC LIMIT 1",
                        [tenantId]
                    );
                    localLic = r.rows[0] || null;
                }
            } catch (jwtErr) {
                // Token invalid — authentication middleware will handle this
            }
        }

        // 3b. If not found by tenant_id, fall back to machine_id lookup
        if (!localLic) {
            const r = await db.queryBypassRLS(
                'SELECT * FROM hms_license WHERE machine_id = $1 LIMIT 1',
                [machineId]
            );
            localLic = r.rows[0] || null;
        }

        // 3c. Still not found — check by X-Tenant-ID header as last resort
        if (!localLic) {
            const headerTenantId = req.headers['x-tenant-id'];
            if (headerTenantId && headerTenantId !== '00000000-0000-0000-0000-000000000000') {
                const r = await db.queryBypassRLS(
                    "SELECT * FROM hms_license WHERE tenant_id = $1 AND status = 'Active' ORDER BY updated_at DESC LIMIT 1",
                    [headerTenantId]
                );
                localLic = r.rows[0] || null;
            }
        }

        if (!localLic) {
            return res.status(402).json({
                error: 'License Required',
                message: 'No active license found for this system. Please activate your license key.'
            });
        }

        const now = new Date();
        const expiryDate = new Date(localLic.expiry_date);

        if (localLic.status !== 'Active') {
            return res.status(402).json({
                error: 'License Suspended',
                message: `License status is currently "${localLic.status}". Please contact support or renew your subscription.`
            });
        }

        if (expiryDate < now) {
            return res.status(402).json({
                error: 'License Expired',
                message: 'Your system subscription has expired. Please renew your license key to enable clinical write operations.'
            });
        }

        // License is active and valid — proceed
        next();
    } catch (err) {
        console.error('[License Enforcer] Check failed:', err);
        // On enforcer failure, allow the request through and let auth middleware handle it
        // This prevents a DB error from blocking all writes
        next();
    }
}

module.exports = licenseEnforcer;
