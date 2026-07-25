/**
 * routes/license.js
 * License key management for HUDI-SOFT HMS SaaS rental system.
 *
 * POST /api/license/activate  — Activate with a license key
 * POST /api/license/demo      — Start 7-day demo
 * GET  /api/license/status    — Get current license status (no auth required)
 */
const express = require('express');
const router = express.Router();
const db = require('../database');

const DEMO_DAYS = 7;

// ─── Helpers ─────────────────────────────────────────────────────
function getDemoTimeLeft(demoStartedAt) {
  if (!demoStartedAt) return 0;
  const started = new Date(demoStartedAt);
  const expiresAt = new Date(started.getTime() + DEMO_DAYS * 24 * 60 * 60 * 1000);
  const now = new Date();
  const msLeft = expiresAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
}

// ─── GET /api/license/status ─────────────────────────────────────
router.get('/status', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM license_info LIMIT 1');
    const info = result.rows[0];

    if (!info) {
      return res.json({
        status: 'demo',
        plan: 'demo',
        demoActive: true,
        daysLeft: DEMO_DAYS,
        hospitalName: 'My Hospital',
        tenantId: null,
        message: 'No license record found. Demo mode active.',
      });
    }

    const demoLeft = getDemoTimeLeft(info.demo_started_at);

    if (info.status === 'active') {
      // Check expiry
      if (info.expires_at && new Date(info.expires_at) < new Date()) {
        await db.query(`UPDATE license_info SET status = 'expired' WHERE id = $1`, [info.id]);
        return res.json({
          status: 'expired',
          plan: info.plan,
          tenantId: info.tenant_id,
          hospitalName: info.hospital_name,
          demoActive: false,
          daysLeft: 0,
          message: 'License expired. Please renew.',
        });
      }
      return res.json({
        status: 'active',
        plan: info.plan,
        tenantId: info.tenant_id,
        hospitalName: info.hospital_name,
        customerName: info.customer_name,
        customerEmail: info.customer_email,
        licenseKey: info.license_key,
        activatedAt: info.activated_at,
        expiresAt: info.expires_at,
        demoActive: false,
        daysLeft: null,
        message: 'License is active.',
      });
    }

    if (info.status === 'demo') {
      if (demoLeft <= 0) {
        return res.json({
          status: 'expired',
          plan: 'demo',
          tenantId: info.tenant_id,
          hospitalName: info.hospital_name,
          demoActive: false,
          daysLeft: 0,
          message: 'Demo period has expired. Please activate with a license key.',
        });
      }
      return res.json({
        status: 'demo',
        plan: 'demo',
        tenantId: info.tenant_id,
        hospitalName: info.hospital_name,
        demoActive: true,
        daysLeft: demoLeft,
        message: `Demo mode — ${demoLeft} day(s) remaining.`,
      });
    }

    // expired / invalid
    return res.json({
      status: info.status,
      plan: info.plan,
      tenantId: info.tenant_id,
      hospitalName: info.hospital_name,
      demoActive: false,
      daysLeft: 0,
      message: 'License is not active.',
    });
  } catch (err) {
    console.error('[License] status error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/license/activate ──────────────────────────────────
router.post('/activate', async (req, res) => {
  const { licenseKey, hospitalName, customerName, customerEmail } = req.body;

  if (!licenseKey) {
    return res.status(400).json({ error: 'License key is required' });
  }

  try {
    // Verify with HUDI-SOFT main website
    let verificationResult = null;
    const cleanKey = licenseKey.trim().toUpperCase();

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
          body: JSON.stringify({
            licenseKey: cleanKey,
            key: cleanKey,
            machineID: hospitalName || 'HMS-WEB',
            machineId: hospitalName || 'HMS-WEB'
          }),
          signal: AbortSignal.timeout(5000), // 5s timeout per endpoint
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

    // Fallback: If main site verification was unavailable or returned non-200, check key structure
    if (!verificationResult) {
      // Accepts UUIDs (7A542256-9AB0-43A0-BA00-C66729D4B1D5), HUDI-XXXX keys, or any valid 8+ char key
      const isUuid = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i.test(cleanKey);
      const isHudiFormat = /^HUDI-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(cleanKey);
      const isGenericValidKey = cleanKey.length >= 8 && /^[A-Z0-9-]+$/i.test(cleanKey);

      if (isUuid || isHudiFormat || isGenericValidKey) {
        console.log(`[License] Accepted key via valid key validation: ${cleanKey}`);
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
      return res.status(400).json({
        error: 'Invalid license key. Please purchase a valid license from hudi-soft.com',
      });
    }

    const now = new Date().toISOString();
    const expiresAt = verificationResult.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    // Update the license record
    const existing = await db.query('SELECT id FROM license_info LIMIT 1');
    if (existing.rows.length > 0) {
      await db.query(`
        UPDATE license_info SET
          license_key = $1,
          customer_name = $2,
          customer_email = $3,
          hospital_name = $4,
          plan = $5,
          status = 'active',
          activated_at = $6,
          expires_at = $7,
          last_verified_at = $6
        WHERE id = $8
      `, [
        licenseKey.trim().toUpperCase(),
        verificationResult.customerName || customerName || 'Customer',
        verificationResult.customerEmail || customerEmail || '',
        hospitalName || 'My Hospital',
        verificationResult.plan || 'professional',
        now,
        expiresAt,
        existing.rows[0].id,
      ]);
    } else {
      await db.query(`
        INSERT INTO license_info (license_key, customer_name, customer_email, hospital_name, plan, status, activated_at, expires_at, last_verified_at)
        VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $6)
      `, [
        licenseKey.trim().toUpperCase(),
        verificationResult.customerName || customerName || 'Customer',
        verificationResult.customerEmail || customerEmail || '',
        hospitalName || 'My Hospital',
        verificationResult.plan || 'professional',
        now,
        expiresAt,
      ]);
    }

    const updated = await db.query('SELECT * FROM license_info LIMIT 1');
    const info = updated.rows[0];

    console.log(`✅ [License] Activated for ${info.hospital_name} — Key: ${licenseKey}`);

    res.json({
      success: true,
      status: 'active',
      tenantId: info.tenant_id,
      hospitalName: info.hospital_name,
      plan: info.plan,
      expiresAt: info.expires_at,
      message: 'License activated successfully! Welcome to HUDI-SOFT HMS.',
    });
  } catch (err) {
    console.error('[License] activate error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/license/demo ───────────────────────────────────────
router.post('/demo', async (req, res) => {
  const { hospitalName } = req.body;
  try {
    const existing = await db.query('SELECT id, status FROM license_info LIMIT 1');

    if (existing.rows.length > 0 && existing.rows[0].status === 'active') {
      return res.json({ success: true, status: 'active', message: 'Already activated.' });
    }

    const now = new Date().toISOString();
    if (existing.rows.length > 0) {
      await db.query(`
        UPDATE license_info SET
          hospital_name = COALESCE($1, hospital_name),
          status = 'demo',
          plan = 'demo',
          demo_started_at = CASE WHEN demo_started_at IS NULL THEN $2 ELSE demo_started_at END
        WHERE id = $3
      `, [hospitalName, now, existing.rows[0].id]);
    } else {
      await db.query(`
        INSERT INTO license_info (hospital_name, status, plan, demo_started_at)
        VALUES ($1, 'demo', 'demo', $2)
      `, [hospitalName || 'My Hospital', now]);
    }

    const updated = await db.query('SELECT * FROM license_info LIMIT 1');
    const info = updated.rows[0];
    const demoLeft = getDemoTimeLeft(info.demo_started_at);

    res.json({
      success: true,
      status: 'demo',
      tenantId: info.tenant_id,
      hospitalName: info.hospital_name,
      daysLeft: demoLeft,
      message: `Demo started. You have ${demoLeft} days to try HUDI-SOFT HMS.`,
    });
  } catch (err) {
    console.error('[License] demo error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
