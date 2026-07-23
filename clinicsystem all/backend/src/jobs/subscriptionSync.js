const cron = require('node-cron');
const { query } = require('../db/pool');

/**
 * Hourly subscription sync with HUDI-SOFT central licensing API.
 */
cron.schedule('0 * * * *', async () => {
  const hudiApiUrl = process.env.HUDI_SOFT_API_URL || 'https://hudi-soft-com.onrender.com/api';
  console.log('[Cron] Running subscription sync...');

  try {
    const { rows: clinics } = await query(
      "SELECT id, name, license_key FROM clinics WHERE is_active=true AND subscription_status NOT IN ('Suspended')"
    );

    for (const clinic of clinics) {
      try {
        const resp = await fetch(`${hudiApiUrl}/licenses/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ licenseKey: clinic.license_key, machineID: 'DCS-CRON' }),
        });
        if (!resp.ok) continue;
        const data = await resp.json();

        if (data.valid) {
          await query(
            `UPDATE clinics SET subscription_status='Active', days_remaining=$1, subscription_expiry=$2, updated_at=NOW() WHERE id=$3`,
            [data.daysRemaining, data.expiryDate, clinic.id]
          );
        } else {
          const msg = data.message || '';
          const newStatus = msg.includes('expired') ? 'Expired' : 'Suspended';
          await query(
            `UPDATE clinics SET subscription_status=$1, days_remaining=0, updated_at=NOW() WHERE id=$2`,
            [newStatus, clinic.id]
          );
          console.log(`[Cron] Clinic "${clinic.name}" → ${newStatus}`);
        }
      } catch (e) {
        console.warn(`[Cron] Failed to sync clinic "${clinic.name}":`, e.message);
      }
    }
    console.log(`[Cron] Sync complete for ${clinics.length} clinic(s)`);
  } catch (err) {
    console.error('[Cron] Subscription sync error:', err.message);
  }
});

console.log('[Cron] Subscription sync job initialized (runs hourly)');
