/**
 * middleware/auth.js
 * Authentication + multi-tenant middleware.
 * Injects req.user and req.tenantId into every authenticated request.
 *
 * MULTI-TENANCY: tenantId is read ONLY from the JWT token (set at login).
 * Each hospital has a unique tenant_id embedded in their JWT at login.
 * We do NOT use a global cache — that would mix data across hospitals.
 */
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

    // tenantId MUST come from the JWT — this is what isolates hospital data
    const tenantId = decoded.tenantId;

    if (!tenantId) {
      console.warn('⚠️  Auth: No tenantId in JWT token — user must re-login after license activation');
      return res.status(401).json({
        error: 'Session expired: your account needs re-login after license activation',
        code: 'TENANT_MISSING'
      });
    }

    // Fetch user scoped to the tenant
    const user = await db.query(
      `SELECT id, name, email, role, department
       FROM users
       WHERE id = $1 AND is_active = 1 AND tenant_id = $2`,
      [decoded.id, tenantId]
    );

    const foundUser = user.rows[0];
    if (!foundUser) {
      console.warn(`🔍 Auth: User not found or inactive for ID: ${decoded.id}, tenant: ${tenantId}`);
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
    await db.query(
      `INSERT INTO audit_logs (id, user_id, user_name, user_role, action, module, details, timestamp, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [uuidv4(), validUserId, userName, userRole, action, module, details, new Date().toISOString(), ip]
    );
  } catch (e) {
    console.error('Audit Log Silent Fail:', e.message);
  }
};

// Helper for backward compat — reads tenant from DB license table for non-JWT contexts (e.g. license routes)
async function getTenantId() {
  try {
    const result = await db.query('SELECT tenant_id FROM license_info WHERE status IN ($1, $2) LIMIT 1', ['active', 'demo']);
    if (result.rows[0]?.tenant_id) return result.rows[0].tenant_id;
    const fallback = await db.query('SELECT tenant_id FROM license_info LIMIT 1');
    return fallback.rows[0]?.tenant_id || null;
  } catch (e) {
    console.warn('⚠️  Could not fetch tenant_id:', e.message);
    return null;
  }
}

// No-op for backward compat
function clearTenantCache() {}

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
