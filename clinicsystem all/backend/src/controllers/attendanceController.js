const { query } = require('../db/pool');

/** GET /api/attendance */
const getAttendance = async (req, res) => {
  try {
    const { date } = req.query;
    const cid = req.user.clinic_id;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const { rows } = await query(
      `SELECT a.*, cu.full_name AS employee_name, cu.role AS employee_role, cu.email AS employee_email
       FROM clinic_users cu
       LEFT JOIN attendance a ON a.user_id = cu.id AND a.work_date = $1
       WHERE cu.clinic_id = $2 AND cu.is_active = true
       ORDER BY cu.full_name ASC`,
      [targetDate, cid]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** GET /api/attendance/me */
const getMyAttendanceToday = async (req, res) => {
  try {
    const cid = req.user.clinic_id;
    const uid = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    const { rows } = await query(
      `SELECT * FROM attendance WHERE clinic_id = $1 AND user_id = $2 AND work_date = $3`,
      [cid, uid, today]
    );

    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** POST /api/attendance/clock-in */
const clockIn = async (req, res) => {
  try {
    const cid = req.user.clinic_id;
    const uid = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    const { notes } = req.body;

    // Check if already clocked in today
    const check = await query(
      `SELECT id FROM attendance WHERE clinic_id = $1 AND user_id = $2 AND work_date = $3`,
      [cid, uid, today]
    );

    if (check.rows.length) {
      return res.status(400).json({ message: 'You have already clocked in today.' });
    }

    // Determine status (Late if after 8:30am)
    let status = 'Present';
    const now = new Date();
    const cutoff = new Date();
    cutoff.setHours(8, 30, 0); // 8:30 AM
    if (now > cutoff) {
      status = 'Late';
    }

    const { rows } = await query(
      `INSERT INTO attendance (clinic_id, user_id, work_date, clock_in, status, notes)
       VALUES ($1, $2, $3, NOW(), $4, $5)
       RETURNING *`,
      [cid, uid, today, status, notes || null]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** POST /api/attendance/clock-out */
const clockOut = async (req, res) => {
  try {
    const cid = req.user.clinic_id;
    const uid = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    const check = await query(
      `SELECT id, clock_in, clock_out FROM attendance WHERE clinic_id = $1 AND user_id = $2 AND work_date = $3`,
      [cid, uid, today]
    );

    if (!check.rows.length) {
      return res.status(400).json({ message: 'You must clock in first.' });
    }

    if (check.rows[0].clock_out) {
      return res.status(400).json({ message: 'You have already clocked out today.' });
    }

    const { rows } = await query(
      `UPDATE attendance SET clock_out = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [check.rows[0].id]
    );

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** POST /api/attendance/manual (Manager logs manual entry) */
const logManualAttendance = async (req, res) => {
  try {
    const { userId, date, status, notes } = req.body;
    const cid = req.user.clinic_id;

    if (!['clinic_manager', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Unauthorized. Supervisor access only.' });
    }

    if (!userId || !date || !status) {
      return res.status(400).json({ message: 'UserId, date, and status are required.' });
    }

    const { rows } = await query(
      `INSERT INTO attendance (clinic_id, user_id, work_date, status, notes)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (clinic_id, user_id, work_date) DO UPDATE
       SET status = EXCLUDED.status, notes = COALESCE(EXCLUDED.notes, attendance.notes), updated_at = NOW()
       RETURNING *`,
      [cid, userId, date, status, notes || null]
    );

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getAttendance,
  getMyAttendanceToday,
  clockIn,
  clockOut,
  logManualAttendance
};
