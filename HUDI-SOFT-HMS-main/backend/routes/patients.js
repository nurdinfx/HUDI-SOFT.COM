const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, logAction, authorize } = require('../middleware/auth');
const { sendPushNotification } = require('../utils/push-notify');

const router = express.Router();
router.use(authenticate);
router.use(authorize(['admin', 'doctor', 'nurse', 'receptionist', 'lab_tech', 'pharmacist', 'accountant']));

const fmt = (p) => ({
  id: p.id, patientId: p.patient_id, firstName: p.first_name, lastName: p.last_name,
  dateOfBirth: p.date_of_birth, gender: p.gender, bloodGroup: p.blood_group,
  phone: p.phone, email: p.email, address: p.address, city: p.city,
  emergencyContact: p.emergency_contact, emergencyPhone: p.emergency_phone,
  insuranceProvider: p.insurance_provider, insurancePolicyNumber: p.insurance_policy_number,
  allergies: JSON.parse(p.allergies || '[]'), chronicConditions: JSON.parse(p.chronic_conditions || '[]'),
  status: p.status, registeredAt: p.registered_at, lastVisit: p.last_visit, notes: p.notes
});

// GET all patients — filtered by tenant
router.get('/', async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { search, status } = req.query;
  
  let sql = 'SELECT * FROM patients WHERE tenant_id = $1';
  const params = [tenantId];
  
  if (search) {
    sql += ` AND (first_name ILIKE $${params.length+1} OR last_name ILIKE $${params.length+1} OR patient_id ILIKE $${params.length+1} OR phone ILIKE $${params.length+1})`;
    params.push(`%${search}%`);
  }
  if (status) { sql += ` AND status = $${params.length+1}`; params.push(status); }
  sql += ' ORDER BY registered_at DESC';
  
  try {
    const r = await db.queryBypassRLS(sql, params);
    res.json(r.rows.map(fmt));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET single patient
router.get('/:id', async (req, res) => {
  try {
    const r = await db.queryBypassRLS(
      'SELECT * FROM patients WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.user.tenant_id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Patient not found' });
    res.json(fmt(r.rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create patient
router.post('/', async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { firstName, lastName, dateOfBirth, gender, bloodGroup, phone, email, address, city,
    emergencyContact, emergencyPhone, insuranceProvider, insurancePolicyNumber, status, notes, allergies, chronicConditions } = req.body;
  
  if (!firstName || !lastName || !dateOfBirth || !gender || !phone)
    return res.status(400).json({ error: 'Required fields: firstName, lastName, dateOfBirth, gender, phone' });
  
  try {
    // Generate tenant-scoped patient ID
    const maxR = await db.queryBypassRLS(
      "SELECT patient_id FROM patients WHERE tenant_id = $1 AND patient_id LIKE 'PAT-%' ORDER BY patient_id DESC LIMIT 1",
      [tenantId]
    );
    const lastNum = maxR.rows[0]?.patient_id ? parseInt(maxR.rows[0].patient_id.split('-')[1]) : 0;
    const patientId = `PAT-${String((lastNum || 0) + 1).padStart(4, '0')}`;
    const id = uuidv4();
    
    await db.queryBypassRLS(
      `INSERT INTO patients (id, patient_id, first_name, last_name, date_of_birth, gender, blood_group,
        phone, email, address, city, emergency_contact, emergency_phone, insurance_provider,
        insurance_policy_number, allergies, chronic_conditions, status, registered_at, notes, tenant_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
      [id, patientId, firstName, lastName, dateOfBirth, gender, bloodGroup||null, phone,
       email||null, address||null, city||null, emergencyContact||null, emergencyPhone||null,
       insuranceProvider||null, insurancePolicyNumber||null,
       JSON.stringify(allergies||[]), JSON.stringify(chronicConditions||[]),
       status||'active', new Date().toISOString(), notes||null, tenantId]
    );
    
    logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Patients', `Patient registered: ${firstName} ${lastName}`, req.ip);
    sendPushNotification({ title: '🏥 New Patient Registered', message: `${firstName} ${lastName} added.`, url: `/patients/${id}` });
    
    const row = await db.queryBypassRLS('SELECT * FROM patients WHERE id = $1', [id]);
    res.status(201).json(fmt(row.rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update patient
router.put('/:id', async (req, res) => {
  const tenantId = req.user.tenant_id;
  try {
    const existing = await db.queryBypassRLS('SELECT * FROM patients WHERE id = $1 AND tenant_id = $2', [req.params.id, tenantId]);
    const row = existing.rows[0];
    if (!row) return res.status(404).json({ error: 'Patient not found' });
    
    const { firstName, lastName, dateOfBirth, gender, bloodGroup, phone, email, address, city,
      emergencyContact, emergencyPhone, insuranceProvider, insurancePolicyNumber, status, notes, lastVisit, allergies, chronicConditions } = req.body;
    
    await db.queryBypassRLS(
      `UPDATE patients SET first_name=$1,last_name=$2,date_of_birth=$3,gender=$4,blood_group=$5,
       phone=$6,email=$7,address=$8,city=$9,emergency_contact=$10,emergency_phone=$11,
       insurance_provider=$12,insurance_policy_number=$13,allergies=$14,chronic_conditions=$15,
       status=$16,notes=$17,last_visit=$18 WHERE id=$19 AND tenant_id=$20`,
      [firstName||row.first_name, lastName||row.last_name, dateOfBirth||row.date_of_birth,
       gender||row.gender, bloodGroup??row.blood_group, phone||row.phone, email??row.email,
       address??row.address, city??row.city, emergencyContact??row.emergency_contact,
       emergencyPhone??row.emergency_phone, insuranceProvider??row.insurance_provider,
       insurancePolicyNumber??row.insurance_policy_number,
       allergies ? JSON.stringify(allergies) : row.allergies,
       chronicConditions ? JSON.stringify(chronicConditions) : row.chronic_conditions,
       status||row.status, notes??row.notes, lastVisit??row.last_visit,
       req.params.id, tenantId]
    );
    
    logAction(req.user.id, req.user.name, req.user.role, 'UPDATE', 'Patients', `Patient updated: ${req.params.id}`, req.ip);
    const updated = await db.queryBypassRLS('SELECT * FROM patients WHERE id = $1', [req.params.id]);
    res.json(fmt(updated.rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE patient
router.delete('/:id', async (req, res) => {
  const tenantId = req.user.tenant_id;
  try {
    const existing = await db.queryBypassRLS('SELECT * FROM patients WHERE id = $1 AND tenant_id = $2', [req.params.id, tenantId]);
    const row = existing.rows[0];
    if (!row) return res.status(404).json({ error: 'Patient not found' });
    
    const pid = req.params.id;
    // Cascade delete within same tenant
    const delOps = [
      'DELETE FROM lab_audit_logs WHERE lab_test_id IN (SELECT id FROM lab_tests WHERE patient_id = $1)',
      'DELETE FROM pharmacy_returns WHERE transaction_id IN (SELECT id FROM pharmacy_transactions WHERE patient_id = $1)',
      'DELETE FROM pharmacy_transaction_items WHERE transaction_id IN (SELECT id FROM pharmacy_transactions WHERE patient_id = $1)',
      'DELETE FROM pharmacy_transactions WHERE patient_id = $1',
      'DELETE FROM appointments WHERE patient_id = $1',
      'DELETE FROM prescriptions WHERE patient_id = $1',
      'DELETE FROM lab_tests WHERE patient_id = $1',
      'DELETE FROM invoices WHERE patient_id = $1',
      'DELETE FROM opd_visits WHERE patient_id = $1',
      'DELETE FROM ipd_admissions WHERE patient_id = $1',
      "UPDATE beds SET status = 'available', patient_id = NULL WHERE patient_id = $1",
      'DELETE FROM nurse_notes WHERE patient_id = $1',
      'DELETE FROM doctor_rounds WHERE patient_id = $1',
      'DELETE FROM patient_insurance_policies WHERE patient_id = $1',
      'DELETE FROM insurance_claims WHERE patient_id = $1',
      'DELETE FROM patient_credits WHERE patient_id = $1',
    ];
    for (const sql of delOps) {
      await db.queryBypassRLS(sql, [pid]).catch(() => {});
    }
    await db.queryBypassRLS('DELETE FROM patients WHERE id = $1 AND tenant_id = $2', [pid, tenantId]);
    
    logAction(req.user.id, req.user.name, req.user.role, 'DELETE', 'Patients', `Patient deleted: ${row.first_name} ${row.last_name}`, req.ip);
    res.json({ message: 'Patient deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET patient summary
router.get('/:id/summary', async (req, res) => {
  const tenantId = req.user.tenant_id;
  try {
    const [patientR, visitsR, labR, invoicesR] = await Promise.all([
      db.queryBypassRLS('SELECT * FROM patients WHERE id = $1 AND tenant_id = $2', [req.params.id, tenantId]),
      db.queryBypassRLS('SELECT * FROM opd_visits WHERE patient_id = $1 AND tenant_id = $2 ORDER BY created_at DESC LIMIT 10', [req.params.id, tenantId]),
      db.queryBypassRLS('SELECT * FROM lab_tests WHERE patient_id = $1 AND tenant_id = $2 ORDER BY ordered_at DESC LIMIT 10', [req.params.id, tenantId]),
      db.queryBypassRLS('SELECT * FROM invoices WHERE patient_id = $1 AND tenant_id = $2 ORDER BY created_at DESC LIMIT 5', [req.params.id, tenantId]),
    ]);
    if (!patientR.rows[0]) return res.status(404).json({ error: 'Patient not found' });
    res.json({ patient: fmt(patientR.rows[0]), visits: visitsR.rows, labTests: labR.rows, invoices: invoicesR.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
