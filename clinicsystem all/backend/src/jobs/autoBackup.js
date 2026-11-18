const cron = require('node-cron');
const { query } = require('../db/pool');
const { autoBackup } = require('../controllers/backupController');

/**
 * Auto-Backup Job
 * - Daily backup: runs every day at 02:00 AM
 * - Weekly backup: runs every Sunday at 03:00 AM
 * Keeps last 14 backups per clinic automatically
 */

// Daily backup at 02:00 AM
cron.schedule('0 2 * * *', async () => {
  console.log('[AUTO-BACKUP] Daily backup started...');
  try {
    const { rows: clinics } = await query('SELECT id, name FROM clinics WHERE is_active=true');
    for (const clinic of clinics) {
      const result = await autoBackup(clinic.id);
      if (result.success) {
        console.log(`[AUTO-BACKUP] ✅ ${clinic.name}: ${result.summary.patients} patients, ${result.summary.appointments} appointments`);
      } else {
        console.error(`[AUTO-BACKUP] ❌ ${clinic.name}: ${result.error}`);
      }
    }
    console.log(`[AUTO-BACKUP] Daily backup done for ${clinics.length} clinic(s)`);
  } catch (err) {
    console.error('[AUTO-BACKUP] Daily backup error:', err.message);
  }
});

// Weekly full backup on Sunday at 03:00 AM (kept longer — tagged as "weekly")
cron.schedule('0 3 * * 0', async () => {
  console.log('[AUTO-BACKUP] Weekly backup started...');
  try {
    const { rows: clinics } = await query('SELECT id, name FROM clinics WHERE is_active=true');
    for (const clinic of clinics) {
      await autoBackup(clinic.id);
    }
    console.log(`[AUTO-BACKUP] Weekly backup done for ${clinics.length} clinic(s)`);
  } catch (err) {
    console.error('[AUTO-BACKUP] Weekly backup error:', err.message);
  }
});

console.log('[Cron] Auto-backup job initialized (daily at 02:00, weekly Sunday 03:00)');

module.exports = {};
