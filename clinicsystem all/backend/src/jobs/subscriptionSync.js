const cron = require('node-cron');
const { query } = require('../db/pool');

/**
 * Sync a single clinic's license status with HUDI-SOFT central licensing API.
 */
async function syncSingleClinic(clinicId) {
  const hudiApiUrl = process.env.HUDI_SOFT_API_URL || 'https://hudi-soft-com.onrender.com/api';
  try {
    const { rows } = await query('SELECT id, name, license_key, subscription_status FROM clinics WHERE id = $1', [clinicId]);
    if (!rows.length || !rows[0].license_key) return null;
    const clinic = rows[0];

    const resp = await fetch(`${hudiApiUrl}/licenses/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey: clinic.license_key, machineID: 'DCS-DIRECT' }),
    });

    const data = await resp.json().catch(() => null);
    if (!data) return null;

    if (data.valid) {
      await query(
        `UPDATE clinics SET subscription_status='Active', days_remaining=$1, subscription_expiry=$2, updated_at=NOW() WHERE id=$3`,
        [data.daysRemaining || 30, data.expiryDate || null, clinic.id]
      );
      return { status: 'Active', daysRemaining: data.daysRemaining };
    } else {
      const msg = (data.message || '').toLowerCase();
      const newStatus = msg.includes('expired') ? 'Expired' : 'Suspended';
      await query(
        `UPDATE clinics SET subscription_status=$1, days_remaining=0, updated_at=NOW() WHERE id=$2`,
        [newStatus, clinic.id]
      );
      console.log(`[Sync] Clinic "${clinic.name}" updated → ${newStatus} (Message: ${data.message})`);
      return { status: newStatus, daysRemaining: 0, message: data.message };
    }
  } catch (err) {
    console.warn(`[Sync] Failed to sync clinic ${clinicId}:`, err.message);
    return null;
  }
}

/**
 * Continuous subscription sync with HUDI-SOFT central licensing API (runs every 1 minute).
 * Checks ALL active clinics including Suspended ones so admin suspension and re-activation takes effect immediately.
 */
cron.schedule('*/1 * * * *', async () => {
  const hudiApiUrl = process.env.HUDI_SOFT_API_URL || 'https://hudi-soft-com.onrender.com/api';

  try {
    const { rows: clinics } = await query(
      "SELECT id, name, license_key, subscription_status FROM clinics WHERE is_active=true"
    );

    for (const clinic of clinics) {
      if (!clinic.license_key) continue;
      try {
        const resp = await fetch(`${hudiApiUrl}/licenses/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ licenseKey: clinic.license_key, machineID: 'DCS-CRON' }),
        });

        const data = await resp.json().catch(() => null);
        if (!data) continue;

        if (data.valid) {
          if (clinic.subscription_status !== 'Active') {
            console.log(`[Sync] Clinic "${clinic.name}" UNLOCKED by Admin → Active`);
          }
          await query(
            `UPDATE clinics SET subscription_status='Active', days_remaining=$1, subscription_expiry=$2, updated_at=NOW() WHERE id=$3`,
            [data.daysRemaining || 30, data.expiryDate || null, clinic.id]
          );
        } else {
          const msg = (data.message || '').toLowerCase();
          const newStatus = msg.includes('expired') ? 'Expired' : 'Suspended';
          if (clinic.subscription_status !== newStatus) {
            console.log(`[Sync] Clinic "${clinic.name}" LOCKED by Admin → ${newStatus} (${data.message})`);
          }
          await query(
            `UPDATE clinics SET subscription_status=$1, days_remaining=0, updated_at=NOW() WHERE id=$2`,
            [newStatus, clinic.id]
          );
        }
      } catch (e) {
        // network warning
      }
    }
  } catch (err) {
    console.error('[Sync] Subscription sync loop error:', err.message);
  }
});

console.log('[Cron] Subscription sync job initialized (runs every 1 minute)');

module.exports = { syncSingleClinic };
