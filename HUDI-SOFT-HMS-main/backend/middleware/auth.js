const jwt = require('jsonwebtoken');
const db = require('../database');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const authenticate = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Always read tenantId from JWT — this is the authoritative tenant for this session
        const tenantId = decoded.tenantId || '00000000-0000-0000-0000-000000000000';

        // TENANT-STRICT: always require BOTH id AND tenant_id to match
        // This prevents a valid JWT from one hospital from accessing another hospital's data
        const result = await db.queryBypassRLS(
            'SELECT id, name, email, role, department, tenant_id FROM users WHERE id = $1 AND tenant_id = $2 AND is_active = 1 LIMIT 1',
            [decoded.id, tenantId]
        );
        const user = result.rows[0];

        if (!user) {
            console.warn(`🔍 Auth: User ${decoded.id} not found in tenant ${tenantId.substring(0,8)}`);
            return res.status(401).json({ error: 'User not found or inactive' });
        }

        req.user = user;
        req.tenantId = user.tenant_id;
        next();
    } catch (err) {
        if (err.message && (err.message.includes('timeout') || err.message.includes('terminated') || err.message.includes('connection'))) {
            console.error('❌ Auth DB Error (Timeout/Connection):', err.message);
            return res.status(503).json({ 
                error: 'Database connection issue', 
                message: 'The server is experiencing high latency. Please try again in a few seconds.' 
            });
        }
        console.warn('🔍 Auth: Invalid or expired token:', err.message);
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

const isValidUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

const logAction = async (userId, userName, userRole, action, module, details, ip = '127.0.0.1') => {
    try {
        const validUserId = isValidUUID(userId) ? userId : null;
        let tenantId = '00000000-0000-0000-0000-000000000000';
        if (validUserId) {
            // Use queryBypassRLS for audit log tenant lookup too
            const r = await db.queryBypassRLS('SELECT tenant_id FROM users WHERE id = $1 LIMIT 1', [validUserId]);
            if (r.rows[0] && r.rows[0].tenant_id) {
                tenantId = r.rows[0].tenant_id;
            }
        }
        await db.prepare(`INSERT INTO audit_logs (id, tenant_id, user_id, user_name, user_role, action, module, details, timestamp, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(uuidv4(), tenantId, validUserId, userName, userRole, action, module, details, new Date().toISOString(), ip);
    } catch (e) {
        // silent fail for audit logging, just log to console
        console.error('Audit Log Silent Fail:', e.message);
    }
};

const authorize = (allowedRoles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const userRole = (req.user.role || '').toLowerCase().trim();
        const roles = allowedRoles.map(r => r.toLowerCase().trim());

        if (!roles.includes(userRole)) {
            console.error(`🚫 [AUTH FORBIDDEN] User: ${req.user.name} | Role: |${req.user.role}| | Normalized: |${userRole}| | Allowed: [${roles.join(', ')}] | Path: ${req.originalUrl}`);
            return res.status(403).json({ 
                error: 'Forbidden: Insufficient permissions',
                debug: process.env.NODE_ENV === 'development' ? {
                    yourRole: req.user.role,
                    allowedRoles: allowedRoles
                } : undefined
            });
        }
        next();
    };
};

module.exports = { authenticate, logAction, authorize };
