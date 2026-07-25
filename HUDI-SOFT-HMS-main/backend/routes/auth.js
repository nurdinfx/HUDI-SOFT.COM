const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { logAction, clearTenantCache } = require('../middleware/auth');
require('dotenv').config();

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        // Get tenant_id for this installation
        const licenseResult = await db.query(
            `SELECT tenant_id, status, hospital_name FROM license_info LIMIT 1`
        );
        const license = licenseResult.rows[0];

        // Block login if license expired
        if (license && license.status === 'expired') {
            return res.status(403).json({
                error: 'License expired. Please activate or renew your license at hudi-soft.com',
                code: 'LICENSE_EXPIRED'
            });
        }

        const tenantId = license?.tenant_id || null;

        // Find user scoped to this tenant
        const userResult = await db.query(
            `SELECT * FROM users WHERE email = $1 AND is_active = 1 AND (tenant_id = $2 OR tenant_id IS NULL)`,
            [email.toLowerCase().trim(), tenantId]
        );
        const user = userResult.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const valid = bcrypt.compareSync(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Embed tenantId in JWT so every API call knows the tenant
        const token = jwt.sign(
            { id: user.id, role: user.role, tenantId },
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
                tenantId,
                hospitalName: license?.hospital_name || 'Hospital',
            },
            license: {
                status: license?.status || 'demo',
                hospitalName: license?.hospital_name || 'My Hospital',
                tenantId,
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({
            error: `Login Error: ${err.message}`,
            details: err.message,
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
        const tenantId = decoded.tenantId;

        const userResult = await db.query(
            `SELECT id, name, email, role, department, phone, is_active FROM users WHERE id = $1 AND (tenant_id = $2 OR tenant_id IS NULL)`,
            [decoded.id, tenantId]
        );
        const user = userResult.rows[0];
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({ ...user, isActive: user.is_active === 1, tenantId });
    } catch (e) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    res.json({ message: 'Logged out successfully' });
});

module.exports = router;
