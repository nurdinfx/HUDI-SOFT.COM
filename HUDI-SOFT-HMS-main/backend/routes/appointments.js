const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, logAction, authorize } = require('../middleware/auth');
const { sendPushNotification } = require('../utils/push-notify');

const router = express.Router();
router.use(authenticate);
router.use(authorize(['receptionist', 'doctor', 'admin', 'nurse']));

const fmt = (a) => ({
    id: a.id, appointmentId: a.appointment_id, patientId: a.patient_id, patientName: a.patient_name,
    doctorId: a.doctor_id, doctorName: a.doctor_name, department: a.department,
    date: a.date, time: a.time, type: a.type, status: a.status, notes: a.notes, createdAt: a.created_at,
    isViewedByDoctor: !!a.is_viewed_by_doctor
});

router.get('/', async (req, res) => {
    const { search, status, date, doctorId, patientId } = req.query;
    const tenantId = req.tenantId;
    let q = 'SELECT * FROM appointments WHERE tenant_id = $1';
    const p = [tenantId];
    let idx = 2;

    if (doctorId) { q += ` AND doctor_id = $${idx++}`; p.push(doctorId); }
    if (search) {
        const s = `%${search}%`;
        q += ` AND (patient_name ILIKE $${idx} OR doctor_name ILIKE $${idx+1} OR appointment_id ILIKE $${idx+2})`;
        idx += 3; p.push(s, s, s);
    }
    if (status) { q += ` AND status = $${idx++}`; p.push(status); }
    if (date) { q += ` AND date = $${idx++}`; p.push(date); }
    if (patientId) { q += ` AND patient_id = $${idx++}`; p.push(patientId); }
    q += ' ORDER BY date DESC, time DESC';
    try {
        const result = await db.query(q, p);
        res.json(result.rows.map(fmt));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM appointments WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
        const row = result.rows[0];
        if (!row) return res.status(404).json({ error: 'Appointment not found' });
        res.json(fmt(row));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    const { patientId, doctorId, date, time, type, notes } = req.body;
    const tenantId = req.tenantId;
    if (!patientId || !doctorId || !date || !time) return res.status(400).json({ error: 'patientId, doctorId, date, time required' });
    try {
        const patientRes = await db.query('SELECT * FROM patients WHERE id = $1 AND tenant_id = $2', [patientId, tenantId]);
        const doctorRes = await db.query('SELECT * FROM doctors WHERE id = $1 AND tenant_id = $2', [doctorId, tenantId]);
        const patient = patientRes.rows[0];
        const doctor = doctorRes.rows[0];
        if (!patient) return res.status(404).json({ error: 'Patient not found' });
        if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

        const maxIdRes = await db.query('SELECT appointment_id FROM appointments WHERE tenant_id = $1 ORDER BY appointment_id DESC LIMIT 1', [tenantId]);
        let nextNumber = 1;
        if (maxIdRes.rows[0]?.appointment_id) {
            const lastNumber = parseInt(maxIdRes.rows[0].appointment_id.split('-')[1]);
            if (!isNaN(lastNumber)) nextNumber = lastNumber + 1;
        }
        const apptId = `APT-${String(nextNumber).padStart(4, '0')}`;
        const id = uuidv4();

        await db.query(
            `INSERT INTO appointments (id, appointment_id, patient_id, patient_name, doctor_id, doctor_name, department, date, time, type, status, notes, created_at, tenant_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
            [id, apptId, patientId, `${patient.first_name} ${patient.last_name}`, doctorId, doctor.name, doctor.department, date, time, type || 'consultation', 'scheduled', notes || null, new Date().toISOString(), tenantId]
        );
        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Appointments', `Appointment created: ${apptId}`, req.ip);

        sendPushNotification({
            title: '📅 New Appointment Booked',
            message: `${patient.first_name} ${patient.last_name} has a new appointment with Dr. ${doctor.name} at ${time}.`,
            url: `/appointments?id=${id}`
        });

        const row = await db.query('SELECT * FROM appointments WHERE id = $1', [id]);
        res.status(201).json(fmt(row.rows[0]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    const tenantId = req.tenantId;
    try {
        const rowRes = await db.query('SELECT * FROM appointments WHERE id = $1 AND tenant_id = $2', [req.params.id, tenantId]);
        const row = rowRes.rows[0];
        if (!row) return res.status(404).json({ error: 'Appointment not found' });
        const { date, time, type, status, notes } = req.body;
        await db.query('UPDATE appointments SET date=$1, time=$2, type=$3, status=$4, notes=$5 WHERE id=$6 AND tenant_id=$7',
            [date || row.date, time || row.time, type || row.type, status || row.status, notes ?? row.notes, req.params.id, tenantId]);
        logAction(req.user.id, req.user.name, req.user.role, 'UPDATE', 'Appointments', `Appointment ${row.appointment_id} updated`, req.ip);
        const updatedRow = await db.query('SELECT * FROM appointments WHERE id = $1', [req.params.id]);
        res.json(fmt(updatedRow.rows[0]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id/view', async (req, res) => {
    const tenantId = req.tenantId;
    try {
        const rowRes = await db.query('SELECT * FROM appointments WHERE id = $1 AND tenant_id = $2', [req.params.id, tenantId]);
        const row = rowRes.rows[0];
        if (!row) return res.status(404).json({ error: 'Appointment not found' });
        await db.query('UPDATE appointments SET is_viewed_by_doctor = true WHERE id = $1 AND tenant_id = $2', [req.params.id, tenantId]);
        const updatedRow = await db.query('SELECT * FROM appointments WHERE id = $1', [req.params.id]);
        res.json(fmt(updatedRow.rows[0]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    const tenantId = req.tenantId;
    try {
        const rowRes = await db.query('SELECT * FROM appointments WHERE id = $1 AND tenant_id = $2', [req.params.id, tenantId]);
        const row = rowRes.rows[0];
        if (!row) return res.status(404).json({ error: 'Not found' });
        await db.query('DELETE FROM appointments WHERE id = $1 AND tenant_id = $2', [req.params.id, tenantId]);
        logAction(req.user.id, req.user.name, req.user.role, 'DELETE', 'Appointments', `Appointment ${row.appointment_id} deleted`, req.ip);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
