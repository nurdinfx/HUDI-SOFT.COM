/**
 * middleware/auth.js
 * Authentication + multi-tenant middleware.
 * Injects req.user and req.tenantId into every authenticated request.
 */
const jwt = require('jsonwebtoken');
const db = require('../database');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// ─── Cache tenant_id in memory to avoid DB hit on every request ──
let _cachedTenantId = null;

async function getTenantId() {
  if (_cachedTenantId) return _cachedTenantId;
  try {
    const result = await db.query('SELECT tenant_id FROM license_info WHERE status IN ($1, $2) LIMIT 1', ['active', 'demo']);
    if (result.rows[0]?.tenant_id) {
      _cachedTenantId = result.rows[0].tenant_id;
      return _cachedTenantId;
    }
    // Fallback: use ANY tenant_id from license_info
    const fallback = await db.query('SELECT tenant_id FROM license_info LIMIT 1');
    if (fallback.rows[0]?.tenant_id) {
      _cachedTenantId = fallback.rows[0].tenant_id;
      return _cachedTenantId;
    }
  } catch (e) {
    console.warn('⚠️  Could not fetch tenant_id:', e.message);
  }
  return null;
}

// Expose a way to clear cache when license is activated
function clearTenantCache() {
  _cachedTenantId = null;
}

const authenticate = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get tenant_id: prefer from JWT (set at login), fallback to DB lookup
    const tenantId = decoded.tenantId || await getTenantId();

    // Fetch user scoped to the tenant
    const user = await db.query(
      `SELECT id, name, email, role, department
       FROM users
       WHERE id = $1 AND is_active = 1 AND (tenant_id = $2 OR tenant_id IS NULL)`,
      [decoded.id, tenantId]
    );

    const foundUser = user.rows[0];
    if (!foundUser) {
      console.warn(`🔍 Auth: User not found or inactive for ID: ${decoded.id}`);
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = foundUser;
    req.tenantId = tenantId;
    next();
  } catch (err) {
    if (err.message.includes('timeout') || err.message.includes('terminated') || err.message.includes('connection')) {
      console.error('❌ Auth DB Error (Timeout/Connection):', err.message);
      return res.status(503).json({
        error: 'Database connection issue',
        message: 'The server is experiencing high latency or connectivity issues. Please try again.',
      });
    }
    console.warn('🔍 Auth: Invalid or expired token');
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const isValidUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

const logAction = async (userId, userName, userRole, action, module, details, ip = '127.0.0.1') => {
  try {
    const validUserId = isValidUUID(userId) ? userId : null;
    const tenantId = await getTenantId();
    await db.prepare(`INSERT INTO audit_logs (id, user_id, user_name, user_role, action, module, details, timestamp, ip_address, tenant_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(uuidv4(), validUserId, userName, userRole, action, module, details, new Date().toISOString(), ip, tenantId);
  } catch (e) {
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

module.exports = { authenticate, logAction, authorize, getTenantId, clearTenantCache };
