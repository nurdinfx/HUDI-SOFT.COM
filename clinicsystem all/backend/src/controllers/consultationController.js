const { query, getClient } = require('../db/pool');
const { nextRecordNumber } = require('../utils/autoNumber');

const RECORD_SELECT = `
  SELECT cn.*,
    p.full_name AS patient_name, p.patient_number, p.date_of_birth, p.gender, p.blood_type,
    p.allergies, p.chronic_conditions,
    cu.full_name AS doctor_name, cu.specialization
  FROM consultation_notes cn
  JOIN patients p ON p.id = cn.patient_id
  JOIN clinic_users cu ON cu.id = cn.doctor_id
`;

/** GET /api/consultations */
const getConsultations = async (req, res) => {
  try {
    const { patientId, page = 1, limit = 20 } = req.query;
    const cid = req.user.clinic_id;
    const conditions = ['cn.clinic_id = $1'];
    const params = [cid];
    if (patientId) { conditions.push(`cn.patient_id = $2`); params.push(patientId); }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const countRes = await query(`SELECT COUNT(*) AS total FROM consultation_notes cn ${where}`, params);
    const total = parseInt(countRes.rows[0].total);
    const offset = (Number(page) - 1) * Number(limit);

    const { rows } = await query(
      `${RECORD_SELECT} ${where} ORDER BY cn.visit_date DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
      [...params, Number(limit), offset]
    );

    res.json({ records: rows, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** GET /api/consultations/:id */
const getConsultation = async (req, res) => {
  try {
    const { rows } = await query(
      `${RECORD_SELECT} WHERE cn.id = $1 AND cn.clinic_id = $2`,
      [req.params.id, req.user.clinic_id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Record not found' });

    // Get prescriptions
    const { rows: presc } = await query(
      'SELECT * FROM prescriptions WHERE consultation_id = $1 ORDER BY created_at ASC',
      [req.params.id]
    );
    res.json({ ...rows[0], prescriptions: presc });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** POST /api/consultations */
const createConsultation = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const cid = req.user.clinic_id;
    const recordNumber = await nextRecordNumber(cid);

    const {
      patientId, appointmentId, visitDate,
      chiefComplaint, historyOfIllness, physicalExamination,
      bpSystolic, bpDiastolic, heartRate, temperature, respiratoryRate,
      oxygenSaturation, weightKg, heightCm, bmi, bloodSugar,
      diagnosis, diagnosisNotes, treatmentPlan,
      followUpDate, followUpNotes, referredTo, referralReason, notes,
      prescriptions = [],
    } = req.body;

    if (!patientId) { await client.query('ROLLBACK'); return res.status(400).json({ message: 'Patient is required' }); }

    const { rows } = await client.query(
      `INSERT INTO consultation_notes (
        id, clinic_id, patient_id, appointment_id, doctor_id, record_number, visit_date,
        chief_complaint, history_of_illness, physical_examination,
        bp_systolic, bp_diastolic, heart_rate, temperature, respiratory_rate,
        oxygen_saturation, weight_kg, height_cm, bmi, blood_sugar,
        diagnosis, diagnosis_notes, treatment_plan,
        follow_up_date, follow_up_notes, referred_to, referral_reason, notes
       ) VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
       RETURNING *`,
      [cid, patientId, appointmentId||null, req.user.id, recordNumber, visitDate||new Date().toISOString().split('T')[0],
       chiefComplaint||null, historyOfIllness||null, physicalExamination||null,
       bpSystolic||null, bpDiastolic||null, heartRate||null, temperature||null, respiratoryRate||null,
       oxygenSaturation||null, weightKg||null, heightCm||null, bmi||null, bloodSugar||null,
       diagnosis||[], diagnosisNotes||null, treatmentPlan||null,
       followUpDate||null, followUpNotes||null, referredTo||null, referralReason||null, notes||null]
    );

    const consultId = rows[0].id;

    // Insert prescriptions
    for (const p of prescriptions) {
      await client.query(
        `INSERT INTO prescriptions (id, clinic_id, consultation_id, patient_id, doctor_id,
           medication_name, dosage, frequency, duration, instructions)
         VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [cid, consultId, patientId, req.user.id,
         p.medicationName, p.dosage||null, p.frequency||null, p.duration||null, p.instructions||null]
      );
    }

    // Mark appointment as Completed if linked
    if (appointmentId) {
      await client.query(
        "UPDATE appointments SET status = 'Completed', updated_at = NOW() WHERE id = $1",
        [appointmentId]
      );
    }

    await client.query('COMMIT');

    const { rows: populated } = await query(`${RECORD_SELECT} WHERE cn.id = $1`, [consultId]);
    const { rows: presc } = await query('SELECT * FROM prescriptions WHERE consultation_id = $1', [consultId]);
    res.status(201).json({ ...populated[0], prescriptions: presc });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
};

/** PUT /api/consultations/:id */
const updateConsultation = async (req, res) => {
  try {
    const existing = await query(
      'SELECT id, is_signed FROM consultation_notes WHERE id = $1 AND clinic_id = $2',
      [req.params.id, req.user.clinic_id]
    );
    if (!existing.rows.length) return res.status(404).json({ message: 'Record not found' });
    if (existing.rows[0].is_signed && req.user.role !== 'clinic_manager' && req.user.role !== 'super_admin')
      return res.status(403).json({ message: 'Cannot edit a signed record' });

    const {
      chiefComplaint, diagnosisNotes, treatmentPlan, diagnosis, notes,
      followUpDate, followUpNotes, referredTo, referralReason,
      physicalExamination, historyOfIllness,
    } = req.body;

    const { rows } = await query(
      `UPDATE consultation_notes SET
        chief_complaint = COALESCE($1, chief_complaint),
        diagnosis_notes = COALESCE($2, diagnosis_notes),
        treatment_plan = COALESCE($3, treatment_plan),
        diagnosis = COALESCE($4, diagnosis),
        notes = COALESCE($5, notes),
        follow_up_date = COALESCE($6, follow_up_date),
        follow_up_notes = COALESCE($7, follow_up_notes),
        referred_to = COALESCE($8, referred_to),
        referral_reason = COALESCE($9, referral_reason),
        physical_examination = COALESCE($10, physical_examination),
        history_of_illness = COALESCE($11, history_of_illness),
        updated_at = NOW()
       WHERE id = $12 AND clinic_id = $13
       RETURNING *`,
      [chiefComplaint||null, diagnosisNotes||null, treatmentPlan||null, diagnosis||null,
       notes||null, followUpDate||null, followUpNotes||null, referredTo||null, referralReason||null,
       physicalExamination||null, historyOfIllness||null,
       req.params.id, req.user.clinic_id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** POST /api/consultations/:id/sign */
const signConsultation = async (req, res) => {
  try {
    const { rows } = await query(
      `UPDATE consultation_notes SET is_signed = true, signed_at = NOW()
       WHERE id = $1 AND clinic_id = $2 AND doctor_id = $3
       RETURNING *`,
      [req.params.id, req.user.clinic_id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Record not found or not yours to sign' });
    res.json({ message: 'Record signed', record: rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getConsultations, getConsultation, createConsultation, updateConsultation, signConsultation };
