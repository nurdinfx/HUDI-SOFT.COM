const { query } = require('../db/pool');

/** GET /api/dental */
const getDentalRecords = async (req, res) => {
  const { patientId } = req.query;
  if (!patientId) return res.status(400).json({ message: 'Patient ID is required' });
  try {
    const { rows } = await query(
      `SELECT dr.*, cu.full_name AS doctor_name, p.full_name AS patient_name
       FROM dental_records dr
       JOIN clinic_users cu ON cu.id = dr.doctor_id
       JOIN patients p ON p.id = dr.patient_id
       WHERE dr.clinic_id = $1 AND dr.patient_id = $2
       ORDER BY dr.record_date DESC, dr.created_at DESC`,
      [req.user.clinic_id, patientId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** GET /api/dental/:id */
const getDentalRecordById = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT dr.*, cu.full_name AS doctor_name, p.full_name AS patient_name
       FROM dental_records dr
       JOIN clinic_users cu ON cu.id = dr.doctor_id
       JOIN patients p ON p.id = dr.patient_id
       WHERE dr.id = $1 AND dr.clinic_id = $2`,
      [req.params.id, req.user.clinic_id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Dental record not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** POST /api/dental */
const createDentalRecord = async (req, res) => {
  const { patientId, consultationId, toothChart, chiefComplaint, oralHygiene, radiographNotes, treatmentPerformed, nextVisitDate, nextVisitNotes, chartImageUrl } = req.body;
  if (!patientId) return res.status(400).json({ message: 'Patient ID is required' });

  try {
    // Generate unique record number
    const recordNumber = 'DEN-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const { rows } = await query(
      `INSERT INTO dental_records (
        id, clinic_id, patient_id, consultation_id, doctor_id, record_number,
        tooth_chart, chief_complaint, oral_hygiene, radiograph_notes,
        treatment_performed, next_visit_date, next_visit_notes, chart_image_url
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      ) RETURNING *`,
      [
        req.user.clinic_id, patientId, consultationId || null, req.user.id, recordNumber,
        JSON.stringify(toothChart || []), chiefComplaint || null, oralHygiene || 'Fair',
        radiographNotes || null, treatmentPerformed || null, nextVisitDate || null, nextVisitNotes || null,
        chartImageUrl || null
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** PUT /api/dental/:id */
const updateDentalRecord = async (req, res) => {
  const { toothChart, chiefComplaint, oralHygiene, radiographNotes, treatmentPerformed, nextVisitDate, nextVisitNotes, chartImageUrl, isSigned } = req.body;
  try {
    const check = await query('SELECT is_signed FROM dental_records WHERE id = $1 AND clinic_id = $2', [req.params.id, req.user.clinic_id]);
    if (!check.rows.length) return res.status(404).json({ message: 'Record not found' });
    if (check.rows[0].is_signed) return res.status(400).json({ message: 'Signed records cannot be modified' });

    const signedAt = isSigned ? new Date() : null;

    const { rows } = await query(
      `UPDATE dental_records SET
        tooth_chart = COALESCE($1, tooth_chart),
        chief_complaint = COALESCE($2, chief_complaint),
        oral_hygiene = COALESCE($3, oral_hygiene),
        radiograph_notes = COALESCE($4, radiograph_notes),
        treatment_performed = COALESCE($5, treatment_performed),
        next_visit_date = COALESCE($6, next_visit_date),
        next_visit_notes = COALESCE($7, next_visit_notes),
        chart_image_url = COALESCE($8, chart_image_url),
        is_signed = COALESCE($9, is_signed),
        signed_at = COALESCE($10, signed_at),
        updated_at = NOW()
       WHERE id = $11 AND clinic_id = $12
       RETURNING *`,
      [
        toothChart ? JSON.stringify(toothChart) : null, chiefComplaint || null, oralHygiene || null,
        radiographNotes || null, treatmentPerformed || null, nextVisitDate || null, nextVisitNotes || null,
        chartImageUrl || null, isSigned !== undefined ? isSigned : null, signedAt,
        req.params.id, req.user.clinic_id
      ]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getDentalRecords, getDentalRecordById, createDentalRecord, updateDentalRecord };
