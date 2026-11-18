const { query } = require('../db/pool');
const { nextAppointmentNumber } = require('../utils/autoNumber');

const APPT_SELECT = `
  SELECT a.*,
    p.full_name AS patient_name, p.patient_number, p.phone AS patient_phone, p.gender,
    cu.full_name AS doctor_name, cu.specialization
  FROM appointments a
  JOIN patients p ON p.id = a.patient_id
  JOIN clinic_users cu ON cu.id = a.doctor_id
`;

/** GET /api/appointments/today */
const getTodaySummary = async (req, res) => {
  try {
    const cid = req.user.clinic_id;
    const today = new Date().toISOString().split('T')[0];

    const { rows } = await query(
      `${APPT_SELECT} WHERE a.clinic_id = $1 AND a.appointment_date = $2 ORDER BY a.time_slot ASC`,
      [cid, today]
    );

    const summary = {
      total: rows.length,
      scheduled: rows.filter((r) => r.status === 'Scheduled').length,
      confirmed: rows.filter((r) => r.status === 'Confirmed').length,
      checkedIn: rows.filter((r) => r.status === 'Checked-In').length,
      inProgress: rows.filter((r) => r.status === 'In Progress').length,
      completed: rows.filter((r) => r.status === 'Completed').length,
      cancelled: rows.filter((r) => r.status === 'Cancelled').length,
      noShow: rows.filter((r) => r.status === 'No Show').length,
      appointments: rows,
    };
    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** GET /api/appointments */
const getAppointments = async (req, res) => {
  try {
    const { date, doctorId, status, patientId, page = 1, limit = 50 } = req.query;
    const cid = req.user.clinic_id;
    const conditions = ['a.clinic_id = $1'];
    const params = [cid];
    let i = 2;

    if (date) { conditions.push(`a.appointment_date = $${i++}`); params.push(date); }
    if (doctorId) { conditions.push(`a.doctor_id = $${i++}`); params.push(doctorId); }
    if (status) { conditions.push(`a.status = $${i++}`); params.push(status); }
    if (patientId) { conditions.push(`a.patient_id = $${i++}`); params.push(patientId); }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const countRes = await query(
      `SELECT COUNT(*) AS total FROM appointments a ${where}`, params
    );
    const total = parseInt(countRes.rows[0].total);
    const offset = (Number(page) - 1) * Number(limit);

    const { rows } = await query(
      `${APPT_SELECT} ${where} ORDER BY a.appointment_date ASC, a.time_slot ASC
       LIMIT $${i++} OFFSET $${i++}`,
      [...params, Number(limit), offset]
    );

    res.json({ appointments: rows, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** GET /api/appointments/:id */
const getAppointment = async (req, res) => {
  try {
    const { rows } = await query(
      `${APPT_SELECT} WHERE a.id = $1 AND a.clinic_id = $2`,
      [req.params.id, req.user.clinic_id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Appointment not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** POST /api/appointments */
const createAppointment = async (req, res) => {
  const { patientId, doctorId, appointmentDate, timeSlot, type, chiefComplaint, notes, duration } = req.body;
  if (!patientId || !doctorId || !appointmentDate || !timeSlot)
    return res.status(400).json({ message: 'Patient, doctor, date and time slot are required' });

  try {
    const cid = req.user.clinic_id;

    // Check conflict
    const conflict = await query(
      `SELECT id FROM appointments WHERE clinic_id=$1 AND doctor_id=$2 AND appointment_date=$3 AND time_slot=$4
       AND status NOT IN ('Cancelled','No Show')`,
      [cid, doctorId, appointmentDate, timeSlot]
    );
    if (conflict.rows.length)
      return res.status(409).json({ message: `Doctor already has an appointment at ${timeSlot} on ${appointmentDate}` });

    const appointmentNumber = await nextAppointmentNumber(cid);
    const { rows } = await query(
      `INSERT INTO appointments
        (id, clinic_id, patient_id, doctor_id, appointment_number, appointment_date, time_slot,
         duration_minutes, type, chief_complaint, notes, created_by)
       VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [cid, patientId, doctorId, appointmentNumber, appointmentDate, timeSlot,
       duration || 30, type || 'Consultation', chiefComplaint || null, notes || null, req.user.id]
    );

    const { rows: populated } = await query(
      `${APPT_SELECT} WHERE a.id = $1`, [rows[0].id]
    );
    res.status(201).json(populated[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** PUT /api/appointments/:id */
const updateAppointment = async (req, res) => {
  const { status, appointmentDate, timeSlot, type, chiefComplaint, notes, cancelReason, duration } = req.body;
  try {
    const { rows } = await query(
      `UPDATE appointments SET
        status = COALESCE($1, status),
        appointment_date = COALESCE($2, appointment_date),
        time_slot = COALESCE($3, time_slot),
        type = COALESCE($4, type),
        chief_complaint = COALESCE($5, chief_complaint),
        notes = COALESCE($6, notes),
        cancel_reason = COALESCE($7, cancel_reason),
        duration_minutes = COALESCE($8, duration_minutes),
        updated_at = NOW()
       WHERE id = $9 AND clinic_id = $10
       RETURNING *`,
      [status||null, appointmentDate||null, timeSlot||null, type||null,
       chiefComplaint||null, notes||null, cancelReason||null, duration||null,
       req.params.id, req.user.clinic_id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Appointment not found' });

    const { rows: populated } = await query(`${APPT_SELECT} WHERE a.id = $1`, [rows[0].id]);
    res.json(populated[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getTodaySummary, getAppointments, getAppointment, createAppointment, updateAppointment };
