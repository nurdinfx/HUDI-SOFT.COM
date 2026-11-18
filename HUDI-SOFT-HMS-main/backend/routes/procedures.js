const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, logAction, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);
router.use(authorize(['doctor', 'nurse', 'admin']));

// GET procedures for a visit — scoped to tenant
router.get('/visit/:visitId', async (req, res) => {
    const tenantId = req.tenantId;
    try {
        const rows = await db.prepare('SELECT * FROM procedures WHERE opd_visit_id = ? AND tenant_id = ? ORDER BY created_at DESC').all(req.params.visitId, tenantId);
        res.json(rows.map(r => ({
            id: r.id,
            opdVisitId: r.opd_visit_id,
            patientId: r.patient_id,
            doctorId: r.doctor_id,
            name: r.name,
            description: r.description,
            category: r.category,
            cost: parseFloat(r.cost),
            status: r.status,
            createdAt: r.created_at
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST new procedure
router.post('/', async (req, res) => {
    const { opdVisitId, patientId, doctorId, name, description, category, cost } = req.body;
    if (!opdVisitId || !patientId || !doctorId || !name || cost === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const tenantId = req.tenantId;
    try {
        // Verify the visit belongs to this tenant
        const visit = await db.prepare('SELECT id FROM opd_visits WHERE id = ? AND tenant_id = ?').get(opdVisitId, tenantId);
        if (!visit) return res.status(404).json({ error: 'OPD Visit not found' });

        const id = uuidv4();
        await db.run('BEGIN TRANSACTION');

        const date = new Date().toISOString().split('T')[0];

        // 1. Insert Procedure
        await db.prepare(`
            INSERT INTO procedures (id, opd_visit_id, patient_id, doctor_id, name, description, category, cost, status, tenant_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, opdVisitId, patientId, doctorId, name, description || '', category || 'General', cost, 'active', tenantId);

        // 2. Create Financial Transaction (Account Entry)
        const accountEntryId = uuidv4();
        await db.prepare(`
            INSERT INTO account_entries (id, date, type, category, description, amount, payment_method, reference_id, department, status, user_id, tenant_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            accountEntryId,
            date,
            'income',
            'Procedures',
            `Procedure: ${name} (Visit: ${opdVisitId})`,
            cost,
            'cash',
            id,
            'OPD',
            'completed',
            req.user.id,
            tenantId
        );

        await db.run('COMMIT');
        
        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Procedures', `Created procedure ${name} for visit ${opdVisitId}`, req.ip);
        
        const r = await db.prepare('SELECT * FROM procedures WHERE id = ?').get(id);
        res.status(201).json({
            id: r.id,
            opdVisitId: r.opd_visit_id,
            patientId: r.patient_id,
            doctorId: r.doctor_id,
            name: r.name,
            description: r.description,
            category: r.category,
            cost: parseFloat(r.cost),
            status: r.status,
            createdAt: r.created_at
        });
    } catch (err) {
        await db.run('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
});

// PUT update procedure
router.put('/:id', async (req, res) => {
    const { name, description, category, cost } = req.body;
    const tenantId = req.tenantId;
    try {
        const existing = await db.prepare('SELECT * FROM procedures WHERE id = ? AND tenant_id = ?').get(req.params.id, tenantId);
        if (!existing) return res.status(404).json({ error: 'Procedure not found' });
        if (existing.status === 'cancelled') return res.status(400).json({ error: 'Cannot edit cancelled procedure' });

        await db.run('BEGIN TRANSACTION');

        // Update procedure
        await db.prepare(`
            UPDATE procedures SET name = ?, description = ?, category = ?, cost = ?
            WHERE id = ? AND tenant_id = ?
        `).run(name || existing.name, description ?? existing.description, category ?? existing.category, cost ?? existing.cost, req.params.id, tenantId);

        // Update financial entry if cost changed
        if (cost !== undefined && parseFloat(cost) !== parseFloat(existing.cost)) {
            await db.prepare(`
                UPDATE account_entries SET amount = ? WHERE reference_id = ? AND type = 'income' AND tenant_id = ?
            `).run(cost, req.params.id, tenantId);
        }

        await db.run('COMMIT');
        
        const r = await db.prepare('SELECT * FROM procedures WHERE id = ?').get(req.params.id);
        res.json({
            id: r.id,
            opdVisitId: r.opd_visit_id,
            patientId: r.patient_id,
            doctorId: r.doctor_id,
            name: r.name,
            description: r.description,
            category: r.category,
            cost: parseFloat(r.cost),
            status: r.status,
            createdAt: r.created_at
        });
    } catch (err) {
        await db.run('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
});

// DELETE (Cancel) procedure
router.delete('/:id', async (req, res) => {
    const tenantId = req.tenantId;
    try {
        const existing = await db.prepare('SELECT * FROM procedures WHERE id = ? AND tenant_id = ?').get(req.params.id, tenantId);
        if (!existing) return res.status(404).json({ error: 'Procedure not found' });
        if (existing.status === 'cancelled') return res.status(400).json({ error: 'Already cancelled' });

        await db.run('BEGIN TRANSACTION');

        // 1. Mark as cancelled
        await db.prepare('UPDATE procedures SET status = ? WHERE id = ? AND tenant_id = ?').run('cancelled', req.params.id, tenantId);

        // 2. Create Reversing Entry (Negative income)
        const accountEntryId = uuidv4();
        const date = new Date().toISOString().split('T')[0];
        await db.prepare(`
            INSERT INTO account_entries (id, date, type, category, description, amount, payment_method, reference_id, department, status, user_id, tenant_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            accountEntryId,
            date,
            'income',
            'Procedures',
            `CANCELLED: ${existing.name} (Visit: ${existing.opd_visit_id})`,
            -parseFloat(existing.cost),
            'cash',
            req.params.id,
            'OPD',
            'completed',
            req.user.id,
            tenantId
        );

        await db.run('COMMIT');
        res.json({ message: 'Procedure cancelled and revenue reversed' });
    } catch (err) {
        await db.run('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
