const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('../database');
const { logAction } = require('../middleware/auth');
require('dotenv').config();

const router = express.Router();

/**
 * Derive a deterministic tenantId from a license key.
 * Mirrors makeTenantId() in license.js — same formula.
 * This means the same license key always resolves to the same tenant.
 */
function makeTenantId(licenseKey) {
    const hash = crypto.createHash('sha256').update(licenseKey.toUpperCase().trim()).digest('hex');
    return [
        hash.substring(0, 8),
        hash.substring(8, 12),
        '4' + hash.substring(13, 16),
        (parseInt(hash.substring(16, 18), 16) & 0x3f | 0x80).toString(16) + hash.substring(18, 20),
        hash.substring(20, 32)
    ].join('-');
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password, licenseKey } = req.body;

    // Determine tenantId — always required for proper multi-tenant isolation
    // Priority: 1) X-Tenant-ID header, 2) licenseKey in body, 3) default fallback
    let tenantId = req.headers['x-tenant-id'];
    if ((!tenantId || tenantId === '00000000-0000-0000-0000-000000000000') && licenseKey) {
        tenantId = makeTenantId(licenseKey);
    }
    if (!tenantId) {
        tenantId = '00000000-0000-0000-0000-000000000000';
    }

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        // TENANT-ISOLATED login: ONLY search within the specified tenant
        // This is the core security guarantee — Hospital B cannot see Hospital A's users
        let userRes = await db.queryBypassRLS(
            'SELECT * FROM users WHERE email = $1 AND tenant_id = $2 AND is_active = 1 LIMIT 1',
            [email.toLowerCase().trim(), tenantId]
        );
        let user = userRes.rows[0];

        // Auto-provision admin@hospital.com if it doesn't exist for this tenant
        if (!user && email.toLowerCase().trim() === 'admin@hospital.com' && tenantId !== '00000000-0000-0000-0000-000000000000') {
            const hashedPw = bcrypt.hashSync('admin123', 10);
            const adminId = uuidv4();
            
            await db.queryBypassRLS(
                `INSERT INTO users (id, name, email, password_hash, role, is_active, tenant_id, created_at)
                 VALUES ($1, 'Admin', $2, $3, 'admin', 1, $4, CURRENT_TIMESTAMP)
                 ON CONFLICT (tenant_id, email) DO NOTHING`,
                [adminId, 'admin@hospital.com', hashedPw, tenantId]
            );
            
            // Re-fetch the newly created user
            userRes = await db.queryBypassRLS(
                'SELECT * FROM users WHERE email = $1 AND tenant_id = $2 AND is_active = 1 LIMIT 1',
                ['admin@hospital.com', tenantId]
            );
            user = userRes.rows[0];
        }

        // Only allow cross-tenant fallback for the default legacy tenant (no activation)
        // This handles existing deployments that haven't activated a license yet
        if (!user && tenantId === '00000000-0000-0000-0000-000000000000') {
            userRes = await db.queryBypassRLS(
                'SELECT * FROM users WHERE email = $1 AND is_active = 1 ORDER BY created_at ASC LIMIT 1',
                [email.toLowerCase().trim()]
            );
            user = userRes.rows[0];
        }

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const valid = bcrypt.compareSync(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // JWT always carries the user's actual tenant_id (from the DB row, not the header)
        const actualTenantId = user.tenant_id || tenantId;
        const token = jwt.sign(
            { id: user.id, role: user.role, tenantId: actualTenantId },
            process.env.JWT_SECRET,
            { expiresIn: '12h' }
        );

        logAction(user.id, user.name, user.role, 'LOGIN', 'Auth', `User logged in: ${user.email}`, req.ip);

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
                phone: user.phone,
                isActive: user.is_active === 1,
                tenantId: actualTenantId
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({
            error: `Login Error: ${err.message}`,
            details: err.message,
            action: 'Check your Render Logs for more details'
        });
    }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Always use tenantId from JWT token — this is authoritative
        const tenantId = decoded.tenantId || '00000000-0000-0000-0000-000000000000';

        // ALWAYS require both id AND tenant_id — no cross-tenant fallback allowed
        const userRes = await db.queryBypassRLS(
            'SELECT id, name, email, role, department, phone, is_active, tenant_id FROM users WHERE id = $1 AND tenant_id = $2 LIMIT 1',
            [decoded.id, tenantId]
        );
        const user = userRes.rows[0];

        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ ...user, isActive: user.is_active === 1 });
    } catch (e) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    res.json({ message: 'Logged out successfully' });
});

module.exports = router;
