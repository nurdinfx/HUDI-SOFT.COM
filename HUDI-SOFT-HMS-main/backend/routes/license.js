const express = require('express');
const router = express.Router();
const db = require('../database');
const https = require('https');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

function runWithTenantContext(tenantId, work) {
    if (!global.tenantStorage || !tenantId) return work();
    return new Promise((resolve, reject) => {
        global.tenantStorage.run(tenantId, () => {
            Promise.resolve(work()).then(resolve).catch(reject);
        });
    });
}

// Helper to make https calls to Main Website
function callLicensingApi(path, method, body = null) {
    const url = `https://hudi-soft-com.onrender.com/api${path}`;
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const options = {
            hostname: parsed.hostname,
            port: parsed.port || 443,
            path: parsed.pathname + parsed.search,
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (res.statusCode >= 400) reject({ status: res.statusCode, message: json.message || 'Licensing server error' });
                    else resolve(json);
                } catch (e) {
                    reject({ status: 500, message: `Failed to parse licensing response: ${data.substring(0, 100)}` });
                }
            });
        });
        req.on('error', (err) => reject({ status: 503, message: `Licensing server unreachable: ${err.message}` }));
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

/**
 * Generate a deterministic tenant UUID from a license key.
 * Same license key always produces the same tenantId across all devices.
 */
function makeTenantId(licenseKey) {
    const hash = crypto.createHash('sha256').update(licenseKey.toUpperCase().trim()).digest('hex');
    return [
        hash.substring(0, 8),
        hash.substring(8, 12),
        '4' + hash.substring(13, 16),
        (parseInt(hash.substring(16, 18), 16) & 0x3f | 0x80).toString(16) + hash.substring(18, 20),
        hash.substring(20, 32)
    ].join('-');
}

/**
 * Ensure an admin user exists for a given tenant.
 * Uses the license key hash as a deterministic admin email so each hospital
 * has a unique admin account → complete data isolation.
 */
async function ensureTenantAdmin(tenantId, licenseKey, companyName) {
    // Check if any admin exists for this tenant
    const existing = await db.queryBypassRLS(
        "SELECT id, email FROM users WHERE tenant_id = $1 AND role = 'admin' LIMIT 1",
        [tenantId]
    );
    
    if (existing.rows.length > 0) {
        return existing.rows[0].email;
    }
    
    // All tenants use admin@hospital.com as the admin email.
    // This is safe because the unique constraint is UNIQUE(tenant_id, email),
    // so each tenant has its own completely isolated admin@hospital.com account.
    const adminEmail = 'admin@hospital.com';
    const hashedPw = await bcrypt.hash('admin123', 10);
    const adminId = uuidv4();
    
    await db.queryBypassRLS(
        `INSERT INTO users (id, name, email, password_hash, role, is_active, tenant_id, created_at)
         VALUES ($1, $2, $3, $4, 'admin', 1, $5, CURRENT_TIMESTAMP)
         ON CONFLICT (tenant_id, email) DO UPDATE SET password_hash = EXCLUDED.password_hash, is_active = 1`,
        [adminId, companyName || 'Admin', adminEmail, hashedPw, tenantId]
    );
    
    console.log(`[License] ✅ Created/verified isolated admin for tenant ${tenantId.substring(0,8)}: ${adminEmail}`);
    return adminEmail;
}

// POST /api/license/activate
router.post('/activate', async (req, res) => {
    const { licenseKey } = req.body;
    const machineId = req.headers['x-machine-id'] || 'UNKNOWN';

    if (!licenseKey) return res.status(400).json({ error: 'License key is required' });

    try {
        console.log(`[License Proxy] Activating key: ${licenseKey.substring(0, 10)}... for device: ${machineId}`);
        const response = await callLicensingApi('/settings/activate-license', 'POST', { licenseKey, machineId });

        if (response.success && response.valid) {
            const start = response.startDate;
            const expiry = response.expiryDate;
            const status = response.status || 'Active';
            const isTrial = response.isTrial ? 1 : 0;
            const company = response.companyName || '';
            const prodType = response.productType || 'HMS';
            
            // ALWAYS use deterministic tenantId from license key
            // This ensures the same license key always maps to the same tenant
            // regardless of what the main server returns
            const tenantId = makeTenantId(licenseKey);
            
            console.log(`[License Proxy] TenantId for ${company}: ${tenantId.substring(0,8)}...`);

            await runWithTenantContext(tenantId, async () => {
                // Ensure tenant_id column exists in hms_license
                try {
                    await db.exec(`ALTER TABLE hms_license ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(255) DEFAULT '00000000-0000-0000-0000-000000000000'`);
                } catch (e) { /* column may already exist */ }

                // Write/update license cache
                const existing = await db.queryBypassRLS('SELECT machine_id FROM hms_license WHERE machine_id = $1', [machineId]);
                if (existing.rows.length > 0) {
                    await db.queryBypassRLS(
                        `UPDATE hms_license SET license_key=$1,company_name=$2,product_type=$3,start_date=$4,expiry_date=$5,status=$6,is_trial=$7,tenant_id=$8,last_checked_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE machine_id=$9`,
                        [licenseKey, company, prodType, start, expiry, status, isTrial, tenantId, machineId]
                    );
                } else {
                    await db.queryBypassRLS(
                        `INSERT INTO hms_license (machine_id,license_key,company_name,product_type,start_date,expiry_date,status,is_trial,tenant_id,last_checked_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
                        [machineId, licenseKey, company, prodType, start, expiry, status, isTrial, tenantId]
                    );
                }

                // Ensure isolated admin user for this tenant
                await ensureTenantAdmin(tenantId, licenseKey, company);

                // Ensure hospital settings for this tenant
                // Using tenant_id as PRIMARY KEY so each hospital has its own isolated settings row
                const settings = await db.queryBypassRLS('SELECT tenant_id FROM hospital_settings WHERE tenant_id = $1 LIMIT 1', [tenantId]);
                if (!settings.rows.length) {
                    await db.queryBypassRLS(
                        `INSERT INTO hospital_settings (tenant_id, name, tagline, currency, tax_rate)
                         VALUES ($1, $2, 'Care with Excellence', 'USD', 10)
                         ON CONFLICT (tenant_id) DO NOTHING`,
                        [tenantId, company || 'Hudi Hospital']
                    );
                    console.log(`[License] ✅ Hospital settings created for tenant ${tenantId.substring(0,8)}`);
                }
            });

            // Look up the admin email that was created/found for this tenant
            const adminRow = await db.queryBypassRLS(
                "SELECT email FROM users WHERE tenant_id = $1 AND role = 'admin' LIMIT 1",
                [tenantId]
            );
            const adminEmail = adminRow.rows[0]?.email || `admin@${licenseKey.replace(/-/g,'').substring(0,8).toLowerCase()}.hms`;

            res.json({
                success: true,
                message: 'License activated successfully',
                tenantId: tenantId,
                adminEmail: adminEmail,
                license: {
                    licenseKey,
                    companyName: company,
                    productType: prodType,
                    startDate: start,
                    expiryDate: expiry,
                    status: status,
                    isTrial: !!isTrial
                }
            });
        } else {
            res.status(400).json({ error: response.message || 'Invalid license key' });
        }
    } catch (err) {
        console.error('[License Proxy] Activation failed:', err);
        res.status(err.status || 500).json({ error: err.message || 'Internal licensing server error' });
    }
});

// GET /api/license/status
router.get('/status', async (req, res) => {
    const machineId = req.headers['x-machine-id'] || 'UNKNOWN';

    try {
        const licResult = await db.queryBypassRLS('SELECT * FROM hms_license WHERE machine_id = $1', [machineId]);
        const localLic = licResult.rows[0];

        if (!localLic) {
            return res.json({ isLicensed: false, message: 'System is not activated. Please register a license key.' });
        }

        const now = new Date();
        const lastChecked = new Date(localLic.last_checked_at);
        const diffHours = (now - lastChecked) / (1000 * 60 * 60);
        const forceSync = diffHours >= 12 || req.query.sync === 'true';

        // Always use deterministic tenantId
        const tenantId = makeTenantId(localLic.license_key);

        if (forceSync) {
            try {
                const response = await callLicensingApi(`/settings/license-status?key=${localLic.license_key}&machineId=${machineId}`, 'GET');
                
                if (response.success && response.valid) {
                    await db.queryBypassRLS(
                        `UPDATE hms_license SET company_name=$1,product_type=$2,start_date=$3,expiry_date=$4,status=$5,is_trial=$6,tenant_id=$7,last_checked_at=CURRENT_TIMESTAMP WHERE machine_id=$8`,
                        [response.companyName||'', response.productType||'HMS', response.startDate, response.expiryDate, response.status||'Active', response.isTrial?1:0, tenantId, machineId]
                    );

                    // Ensure admin and settings still exist
                    await ensureTenantAdmin(tenantId, localLic.license_key, response.companyName || localLic.company_name);

                    return res.json({
                        isLicensed: true,
                        syncSuccess: true,
                        tenantId: tenantId,
                        license: {
                            licenseKey: localLic.license_key,
                            companyName: response.companyName || localLic.company_name,
                            productType: response.productType || localLic.product_type,
                            startDate: response.startDate,
                            expiryDate: response.expiryDate,
                            status: response.status || 'Active',
                            isTrial: !!response.isTrial,
                            daysRemaining: response.daysRemaining || 0
                        }
                    });
                } else {
                    // License invalid on central server
                    await db.queryBypassRLS(`UPDATE hms_license SET status='Expired',last_checked_at=CURRENT_TIMESTAMP WHERE machine_id=$1`, [machineId]);
                    return res.json({ isLicensed: false, message: response.message || 'License expired or invalid.' });
                }
            } catch (syncErr) {
                console.warn(`[License Proxy] Sync failed (offline fallback): ${syncErr.message}`);
            }
        }

        // Return cached license
        const expiryDate = new Date(localLic.expiry_date);
        const daysRemaining = Math.max(0, Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24)));
        const isValid = localLic.status === 'Active' && expiryDate > now;

        res.json({
            isLicensed: isValid,
            offlineCached: true,
            tenantId: tenantId,
            license: {
                licenseKey: localLic.license_key,
                companyName: localLic.company_name,
                productType: localLic.product_type,
                startDate: localLic.start_date,
                expiryDate: localLic.expiry_date,
                status: localLic.status,
                isTrial: localLic.is_trial === 1,
                daysRemaining
            }
        });

    } catch (err) {
        console.error('[License Proxy] Status check failed:', err);
        res.status(500).json({ error: 'Internal licensing check error' });
    }
});

module.exports = router;
