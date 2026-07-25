/**
 * routes/auth.js
 *
 * MULTI-TENANCY LOGIN STRATEGY:
 *   Each hospital has a unique license key → unique tenant_id in license_info.
 *   Users are scoped by tenant_id.
 *
 *   Login priority:
 *   1. X-License-Key header → find tenant from license_info by key
 *   2. licenseKey in body → same
 *   3. Find user by email → use that user's own tenant_id (simplest for single-instance)
 *
 *   The tenant_id is embedded in the JWT so every future request is automatically scoped.
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { logAction } = require('../middleware/auth');
require('dotenv').config();

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password, licenseKey } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        // ── Strategy 1: License key provided → scope user to that tenant ──
        const keyFromHeader = req.headers['x-license-key'];
        const keyFromBody = licenseKey;
        const cleanKey = (keyFromHeader || keyFromBody || '').trim().toUpperCase();

        let tenantId = null;
        let licenseInfo = null;

        if (cleanKey) {
            const licResult = await db.query(
                `SELECT tenant_id, status, hospital_name FROM license_info WHERE license_key = $1 LIMIT 1`,
                [cleanKey]
            );
            if (licResult.rows[0]) {
                licenseInfo = licResult.rows[0];
                tenantId = licResult.rows[0].tenant_id;
            }
        }

        // ── Strategy 2: Find the user, use their tenant_id ──
        // This works when each hospital user has a unique email (most common case)
        let userResult;
        if (tenantId) {
            userResult = await db.query(
                `SELECT * FROM users WHERE email = $1 AND is_active = 1 AND tenant_id = $2`,
                [email.toLowerCase().trim(), tenantId]
            );
        } else {
            // No license key — find user by email, any tenant
            // The tenant_id comes from the USER's own record
            userResult = await db.query(
                `SELECT * FROM users WHERE email = $1 AND is_active = 1 LIMIT 1`,
                [email.toLowerCase().trim()]
            );
        }

        const user = userResult.rows[0];
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const valid = bcrypt.compareSync(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Use the user's own tenant_id (most reliable)
        const userTenantId = user.tenant_id || tenantId;

        // Fetch this tenant's license info for hospital name
        if (!licenseInfo && userTenantId) {
            const licResult = await db.query(
                `SELECT status, hospital_name FROM license_info WHERE tenant_id = $1 LIMIT 1`,
                [userTenantId]
            );
            licenseInfo = licResult.rows[0] || null;
        }

        // Block if license expired
        if (licenseInfo && licenseInfo.status === 'expired') {
            return res.status(403).json({
                error: 'License expired. Please activate or renew your license at hudi-soft.com',
                code: 'LICENSE_EXPIRED'
            });
        }

        // ── Embed tenantId in JWT ──
        const token = jwt.sign(
            { id: user.id, role: user.role, tenantId: userTenantId },
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
                isActive: user.is_active === 1 || user.is_active === true,
                tenantId: userTenantId,
                hospitalName: licenseInfo?.hospital_name || 'My Hospital',
            },
            license: {
                status: licenseInfo?.status || 'demo',
                hospitalName: licenseInfo?.hospital_name || 'My Hospital',
                tenantId: userTenantId,
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: `Login Error: ${err.message}` });
    }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const tenantId = decoded.tenantId;

        const userResult = await db.query(
            `SELECT id, name, email, role, department, phone, is_active FROM users WHERE id = $1 AND tenant_id = $2`,
            [decoded.id, tenantId]
        );
        const user = userResult.rows[0];
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({ ...user, isActive: user.is_active === 1 || user.is_active === true, tenantId });
    } catch (e) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    res.json({ message: 'Logged out successfully' });
});

module.exports = router;
