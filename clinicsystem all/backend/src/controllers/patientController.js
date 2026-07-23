const { query } = require('../db/pool');
const { nextPatientNumber } = require('../utils/autoNumber');

/** GET /api/patients */
const getPatients = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const cid = req.user.clinic_id;

    let baseQuery, params;
    if (search) {
      baseQuery = `WHERE p.clinic_id = $1 AND p.is_active = true
        AND (p.full_name ILIKE $2 OR p.patient_number ILIKE $2 OR p.phone ILIKE $2 OR p.national_id ILIKE $2)`;
      params = [cid, `%${search}%`];
    } else {
      baseQuery = `WHERE p.clinic_id = $1 AND p.is_active = true`;
      params = [cid];
    }

    const countRes = await query(`SELECT COUNT(*) AS total FROM patients p ${baseQuery}`, params);
    const total = parseInt(countRes.rows[0].total);

    const dataRes = await query(
      `SELECT p.*, cu.full_name AS registered_by_name
       FROM patients p
       LEFT JOIN clinic_users cu ON cu.id = p.registered_by
       ${baseQuery}
       ORDER BY p.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, Number(limit), offset]
    );

    res.json({ patients: dataRes.rows, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** GET /api/patients/:id */
const getPatient = async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM patients WHERE id = $1 AND clinic_id = $2',
      [req.params.id, req.user.clinic_id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Patient not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** POST /api/patients */
const createPatient = async (req, res) => {
  const {
    fullName, dateOfBirth, gender, phone, email, address, city,
    nationalId, bloodType, emergencyName, emergencyPhone, emergencyRelation,
    allergies, chronicConditions, insuranceProvider, insurancePolicyNo, notes,
  } = req.body;

  if (!fullName || !gender) return res.status(400).json({ message: 'Full name and gender are required' });

  try {
    const cid = req.user.clinic_id;
    const patientNumber = await nextPatientNumber(cid);

    const { rows } = await query(
      `INSERT INTO patients
        (id, clinic_id, patient_number, full_name, date_of_birth, gender, phone, email,
         address, city, national_id, blood_type, emergency_name, emergency_phone, emergency_relation,
         allergies, chronic_conditions, insurance_provider, insurance_policy_no, notes, registered_by)
       VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING *`,
      [cid, patientNumber, fullName, dateOfBirth || null, gender, phone || null, email || null,
       address || null, city || null, nationalId || null, bloodType || 'Unknown',
       emergencyName || null, emergencyPhone || null, emergencyRelation || null,
       allergies || [], chronicConditions || [],
       insuranceProvider || null, insurancePolicyNo || null, notes || null, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** PUT /api/patients/:id */
const updatePatient = async (req, res) => {
  const {
    fullName, dateOfBirth, gender, phone, email, address, city,
    nationalId, bloodType, emergencyName, emergencyPhone, emergencyRelation,
    allergies, chronicConditions, insuranceProvider, insurancePolicyNo, notes,
  } = req.body;

  try {
    const { rows } = await query(
      `UPDATE patients SET
        full_name = COALESCE($1, full_name),
        date_of_birth = COALESCE($2, date_of_birth),
        gender = COALESCE($3, gender),
        phone = COALESCE($4, phone),
        email = COALESCE($5, email),
        address = COALESCE($6, address),
        city = COALESCE($7, city),
        national_id = COALESCE($8, national_id),
        blood_type = COALESCE($9, blood_type),
        emergency_name = COALESCE($10, emergency_name),
        emergency_phone = COALESCE($11, emergency_phone),
        emergency_relation = COALESCE($12, emergency_relation),
        allergies = COALESCE($13, allergies),
        chronic_conditions = COALESCE($14, chronic_conditions),
        insurance_provider = COALESCE($15, insurance_provider),
        insurance_policy_no = COALESCE($16, insurance_policy_no),
        notes = COALESCE($17, notes),
        updated_at = NOW()
       WHERE id = $18 AND clinic_id = $19
       RETURNING *`,
      [fullName||null, dateOfBirth||null, gender||null, phone||null, email||null,
       address||null, city||null, nationalId||null, bloodType||null,
       emergencyName||null, emergencyPhone||null, emergencyRelation||null,
       allergies||null, chronicConditions||null,
       insuranceProvider||null, insurancePolicyNo||null, notes||null,
       req.params.id, req.user.clinic_id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Patient not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** DELETE /api/patients/:id — soft delete */
const deletePatient = async (req, res) => {
  try {
    const { rows } = await query(
      'UPDATE patients SET is_active = false, updated_at = NOW() WHERE id = $1 AND clinic_id = $2 RETURNING id',
      [req.params.id, req.user.clinic_id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Patient not found' });
    res.json({ message: 'Patient archived successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getPatients, getPatient, createPatient, updatePatient, deletePatient };
