// backend/src/controllers/branchController.js
const { query } = require('../db/pool');

/** GET /api/branches */
const getBranches = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT b.*,
        (SELECT COUNT(*) FROM clinic_users WHERE clinic_id = b.clinic_id) AS total_staff,
        (SELECT COUNT(*) FROM appointments WHERE clinic_id = b.clinic_id) AS total_appointments
       FROM branches b
       WHERE b.clinic_id = $1
       ORDER BY b.is_main DESC, b.created_at ASC`,
      [req.user.clinic_id]
    );

    // If no branches exist, auto-create the Primary / Main branch
    if (rows.length === 0) {
      const { rows: clinicRows } = await query('SELECT name, city, phone, address FROM clinics WHERE id = $1', [req.user.clinic_id]);
      const clinic = clinicRows[0];
      const { rows: newBranch } = await query(
        `INSERT INTO branches (clinic_id, name, code, phone, address, city, is_main, is_active)
         VALUES ($1, $2, 'MAIN', $3, $4, $5, true, true)
         RETURNING *`,
        [req.user.clinic_id, clinic?.name ? `${clinic.name} - Main Branch` : 'Main Dental Clinic', clinic?.phone || null, clinic?.address || null, clinic?.city || 'Mogadishu']
      );
      return res.json(newBranch);
    }

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** POST /api/branches */
const createBranch = async (req, res) => {
  const { name, code, phone, email, address, city, isMain } = req.body;
  if (!name) return res.status(400).json({ message: 'Branch name is required' });

  try {
    // If setting as main, remove is_main from previous main branch
    if (isMain) {
      await query('UPDATE branches SET is_main = false WHERE clinic_id = $1', [req.user.clinic_id]);
    }

    const { rows } = await query(
      `INSERT INTO branches (clinic_id, name, code, phone, email, address, city, is_main, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
       RETURNING *`,
      [
        req.user.clinic_id, name, code || 'BR-' + Math.floor(100 + Math.random() * 900),
        phone || null, email || null, address || null, city || null, !!isMain
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** PUT /api/branches/:id */
const updateBranch = async (req, res) => {
  const { name, code, phone, email, address, city, isMain, isActive } = req.body;
  try {
    if (isMain) {
      await query('UPDATE branches SET is_main = false WHERE clinic_id = $1', [req.user.clinic_id]);
    }

    const { rows } = await query(
      `UPDATE branches SET
        name = COALESCE($1, name),
        code = COALESCE($2, code),
        phone = COALESCE($3, phone),
        email = COALESCE($4, email),
        address = COALESCE($5, address),
        city = COALESCE($6, city),
        is_main = COALESCE($7, is_main),
        is_active = COALESCE($8, is_active),
        updated_at = NOW()
       WHERE id = $9 AND clinic_id = $10
       RETURNING *`,
      [
        name || null, code || null, phone || null, email || null,
        address || null, city || null, isMain !== undefined ? isMain : null,
        isActive !== undefined ? isActive : null,
        req.params.id, req.user.clinic_id
      ]
    );
    if (!rows.length) return res.status(404).json({ message: 'Branch not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getBranches, createBranch, updateBranch };

