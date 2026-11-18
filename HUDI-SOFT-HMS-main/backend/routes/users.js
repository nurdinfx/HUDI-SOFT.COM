const express = require('express');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const db = require('../database');
const { authenticate, logAction } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const fmt = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone, department: u.department, avatar: u.avatar, isActive: u.is_active === 1 || u.is_active === true, createdAt: u.created_at });

router.get('/', async (req, res) => {
    const { search, role } = req.query;
    const tenantId = req.tenantId;
    let q = 'SELECT * FROM users WHERE tenant_id = $1';
    const p = [tenantId];
    let idx = 2;
    if (search) {
        const s = `%${search}%`;
        q += ` AND (name ILIKE $${idx} OR email ILIKE $${idx+1})`;
        idx += 2; p.push(s, s);
    }
    if (role) { q += ` AND role = $${idx++}`; p.push(role); }
    q += ' ORDER BY name';
    try {
        const result = await db.query(q, p);
        res.json(result.rows.map(fmt));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM users WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
        const row = result.rows[0];
        if (!row) return res.status(404).json({ error: 'User not found' });
        res.json(fmt(row));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { name, email, password, role, phone, department } = req.body;
    const tenantId = req.tenantId;
    if (!name || !email || !password || !role) return res.status(400).json({ error: 'name, email, password, role required' });

    try {
        const existing = await db.query('SELECT id FROM users WHERE email = $1 AND tenant_id = $2', [email, tenantId]);
        if (existing.rows.length > 0) return res.status(409).json({ error: 'Email already exists' });
        const hash = bcrypt.hashSync(password, 10);
        const id = uuidv4();
        await db.query(
            'INSERT INTO users (id, name, email, password_hash, role, phone, department, is_active, created_at, tenant_id) VALUES ($1,$2,$3,$4,$5,$6,$7,1,$8,$9)',
            [id, name, email.toLowerCase(), hash, role, phone || null, department || null, new Date().toISOString(), tenantId]
        );
        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Users', `User created: ${email}`, req.ip);
        const row = await db.query('SELECT * FROM users WHERE id = $1', [id]);
        res.status(201).json(fmt(row.rows[0]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    const tenantId = req.tenantId;
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) return res.status(403).json({ error: 'Forbidden' });
    try {
        const rowRes = await db.query('SELECT * FROM users WHERE id = $1 AND tenant_id = $2', [req.params.id, tenantId]);
        const row = rowRes.rows[0];
        if (!row) return res.status(404).json({ error: 'User not found' });
        const { name, email, role, phone, department, isActive, password } = req.body;
        const hash = password ? bcrypt.hashSync(password, 10) : row.password_hash;
        await db.query(
            'UPDATE users SET name=$1, email=$2, password_hash=$3, role=$4, phone=$5, department=$6, is_active=$7 WHERE id=$8 AND tenant_id=$9',
            [name || row.name, email || row.email, hash, role || row.role, phone ?? row.phone, department ?? row.department, isActive !== undefined ? (isActive ? 1 : 0) : row.is_active, req.params.id, tenantId]
        );
        logAction(req.user.id, req.user.name, req.user.role, 'UPDATE', 'Users', `User updated: ${email || row.email}`, req.ip);
        const updatedRow = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
        res.json(fmt(updatedRow.rows[0]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    const tenantId = req.tenantId;
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
    try {
        const rowRes = await db.query('SELECT * FROM users WHERE id = $1 AND tenant_id = $2', [req.params.id, tenantId]);
        const row = rowRes.rows[0];
        if (!row) return res.status(404).json({ error: 'Not found' });
        await db.query('DELETE FROM users WHERE id = $1 AND tenant_id = $2', [req.params.id, tenantId]);
        logAction(req.user.id, req.user.name, req.user.role, 'DELETE', 'Users', `User deleted: ${row.email}`, req.ip);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
