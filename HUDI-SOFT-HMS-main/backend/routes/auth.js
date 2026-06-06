const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { logAction } = require('../middleware/auth');
require('dotenv').config();

const router = express.Router();
const ensureAdminUser = require('../seedAdmin');

const ACTIVE_USER_SQL =
    'SELECT * FROM users WHERE email = ? AND (is_active = 1 OR is_active = true OR is_active IS NULL)';

function normalizeEmail(email) {
    const e = String(email).toLowerCase().trim();
    return e === 'admin@hospital' ? 'admin@hospital.com' : e;
}

async function findUserByEmail(email) {
    return db.prepare(ACTIVE_USER_SQL).get(email);
}

async function findUserByEmailAnyStatus(email) {
    return db.prepare('SELECT * FROM users WHERE LOWER(TRIM(email)) = LOWER(?)').get(email);
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
    let { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    email = normalizeEmail(email);
    password = String(password).trim();

    try {
        if (email === 'admin@hospital.com') {
            await ensureAdminUser();
        }

        let user = await findUserByEmail(email);
        if (!user) {
            user = await findUserByEmailAnyStatus(email);
        }

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const hash = user.password_hash || user.password;
        let valid = hash ? bcrypt.compareSync(password, hash) : false;

        if (!valid && email === 'admin@hospital.com') {
            await ensureAdminUser();
            user = await findUserByEmailAnyStatus(email);
            const retryHash = user?.password_hash || user?.password;
            valid = retryHash ? bcrypt.compareSync(password, retryHash) : false;
        }

        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '12h' });

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
        const user = await db.prepare('SELECT id, name, email, role, department, phone, is_active FROM users WHERE id = ?').get(decoded.id);
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
