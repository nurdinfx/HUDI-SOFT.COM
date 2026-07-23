const { query } = require('../db/pool');
const bcrypt = require('bcrypt');

/** GET /api/clinic */
const getClinic = async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, name, email, phone, address, city, country, logo_url, subscription_plan, subscription_status, subscription_expiry, days_remaining, currency, timezone, working_hours_start, working_hours_end, working_days, is_active, created_at FROM clinics WHERE id = $1',
      [req.user.clinic_id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Clinic not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** PUT /api/clinic */
const updateClinic = async (req, res) => {
  const { name, phone, address, city, country, currency, timezone, workingHoursStart, workingHoursEnd, workingDays } = req.body;
  try {
    const { rows } = await query(
      `UPDATE clinics SET
        name = COALESCE($1, name), phone = COALESCE($2, phone),
        address = COALESCE($3, address), city = COALESCE($4, city),
        country = COALESCE($5, country), currency = COALESCE($6, currency),
        timezone = COALESCE($7, timezone),
        working_hours_start = COALESCE($8, working_hours_start),
        working_hours_end = COALESCE($9, working_hours_end),
        working_days = COALESCE($10, working_days),
        updated_at = NOW()
       WHERE id = $11
       RETURNING id, name, email, phone, address, city, country, currency, timezone, working_hours_start, working_hours_end, working_days`,
      [name||null, phone||null, address||null, city||null, country||null,
       currency||null, timezone||null, workingHoursStart||null, workingHoursEnd||null,
       workingDays||null, req.user.clinic_id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Clinic not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** GET /api/clinic/subscription */
const getSubscription = async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT subscription_plan, subscription_status, subscription_start, subscription_expiry, days_remaining, license_key FROM clinics WHERE id=$1',
      [req.user.clinic_id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Clinic not found' });
    const c = rows[0];

    // Try to sync with HUDI-SOFT central API
    const hudiApiUrl = process.env.HUDI_SOFT_API_URL || 'https://hudi-soft-com.onrender.com/api';
    try {
      const resp = await fetch(`${hudiApiUrl}/licenses/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: c.license_key, machineID: 'DCS-WEB' }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.valid) {
          await query(
            `UPDATE clinics SET subscription_status='Active', days_remaining=$1, subscription_expiry=$2, updated_at=NOW() WHERE id=$3`,
            [data.daysRemaining, data.expiryDate, req.user.clinic_id]
          );
          c.subscription_status = 'Active';
          c.days_remaining = data.daysRemaining;
          c.subscription_expiry = data.expiryDate;
        }
      }
    } catch (_) { /* offline — return cached */ }

    res.json({
      subscriptionPlan: c.subscription_plan,
      subscriptionStatus: c.subscription_status,
      subscriptionExpiry: c.subscription_expiry,
      daysRemaining: c.days_remaining,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** GET /api/clinic/staff */
const getStaff = async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, full_name, email, role, phone, specialization, avatar_url, is_active, last_login, created_at FROM clinic_users WHERE clinic_id=$1 ORDER BY full_name',
      [req.user.clinic_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** POST /api/clinic/staff */
const createStaff = async (req, res) => {
  const { fullName, email, password, role, phone, specialization } = req.body;
  if (!fullName || !email || !password || !role)
    return res.status(400).json({ message: 'Name, email, password and role are required' });
  try {
    const exists = await query('SELECT id FROM clinic_users WHERE email=$1', [email.toLowerCase()]);
    if (exists.rows.length) return res.status(400).json({ message: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      `INSERT INTO clinic_users (id, clinic_id, full_name, email, password_hash, role, phone, specialization)
       VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7)
       RETURNING id, full_name, email, role, phone, specialization, is_active, created_at`,
      [req.user.clinic_id, fullName, email.toLowerCase(), hash, role, phone||null, specialization||null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** PUT /api/clinic/staff/:id */
const updateStaff = async (req, res) => {
  const { fullName, phone, specialization, role, isActive, password } = req.body;
  try {
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await query('UPDATE clinic_users SET password_hash=$1, updated_at=NOW() WHERE id=$2 AND clinic_id=$3', [hash, req.params.id, req.user.clinic_id]);
    }
    const { rows } = await query(
      `UPDATE clinic_users SET
        full_name = COALESCE($1, full_name),
        phone = COALESCE($2, phone),
        specialization = COALESCE($3, specialization),
        role = COALESCE($4, role),
        is_active = COALESCE($5, is_active),
        updated_at = NOW()
       WHERE id=$6 AND clinic_id=$7
       RETURNING id, full_name, email, role, phone, specialization, is_active`,
      [fullName||null, phone||null, specialization||null, role||null, isActive!=null?isActive:null, req.params.id, req.user.clinic_id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Staff member not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** DELETE /api/clinic/staff/:id */
const deleteStaff = async (req, res) => {
  try {
    if (req.params.id === req.user.id)
      return res.status(400).json({ message: 'Cannot delete your own account' });
    const { rows } = await query(
      'DELETE FROM clinic_users WHERE id=$1 AND clinic_id=$2 RETURNING id',
      [req.params.id, req.user.clinic_id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Staff member not found' });
    res.json({ message: 'Staff member removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getClinic, updateClinic, getSubscription, getStaff, createStaff, updateStaff, deleteStaff };
