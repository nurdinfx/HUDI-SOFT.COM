const { query } = require('../db/pool');
const { nextLabNumber } = require('../utils/autoNumber');

/** GET /api/lab/requests */
const getLabRequests = async (req, res) => {
  try {
    const { status, patientId, page = 1, limit = 20 } = req.query;
    const cid = req.user.clinic_id;
    const conditions = ['lr.clinic_id = $1'];
    const params = [cid];
    let idx = 2;
    if (status) { conditions.push(`lr.status = $${idx++}`); params.push(status); }
    if (patientId) { conditions.push(`lr.patient_id = $${idx++}`); params.push(patientId); }
    const where = `WHERE ${conditions.join(' AND ')}`;

    const countRes = await query(`SELECT COUNT(*) AS total FROM lab_requests lr ${where}`, params);
    const total = parseInt(countRes.rows[0].total);
    const offset = (Number(page) - 1) * Number(limit);

    const { rows } = await query(
      `SELECT lr.*, p.full_name AS patient_name, p.patient_number,
              cu.full_name AS doctor_name
       FROM lab_requests lr
       JOIN patients p ON p.id = lr.patient_id
       JOIN clinic_users cu ON cu.id = lr.doctor_id
       ${where} ORDER BY lr.requested_date DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, Number(limit), offset]
    );
    res.json({ requests: rows, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** POST /api/lab/requests */
const createLabRequest = async (req, res) => {
  const { patientId, testName, testCategory, priority, consultationId, notes } = req.body;
  if (!patientId || !testName)
    return res.status(400).json({ message: 'Patient and test name are required' });
  try {
    const cid = req.user.clinic_id;
    const requestNumber = await nextLabNumber(cid);
    const { rows } = await query(
      `INSERT INTO lab_requests (id, clinic_id, patient_id, doctor_id, consultation_id,
         request_number, test_name, test_category, priority, notes)
       VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [cid, patientId, req.user.id, consultationId||null, requestNumber,
       testName, testCategory||null, priority||'Routine', notes||null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** PUT /api/lab/requests/:id/status */
const updateLabStatus = async (req, res) => {
  const { status, sampleCollected } = req.body;
  try {
    const { rows } = await query(
      `UPDATE lab_requests SET status=COALESCE($1,status),
        sample_collected=COALESCE($2,sample_collected)
       WHERE id=$3 AND clinic_id=$4 RETURNING *`,
      [status||null, sampleCollected||null, req.params.id, req.user.clinic_id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Lab request not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** POST /api/lab/requests/:id/results */
const addLabResults = async (req, res) => {
  const { results = [] } = req.body;
  try {
    const cid = req.user.clinic_id;
    const inserted = [];
    for (const r of results) {
      const { rows } = await query(
        `INSERT INTO lab_results (id, request_id, clinic_id, parameter_name, result_value,
           unit, reference_range, interpretation, notes, entered_by)
         VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [req.params.id, cid, r.parameterName, r.resultValue||null,
         r.unit||null, r.referenceRange||null, r.interpretation||'Normal', r.notes||null, req.user.id]
      );
      inserted.push(rows[0]);
    }
    // Mark request as completed
    await query(`UPDATE lab_requests SET status='Completed' WHERE id=$1`, [req.params.id]);
    res.status(201).json({ message: 'Results added', results: inserted });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** GET /api/lab/requests/:id/results */
const getLabResults = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT lr.*, cu.full_name AS entered_by_name
       FROM lab_results lr LEFT JOIN clinic_users cu ON cu.id = lr.entered_by
       WHERE lr.request_id = $1`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getLabRequests, createLabRequest, updateLabStatus, addLabResults, getLabResults };
