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
  date: a.date, time: a.time, type: a.type, status: a.status, notes: a.notes,
  createdAt: a.created_at, isViewedByDoctor: !!a.is_viewed_by_doctor
});

router.get('/', async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { search, status, date, doctorId, patientId } = req.query;
  let sql = 'SELECT * FROM appointments WHERE tenant_id = $1';
  const p = [tenantId];
  if (doctorId) { sql += ` AND doctor_id = $${p.length+1}`; p.push(doctorId); }
  if (search) { sql += ` AND (patient_name ILIKE $${p.length+1} OR doctor_name ILIKE $${p.length+1} OR appointment_id ILIKE $${p.length+1})`; p.push(`%${search}%`); }
  if (status) { sql += ` AND status = $${p.length+1}`; p.push(status); }
  if (date) { sql += ` AND date = $${p.length+1}`; p.push(date); }
  if (patientId) { sql += ` AND patient_id = $${p.length+1}`; p.push(patientId); }
  sql += ' ORDER BY date DESC, time DESC';
  try {
    const r = await db.queryBypassRLS(sql, p);
    res.json(r.rows.map(fmt));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await db.queryBypassRLS('SELECT * FROM appointments WHERE id = $1 AND tenant_id = $2', [req.params.id, req.user.tenant_id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Appointment not found' });
    res.json(fmt(r.rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { patientId, doctorId, date, time, type, notes } = req.body;
  if (!patientId || !doctorId || !date || !time) return res.status(400).json({ error: 'patientId, doctorId, date, time required' });
  try {
    const [patientR, doctorR] = await Promise.all([
      db.queryBypassRLS('SELECT * FROM patients WHERE id = $1 AND tenant_id = $2', [patientId, tenantId]),
      db.queryBypassRLS('SELECT * FROM doctors WHERE id = $1 AND tenant_id = $2', [doctorId, tenantId]),
    ]);
    const patient = patientR.rows[0];
    const doctor = doctorR.rows[0];
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    const maxR = await db.queryBypassRLS("SELECT appointment_id FROM appointments WHERE tenant_id = $1 AND appointment_id LIKE 'APT-%' ORDER BY appointment_id DESC LIMIT 1", [tenantId]);
    const lastNum = maxR.rows[0]?.appointment_id ? parseInt(maxR.rows[0].appointment_id.split('-')[1]) : 0;
    const apptId = `APT-${String((lastNum||0)+1).padStart(4,'0')}`;
    const id = uuidv4();

    await db.queryBypassRLS(
      `INSERT INTO appointments (id,appointment_id,patient_id,patient_name,doctor_id,doctor_name,department,date,time,type,status,notes,created_at,tenant_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [id, apptId, patientId, `${patient.first_name} ${patient.last_name}`, doctorId, doctor.name,
       doctor.department, date, time, type||'consultation', 'scheduled', notes||null,
       new Date().toISOString(), tenantId]
    );
    logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Appointments', `Appointment created: ${apptId}`, req.ip);
    sendPushNotification({ title: '📅 New Appointment', message: `${patient.first_name} with Dr. ${doctor.name} at ${time}`, url: `/appointments?id=${id}` });
    const row = await db.queryBypassRLS('SELECT * FROM appointments WHERE id = $1', [id]);
    res.status(201).json(fmt(row.rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  const tenantId = req.user.tenant_id;
  try {
    const existing = await db.queryBypassRLS('SELECT * FROM appointments WHERE id = $1 AND tenant_id = $2', [req.params.id, tenantId]);
    const row = existing.rows[0];
    if (!row) return res.status(404).json({ error: 'Appointment not found' });
    const { date, time, type, status, notes } = req.body;
    await db.queryBypassRLS(
      'UPDATE appointments SET date=$1,time=$2,type=$3,status=$4,notes=$5 WHERE id=$6 AND tenant_id=$7',
      [date||row.date, time||row.time, type||row.type, status||row.status, notes??row.notes, req.params.id, tenantId]
    );
    logAction(req.user.id, req.user.name, req.user.role, 'UPDATE', 'Appointments', `Appointment ${row.appointment_id} updated`, req.ip);
    const updated = await db.queryBypassRLS('SELECT * FROM appointments WHERE id = $1', [req.params.id]);
    res.json(fmt(updated.rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/view', async (req, res) => {
  const tenantId = req.user.tenant_id;
  try {
    const existing = await db.queryBypassRLS('SELECT * FROM appointments WHERE id = $1 AND tenant_id = $2', [req.params.id, tenantId]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Appointment not found' });
    await db.queryBypassRLS('UPDATE appointments SET is_viewed_by_doctor = 1 WHERE id = $1 AND tenant_id = $2', [req.params.id, tenantId]);
    const updated = await db.queryBypassRLS('SELECT * FROM appointments WHERE id = $1', [req.params.id]);
    res.json(fmt(updated.rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  const tenantId = req.user.tenant_id;
  try {
    const existing = await db.queryBypassRLS('SELECT * FROM appointments WHERE id = $1 AND tenant_id = $2', [req.params.id, tenantId]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Not found' });
    await db.queryBypassRLS('DELETE FROM appointments WHERE id = $1 AND tenant_id = $2', [req.params.id, tenantId]);
    logAction(req.user.id, req.user.name, req.user.role, 'DELETE', 'Appointments', `Appointment deleted`, req.ip);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
