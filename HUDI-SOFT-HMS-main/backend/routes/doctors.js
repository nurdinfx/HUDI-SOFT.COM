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
  const tenantId = req.user.tenant_id;
  try {
    const [total, available, depts] = await Promise.all([
      db.queryBypassRLS('SELECT COUNT(*) as c FROM doctors WHERE tenant_id = $1', [tenantId]).then(r => parseInt(r.rows[0].c)),
      db.queryBypassRLS("SELECT COUNT(*) as c FROM doctors WHERE tenant_id = $1 AND status = 'available'", [tenantId]).then(r => parseInt(r.rows[0].c)),
      db.queryBypassRLS('SELECT department, COUNT(*) as count FROM doctors WHERE tenant_id = $1 GROUP BY department', [tenantId]).then(r => r.rows),
    ]);
    res.json({ totalDoctors: total, availableNow: available, departmentBreakdown: depts, onLeave: total - available });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/performance', async (req, res) => {
  const tenantId = req.user.tenant_id;
  try {
    const docR = await db.queryBypassRLS('SELECT name, consultation_fee FROM doctors WHERE id = $1 AND tenant_id = $2', [req.params.id, tenantId]);
    if (!docR.rows[0]) return res.status(404).json({ error: 'Doctor not found' });
    const doctor = docR.rows[0];
    const [opd, ipd] = await Promise.all([
      db.queryBypassRLS('SELECT COUNT(*) as c FROM opd_visits WHERE doctor_id = $1 AND tenant_id = $2', [req.params.id, tenantId]).then(r => parseInt(r.rows[0].c)),
      db.queryBypassRLS('SELECT COUNT(*) as c FROM ipd_admissions WHERE doctor_id = $1 AND tenant_id = $2', [req.params.id, tenantId]).then(r => parseInt(r.rows[0].c)),
    ]);
    res.json({ doctorName: doctor.name, totalAppointments: opd + ipd, opdVisits: opd, ipdAdmissions: ipd, estimatedRevenue: opd * doctor.consultation_fee });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/', async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { search, status, department } = req.query;
  let sql = 'SELECT * FROM doctors WHERE tenant_id = $1';
  const p = [tenantId];
  if (search) { sql += ` AND (name ILIKE $${p.length+1} OR email ILIKE $${p.length+1} OR specialization ILIKE $${p.length+1} OR doctor_id ILIKE $${p.length+1})`; p.push(`%${search}%`); }
  if (status) { sql += ` AND status = $${p.length+1}`; p.push(status); }
  if (department) { sql += ` AND department = $${p.length+1}`; p.push(department); }
  sql += ' ORDER BY name';
  try {
    const r = await db.queryBypassRLS(sql, p);
    res.json(r.rows.map(fmt));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await db.queryBypassRLS('SELECT * FROM doctors WHERE id = $1 AND tenant_id = $2', [req.params.id, req.user.tenant_id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Doctor not found' });
    res.json(fmt(r.rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { name, email, phone, specialization, department, qualification, experience, consultationFee, availableDays, availableTimeStart, availableTimeEnd, status } = req.body;
  if (!name || !email || !specialization || !department) return res.status(400).json({ error: 'name, email, specialization, department required' });
  try {
    const maxR = await db.queryBypassRLS("SELECT doctor_id FROM doctors WHERE tenant_id = $1 AND doctor_id LIKE 'DOC-%' ORDER BY doctor_id DESC LIMIT 1", [tenantId]);
    const lastNum = maxR.rows[0]?.doctor_id ? parseInt(maxR.rows[0].doctor_id.split('-')[1]) : 0;
    const doctorId = `DOC-${String((lastNum || 0) + 1).padStart(3, '0')}`;
    const id = uuidv4();
    await db.queryBypassRLS(
      `INSERT INTO doctors (id, doctor_id, name, email, phone, specialization, department, qualification, experience, consultation_fee, available_days, available_time_start, available_time_end, status, joined_at, tenant_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [id, doctorId, name, email, phone||null, specialization, department, qualification||null,
       experience||0, consultationFee||0, JSON.stringify(availableDays||[]),
       availableTimeStart||'09:00', availableTimeEnd||'17:00', status||'available',
       new Date().toISOString(), tenantId]
    );
    logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Doctors', `Doctor added: ${name}`, req.ip);
    const row = await db.queryBypassRLS('SELECT * FROM doctors WHERE id = $1', [id]);
    res.status(201).json(fmt(row.rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  const tenantId = req.user.tenant_id;
  try {
    const existing = await db.queryBypassRLS('SELECT * FROM doctors WHERE id = $1 AND tenant_id = $2', [req.params.id, tenantId]);
    const row = existing.rows[0];
    if (!row) return res.status(404).json({ error: 'Doctor not found' });
    const { name, email, phone, specialization, department, qualification, experience, consultationFee, availableDays, availableTimeStart, availableTimeEnd, status } = req.body;
    await db.queryBypassRLS(
      `UPDATE doctors SET name=$1,email=$2,phone=$3,specialization=$4,department=$5,qualification=$6,experience=$7,consultation_fee=$8,available_days=$9,available_time_start=$10,available_time_end=$11,status=$12 WHERE id=$13 AND tenant_id=$14`,
      [name||row.name, email||row.email, phone??row.phone, specialization||row.specialization,
       department||row.department, qualification??row.qualification, experience??row.experience,
       consultationFee??row.consultation_fee, availableDays ? JSON.stringify(availableDays) : row.available_days,
       availableTimeStart||row.available_time_start, availableTimeEnd||row.available_time_end,
       status||row.status, req.params.id, tenantId]
    );
    logAction(req.user.id, req.user.name, req.user.role, 'UPDATE', 'Doctors', `Doctor updated: ${name||row.name}`, req.ip);
    const updated = await db.queryBypassRLS('SELECT * FROM doctors WHERE id = $1', [req.params.id]);
    res.json(fmt(updated.rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  const tenantId = req.user.tenant_id;
  try {
    const existing = await db.queryBypassRLS('SELECT * FROM doctors WHERE id = $1 AND tenant_id = $2', [req.params.id, tenantId]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Doctor not found' });
    await db.queryBypassRLS('DELETE FROM doctors WHERE id = $1 AND tenant_id = $2', [req.params.id, tenantId]);
    logAction(req.user.id, req.user.name, req.user.role, 'DELETE', 'Doctors', `Doctor deleted: ${existing.rows[0].name}`, req.ip);
    res.json({ message: 'Doctor deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
