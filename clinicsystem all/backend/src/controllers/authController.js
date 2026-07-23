const bcrypt = require('bcrypt');
const { query } = require('../db/pool');
const generateToken = require('../utils/generateToken');
const https = require('https');

// Helper: call HUDI-SOFT API server-side (no CORS)
function validateLicenseServerSide(licenseKey) {
  return new Promise((resolve, reject) => {
    const hudiSoftApi = process.env.HUDI_SOFT_API_URL || 'https://hudi-soft-com.onrender.com/api';
    const url = new URL(`${hudiSoftApi}/licenses/validate`);
    const body = JSON.stringify({ licenseKey, machineID: 'datel-clinic-server' });

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ valid: false, message: 'Invalid response from license server' }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/** POST /api/auth/activate */
const activate = async (req, res) => {
  const { licenseKey } = req.body;
  if (!licenseKey) {
    return res.status(400).json({ message: 'License Key is required' });
  }

  try {
    // Step 1: Validate the license server-side (no CORS)
    let licenseData;
    try {
      licenseData = await validateLicenseServerSide(licenseKey);
    } catch (err) {
      console.error('[Auth] License validation network error:', err.message);
      return res.status(503).json({ message: 'Unable to reach license server. Please try again.' });
    }

    if (!licenseData.valid) {
      return res.status(403).json({ message: licenseData.message || 'Invalid license key.' });
    }

    const companyName = licenseData.companyName || 'Datel Clinic';
    const expiryDate = licenseData.expiryDate || null;
    const daysRemaining = licenseData.daysRemaining || 30;

    // Step 2: Check if clinic already exists
    const { rows } = await query('SELECT * FROM clinics WHERE license_key = $1', [licenseKey]);
    
    if (rows.length > 0) {
      await query(
        `UPDATE clinics SET 
          subscription_status = 'Active', 
          subscription_expiry = $1, 
          days_remaining = $2,
          is_active = true
         WHERE license_key = $3`,
        [expiryDate, daysRemaining, licenseKey]
      );
      return res.json({ message: 'License activated successfully', clinicId: rows[0].id, valid: true });
    }

    // Step 3: Create new clinic
    const clinicEmail = `admin@${companyName.replace(/\s+/g, '').toLowerCase()}.com`;
    const { rows: newClinicRows } = await query(
      `INSERT INTO clinics (name, email, license_key, subscription_status, subscription_start, subscription_expiry, days_remaining)
       VALUES ($1, $2, $3, 'Active', NOW(), $4, $5) RETURNING id`,
      [companyName, clinicEmail, licenseKey, expiryDate, daysRemaining]
    );
    const newClinicId = newClinicRows[0].id;

    // Step 4: Create default super_admin
    const defaultPassword = 'detailcare123';
    const hash = await bcrypt.hash(defaultPassword, 10);
    const adminEmail = `admin@${licenseKey.toLowerCase().substring(0, 5)}.clinic.com`;
    
    await query(
      `INSERT INTO clinic_users (clinic_id, full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'super_admin')`,
      [newClinicId, `${companyName} Admin`, adminEmail, hash]
    );

    return res.status(201).json({ 
      message: 'Clinic activated successfully',
      valid: true,
      clinicId: newClinicId,
      defaultUser: { email: adminEmail, password: defaultPassword }
    });
  } catch (err) {
    console.error('[Auth] Activate error:', err);
    res.status(500).json({ message: 'Internal server error during activation' });
  }
};


/** POST /api/auth/login */
const login = async (req, res) => {
  const { email, password } = req.body;
  const licenseKey = req.headers['x-license-key'];

  if (!email || !password)
    return res.status(400).json({ message: 'Email and password are required' });
  
  if (!licenseKey)
    return res.status(400).json({ message: 'License key header is required' });

  try {
    const { rows } = await query(
      `SELECT cu.*, c.name AS clinic_name, c.subscription_status, c.subscription_plan,
              c.subscription_expiry, c.days_remaining, c.is_active AS clinic_active,
              c.logo_url
       FROM clinic_users cu
       JOIN clinics c ON c.id = cu.clinic_id
       WHERE cu.email = $1 AND c.license_key = $2`,
      [email.toLowerCase().trim(), licenseKey]
    );

    if (!rows.length)
      return res.status(401).json({ message: 'Invalid email or password' });

    const user = rows[0];

    if (!user.is_active)
      return res.status(403).json({ message: 'Account deactivated. Contact your clinic admin.' });

    if (!user.clinic_active)
      return res.status(403).json({ message: 'Clinic not found or inactive.' });

    if (user.subscription_status === 'Suspended')
      return res.status(403).json({ message: 'Clinic subscription suspended. Contact support.' });

    if (user.subscription_status === 'Expired')
      return res.status(403).json({ message: 'Clinic subscription expired. Please renew.' });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch)
      return res.status(401).json({ message: 'Invalid email or password' });

    // Update last login
    await query('UPDATE clinic_users SET last_login = NOW() WHERE id = $1', [user.id]);

    return res.json({
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      clinicId: user.clinic_id,
      clinicName: user.clinic_name,
      clinicLogo: user.logo_url,
      specialization: user.specialization,
      subscriptionStatus: user.subscription_status,
      subscriptionPlan: user.subscription_plan,
      subscriptionExpiry: user.subscription_expiry,
      daysRemaining: user.days_remaining,
      token: generateToken(user.id, user.role, user.clinic_id),
    });
  } catch (err) {
    console.error('[Auth] Login error:', err.message);
    console.error('[Auth] Login error stack:', err.stack);
    res.status(500).json({ message: err.message || 'Internal server error' });
  }
};

/** GET /api/auth/me */
const getMe = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT cu.id, cu.clinic_id, cu.full_name, cu.email, cu.role, cu.phone,
              cu.specialization, cu.avatar_url, cu.is_active, cu.last_login,
              c.name AS clinic_name, c.subscription_status, c.subscription_plan,
              c.days_remaining, c.logo_url
       FROM clinic_users cu
       JOIN clinics c ON c.id = cu.clinic_id
       WHERE cu.id = $1`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** PUT /api/auth/profile */
const updateProfile = async (req, res) => {
  const { fullName, phone, specialization, currentPassword, newPassword } = req.body;
  try {
    const { rows } = await query('SELECT * FROM clinic_users WHERE id = $1', [req.user.id]);
    if (!rows.length) return res.status(404).json({ message: 'User not found' });
    const user = rows[0];

    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });
      const hash = await bcrypt.hash(newPassword, 10);
      await query('UPDATE clinic_users SET password_hash = $1 WHERE id = $2', [hash, user.id]);
    }

    await query(
      `UPDATE clinic_users SET
        full_name = COALESCE($1, full_name),
        phone = COALESCE($2, phone),
        specialization = COALESCE($3, specialization),
        updated_at = NOW()
       WHERE id = $4`,
      [fullName || null, phone || null, specialization || null, user.id]
    );

    const { rows: updated } = await query(
      'SELECT id, clinic_id, full_name, email, role, phone, specialization, avatar_url FROM clinic_users WHERE id = $1',
      [user.id]
    );
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { login, getMe, updateProfile, activate };
