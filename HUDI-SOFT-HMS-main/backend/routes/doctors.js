const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, logAction } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const fmt = (d) => ({
    id: d.id, doctorId: d.doctor_id, name: d.name, email: d.email, phone: d.phone,
    specialization: d.specialization, department: d.department, qualification: d.qualification,
    experience: d.experience, consultationFee: d.consultation_fee,
    availableDays: JSON.parse(d.available_days || '[]'),
    availableTimeStart: d.available_time_start, availableTimeEnd: d.available_time_end,
    status: d.status, avatar: d.avatar, joinedAt: d.joined_at
});

router.get('/stats', async (req, res) => {
    const tenantId = req.tenantId;
    try {
        const totalRes = await db.query('SELECT COUNT(*) as c FROM doctors WHERE tenant_id = $1', [tenantId]);
        const total = parseInt(totalRes.rows[0]?.c || 0);
        const availableRes = await db.query("SELECT COUNT(*) as c FROM doctors WHERE status = 'available' AND tenant_id = $1", [tenantId]);
        const available = parseInt(availableRes.rows[0]?.c || 0);
        const deptsRes = await db.query('SELECT department, COUNT(*) as count FROM doctors WHERE tenant_id = $1 GROUP BY department', [tenantId]);
        res.json({
            totalDoctors: total,
            availableNow: available,
            departmentBreakdown: deptsRes.rows,
            onLeave: total - available
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id/performance', async (req, res) => {
    const tenantId = req.tenantId;
    try {
        const docRes = await db.query('SELECT name, consultation_fee FROM doctors WHERE id = $1 AND tenant_id = $2', [req.params.id, tenantId]);
        const doctor = docRes.rows[0];
        if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

        const opdRes = await db.query('SELECT COUNT(*) as c FROM opd_visits WHERE doctor_id = $1 AND tenant_id = $2', [req.params.id, tenantId]);
        const opdCount = parseInt(opdRes.rows[0]?.c || 0);
        const ipdRes = await db.query('SELECT COUNT(*) as c FROM ipd_admissions WHERE doctor_id = $1 AND tenant_id = $2', [req.params.id, tenantId]);
        const ipdCount = parseInt(ipdRes.rows[0]?.c || 0);
        const revenue = opdCount * doctor.consultation_fee;

        res.json({
            doctorName: doctor.name,
            totalAppointments: opdCount + ipdCount,
            opdVisits: opdCount,
            ipdAdmissions: ipdCount,
            estimatedRevenue: revenue
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/', async (req, res) => {
    const { search, status, department } = req.query;
    const tenantId = req.tenantId;
    let q = 'SELECT * FROM doctors WHERE tenant_id = $1';
    const p = [tenantId];
    let idx = 2;
    if (search) {
        const s = `%${search}%`;
        q += ` AND (name ILIKE $${idx} OR email ILIKE $${idx+1} OR specialization ILIKE $${idx+2} OR doctor_id ILIKE $${idx+3})`;
        idx += 4; p.push(s, s, s, s);
    }
    if (status) { q += ` AND status = $${idx++}`; p.push(status); }
    if (department) { q += ` AND department = $${idx++}`; p.push(department); }
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
        const result = await db.query('SELECT * FROM doctors WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
        const row = result.rows[0];
        if (!row) return res.status(404).json({ error: 'Doctor not found' });
        res.json(fmt(row));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    const { name, email, phone, specialization, department, qualification, experience, consultationFee, availableDays, availableTimeStart, availableTimeEnd, status } = req.body;
    const tenantId = req.tenantId;
    if (!name || !email || !specialization || !department) return res.status(400).json({ error: 'name, email, specialization, department required' });
    try {
        const maxIdRes = await db.query('SELECT doctor_id FROM doctors WHERE tenant_id = $1 ORDER BY doctor_id DESC LIMIT 1', [tenantId]);
        let nextNumber = 1;
        if (maxIdRes.rows[0]?.doctor_id) {
            const lastNumber = parseInt(maxIdRes.rows[0].doctor_id.split('-')[1]);
            if (!isNaN(lastNumber)) nextNumber = lastNumber + 1;
        }
        const doctorId = `DOC-${String(nextNumber).padStart(3, '0')}`;
        const id = uuidv4();

        await db.query(
            `INSERT INTO doctors (id, doctor_id, name, email, phone, specialization, department, qualification, experience, consultation_fee, available_days, available_time_start, available_time_end, status, joined_at, tenant_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
            [id, doctorId, name, email, phone || null, specialization, department, qualification || null, experience || 0, consultationFee || 0, JSON.stringify(availableDays || []), availableTimeStart || '09:00', availableTimeEnd || '17:00', status || 'available', new Date().toISOString(), tenantId]
        );
        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Doctors', `Doctor added: ${name}`, req.ip);
        const row = await db.query('SELECT * FROM doctors WHERE id = $1', [id]);
        res.status(201).json(fmt(row.rows[0]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    const tenantId = req.tenantId;
    try {
        const rowRes = await db.query('SELECT * FROM doctors WHERE id = $1 AND tenant_id = $2', [req.params.id, tenantId]);
        const row = rowRes.rows[0];
        if (!row) return res.status(404).json({ error: 'Doctor not found' });
        const { name, email, phone, specialization, department, qualification, experience, consultationFee, availableDays, availableTimeStart, availableTimeEnd, status } = req.body;
        await db.query(
            `UPDATE doctors SET name=$1, email=$2, phone=$3, specialization=$4, department=$5, qualification=$6, experience=$7, consultation_fee=$8, available_days=$9, available_time_start=$10, available_time_end=$11, status=$12 WHERE id=$13 AND tenant_id=$14`,
            [name || row.name, email || row.email, phone ?? row.phone, specialization || row.specialization, department || row.department, qualification ?? row.qualification, experience ?? row.experience, consultationFee ?? row.consultation_fee, availableDays ? JSON.stringify(availableDays) : row.available_days, availableTimeStart || row.available_time_start, availableTimeEnd || row.available_time_end, status || row.status, req.params.id, tenantId]
        );
        logAction(req.user.id, req.user.name, req.user.role, 'UPDATE', 'Doctors', `Doctor updated: ${name || row.name}`, req.ip);
        const updatedRow = await db.query('SELECT * FROM doctors WHERE id = $1', [req.params.id]);
        res.json(fmt(updatedRow.rows[0]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    const tenantId = req.tenantId;
    try {
        const rowRes = await db.query('SELECT * FROM doctors WHERE id = $1 AND tenant_id = $2', [req.params.id, tenantId]);
        const row = rowRes.rows[0];
        if (!row) return res.status(404).json({ error: 'Doctor not found' });
        await db.query('DELETE FROM doctors WHERE id = $1 AND tenant_id = $2', [req.params.id, tenantId]);
        logAction(req.user.id, req.user.name, req.user.role, 'DELETE', 'Doctors', `Doctor deleted: ${row.name}`, req.ip);
        res.json({ message: 'Doctor deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
