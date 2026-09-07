/**
 * routes/license.js
 * License key management for HUDI-SOFT HMS SaaS multi-tenant system.
 *
 * MULTI-TENANCY MODEL:
 *   - Each unique license key = one hospital = one unique tenant_id
 *   - license_info has ONE ROW PER HOSPITAL (scoped by license_key)
 *   - Activation creates admin user for that hospital scoped to that tenant_id
 *
 * POST /api/license/activate  — Activate with a license key + hospital admin credentials
 * POST /api/license/demo      — Start 7-day demo (creates demo row + admin user)
 * GET  /api/license/status    — Get current license status (key required in header or body)
 */
const express = require('express');
const router = express.Router();
const db = require('../database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const DEMO_DAYS = 7;

function getDemoTimeLeft(demoStartedAt) {
  if (!demoStartedAt) return 0;
  const started = new Date(demoStartedAt);
  const expiresAt = new Date(started.getTime() + DEMO_DAYS * 24 * 60 * 60 * 1000);
  const now = new Date();
  const msLeft = expiresAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
}

// Helper: get license row for a specific key
async function getLicenseByKey(licenseKey) {
  const result = await db.query('SELECT * FROM license_info WHERE license_key = $1 LIMIT 1', [licenseKey]);
  return result.rows[0] || null;
}

// ─── GET /api/license/status ─────────────────────────────────────
// Requires X-License-Key header or query param ?key= (or Bearer token)
router.get('/status', async (req, res) => {
  try {
    const licenseKey = req.headers['x-license-key'] || req.query.key;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    let info = null;

    // 1. If license key provided, lookup by key
    if (licenseKey && licenseKey.trim() !== '') {
      const result = await db.query('SELECT * FROM license_info WHERE license_key = $1 LIMIT 1', [licenseKey.trim().toUpperCase()]);
      info = result.rows[0] || null;
    }

    // 2. If no key, but JWT provided, lookup by decoded tenant_id
    if (!info && token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded && decoded.tenantId) {
          const result = await db.query('SELECT * FROM license_info WHERE tenant_id = $1 LIMIT 1', [decoded.tenantId]);
          info = result.rows[0] || null;
        }
      } catch (tokenErr) {
        // Token invalid or expired - ignore and continue
      }
    }

    // 3. If no matching license found, return clean default demo status WITHOUT leaking other hospitals' data
    if (!info) {
      return res.json({
        status: 'demo',
        plan: 'demo',
        demoActive: true,
        daysLeft: DEMO_DAYS,
        hospitalName: 'My Hospital',
        tenantId: null,
        message: 'Enter your license key to activate or start demo.',
      });
    }

    const demoLeft = getDemoTimeLeft(info.demo_started_at);

    if (info.status === 'active') {
      if (info.expires_at && new Date(info.expires_at) < new Date()) {
        await db.query(`UPDATE license_info SET status = 'expired' WHERE id = $1`, [info.id]);
        return res.json({ status: 'expired', plan: info.plan, tenantId: info.tenant_id, hospitalName: info.hospital_name, demoActive: false, daysLeft: 0, message: 'License expired. Please renew.' });
      }
      return res.json({
        status: 'active', plan: info.plan, tenantId: info.tenant_id,
        hospitalName: info.hospital_name, customerName: info.customer_name,
        customerEmail: info.customer_email, licenseKey: info.license_key,
        activatedAt: info.activated_at, expiresAt: info.expires_at,
        demoActive: false, daysLeft: null, message: 'License is active.',
      });
    }

    if (info.status === 'demo') {
      if (demoLeft <= 0) {
        return res.json({ status: 'expired', plan: 'demo', tenantId: info.tenant_id, hospitalName: info.hospital_name, demoActive: false, daysLeft: 0, message: 'Demo period has expired. Please activate with a license key.' });
      }
      return res.json({ status: 'demo', plan: 'demo', tenantId: info.tenant_id, hospitalName: info.hospital_name, demoActive: true, daysLeft: demoLeft, message: `Demo mode — ${demoLeft} day(s) remaining.` });
    }

    return res.json({ status: info.status, plan: info.plan, tenantId: info.tenant_id, hospitalName: info.hospital_name, demoActive: false, daysLeft: 0, message: 'License is not active.' });
  } catch (err) {
    console.error('[License] status error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/license/activate ──────────────────────────────────
// Creates a new license row per hospital. Each hospital gets its own tenant_id.
router.post('/activate', async (req, res) => {
  const { licenseKey, hospitalName, customerName, customerEmail, adminEmail, adminPassword } = req.body;

  if (!licenseKey) {
    return res.status(400).json({ error: 'License key is required' });
  }

  try {
    const cleanKey = licenseKey.trim().toUpperCase();

    // ── Verify with HUDI-SOFT main website ──
    let verificationResult = null;
    const mainSiteEndpoints = [
      'https://hudi-soft.com/api/licenses/validate',
      'https://hudi-soft.com/api/license/validate',
      'https://hudi-soft.com/api/verify-license'
    ];

    for (const endpoint of mainSiteEndpoints) {
      try {
        const verifyRes = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ licenseKey: cleanKey, key: cleanKey, machineID: hospitalName || 'HMS-WEB', machineId: hospitalName || 'HMS-WEB' }),
          signal: AbortSignal.timeout(5000),
        });
        if (verifyRes.ok) {
          const data = await verifyRes.json();
          if (data && (data.valid === true || data.status === 'Active' || data.success === true)) {
            verificationResult = {
              valid: true,
              plan: data.productType || data.plan || 'professional',
              expiresAt: data.expiryDate || data.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
              customerName: data.companyName || customerName || 'Customer',
              customerEmail: customerEmail || '',
            };
            break;
          }
        }
      } catch (fetchErr) {
        console.warn(`[License] Could not reach ${endpoint}:`, fetchErr.message);
      }
    }

    // Fallback: Accept valid key format
    if (!verificationResult) {
      const isUuid = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i.test(cleanKey);
      const isHudiFormat = /^HUDI-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(cleanKey);
      const isGenericValidKey = cleanKey.length >= 8 && /^[A-Z0-9-]+$/i.test(cleanKey);

      if (isUuid || isHudiFormat || isGenericValidKey) {
        console.log(`[License] Accepted key via format validation: ${cleanKey}`);
        verificationResult = {
          valid: true,
          plan: 'professional',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          customerName: customerName || 'Customer',
          customerEmail: customerEmail || '',
        };
      }
    }

    if (!verificationResult || !verificationResult.valid) {
      return res.status(400).json({ error: 'Invalid license key. Please purchase a valid license from hudi-soft.com' });
    }

    const now = new Date().toISOString();
    const expiresAt = verificationResult.expiresAt;

    // ── Check if this license key already has a tenant ──
    const existingByKey = await db.query('SELECT * FROM license_info WHERE license_key = $1', [cleanKey]);

    let tenantId;
    if (existingByKey.rows.length > 0) {
      // Already activated — update it but KEEP the same tenant_id
      tenantId = existingByKey.rows[0].tenant_id;
      await db.query(`
        UPDATE license_info SET
          customer_name = $1, customer_email = $2, hospital_name = $3,
          plan = $4, status = 'active', activated_at = $5, expires_at = $6, last_verified_at = $5
        WHERE license_key = $7
      `, [
        verificationResult.customerName || customerName || 'Customer',
        verificationResult.customerEmail || customerEmail || '',
        hospitalName || existingByKey.rows[0].hospital_name || 'My Hospital',
        verificationResult.plan || 'professional',
        now, expiresAt, cleanKey
      ]);
      console.log(`✅ [License] Re-activated existing tenant ${tenantId} for key: ${cleanKey}`);
    } else {
      // NEW hospital — create a NEW row with a NEW tenant_id (uuid auto-generated)
      const insertResult = await db.query(`
        INSERT INTO license_info (license_key, customer_name, customer_email, hospital_name, plan, status, activated_at, expires_at, last_verified_at)
        VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $6)
        RETURNING tenant_id
      `, [
        cleanKey,
        verificationResult.customerName || customerName || 'Customer',
        verificationResult.customerEmail || customerEmail || '',
        hospitalName || 'My Hospital',
        verificationResult.plan || 'professional',
        now, expiresAt
      ]);
      tenantId = insertResult.rows[0].tenant_id;
      console.log(`✅ [License] New tenant created: ${tenantId} for key: ${cleanKey}`);
    }

    // ── Create/update admin user for this hospital tenant ──
    const finalAdminEmail = adminEmail || customerEmail || 'admin@hospital.com';
    const finalAdminPassword = adminPassword || 'admin123';
    const passwordHash = bcrypt.hashSync(finalAdminPassword, 10);

    const existingAdmin = await db.query('SELECT id FROM users WHERE email = $1 AND tenant_id = $2', [finalAdminEmail, tenantId]);
    if (existingAdmin.rows.length === 0) {
      await db.query(
        `INSERT INTO users (id, name, email, password_hash, role, is_active, created_at, tenant_id)
         VALUES ($1, 'Admin', $2, $3, 'admin', 1, $4, $5)`,
        [uuidv4(), finalAdminEmail, passwordHash, now, tenantId]
      );
      console.log(`✅ [License] Admin user created: ${finalAdminEmail} for tenant: ${tenantId}`);
    } else if (adminPassword) {
      await db.query(`UPDATE users SET password_hash = $1 WHERE email = $2 AND tenant_id = $3`, [passwordHash, finalAdminEmail, tenantId]);
    }

    // Ensure hospital_settings row exists for this tenant
    try {
      const existingSettings = await db.query('SELECT id FROM hospital_settings WHERE tenant_id = $1', [tenantId]);
      if (existingSettings.rows.length === 0) {
        await db.query(`
          INSERT INTO hospital_settings (name, tagline, address, phone, email, website, currency, tax_rate, tenant_id)
          VALUES ($1, 'Excellence in Healthcare', '', '', $2, '', 'USD', 10, $3)
        `, [hospitalName || 'My Hospital', finalAdminEmail, tenantId]);
      } else if (hospitalName) {
        await db.query('UPDATE hospital_settings SET name = $1 WHERE tenant_id = $2', [hospitalName, tenantId]);
      }
    } catch (settErr) {
      console.warn('[License] Could not init hospital_settings:', settErr.message);
    }

    const updatedInfo = await db.query('SELECT * FROM license_info WHERE license_key = $1', [cleanKey]);
    const info = updatedInfo.rows[0];

    res.json({
      success: true,
      status: 'active',
      licenseKey: cleanKey,
      tenantId: info.tenant_id,
      hospitalName: info.hospital_name,
      plan: info.plan,
      expiresAt: info.expires_at,
      adminEmail: finalAdminEmail,
      adminPassword: adminPassword ? '(your password)' : 'admin123',
      message: `License activated! Hospital: ${info.hospital_name}. Login with ${finalAdminEmail}`,
    });
  } catch (err) {
    console.error('[License] activate error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/license/demo ───────────────────────────────────────
// Multi-tenant demo: Each demo client receives their OWN isolated tenant_id & demo license key!
router.post('/demo', async (req, res) => {
  const { hospitalName, adminEmail, adminPassword } = req.body;
  try {
    const now = new Date().toISOString();
    const demoKey = `DEMO-${uuidv4().substring(0, 8).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const finalHospitalName = hospitalName?.trim() || 'Demo Hospital';

    // Insert brand-new isolated tenant row for this demo
    const insertResult = await db.query(`
      INSERT INTO license_info (license_key, hospital_name, status, plan, demo_started_at)
      VALUES ($1, $2, 'demo', 'demo', $3) RETURNING tenant_id
    `, [demoKey, finalHospitalName, now]);

    const tenantId = insertResult.rows[0].tenant_id;
    console.log(`✅ [License] New demo tenant created: ${tenantId} (Key: ${demoKey}) for: ${finalHospitalName}`);

    // Create demo admin user scoped to this specific tenant
    const finalAdminEmail = adminEmail || 'admin@hospital.com';
    const finalAdminPassword = adminPassword || 'admin123';
    const passwordHash = bcrypt.hashSync(finalAdminPassword, 10);

    await db.query(
      `INSERT INTO users (id, name, email, password_hash, role, is_active, created_at, tenant_id)
       VALUES ($1, 'Admin', $2, $3, 'admin', 1, $4, $5)`,
      [uuidv4(), finalAdminEmail, passwordHash, now, tenantId]
    );

    // Initialize default hospital_settings for this demo tenant
    try {
      await db.query(`
        INSERT INTO hospital_settings (name, tagline, address, phone, email, website, currency, tax_rate, tenant_id)
        VALUES ($1, 'Excellence in Healthcare (Demo)', '', '', $2, '', 'USD', 10, $3)
      `, [finalHospitalName, finalAdminEmail, tenantId]);
    } catch (settErr) {
      console.warn('[License] Could not init demo settings:', settErr.message);
    }

    const demoLeft = DEMO_DAYS;

    res.json({
      success: true,
      status: 'demo',
      licenseKey: demoKey,
      tenantId: tenantId,
      hospitalName: finalHospitalName,
      adminEmail: finalAdminEmail,
      adminPassword: 'admin123',
      daysLeft: demoLeft,
      message: `Demo started. You have ${demoLeft} days to evaluate HUDI-SOFT HMS.`,
    });
  } catch (err) {
    console.error('[License] demo error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
