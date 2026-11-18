const { query } = require('../db/pool');
const fs = require('fs');
const path = require('path');

// Directory to store auto-backups on server
const BACKUP_DIR = path.join(__dirname, '../../backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

/** GET /api/backup/export  — download full clinic data as JSON */
const exportBackup = async (req, res) => {
  try {
    const clinic_id = req.user.clinic_id;

    const [patients, appointments, invoices, dentalCharts, consultations, labOrders, pharmacySales, staff] = await Promise.all([
      query('SELECT * FROM patients WHERE clinic_id=$1 ORDER BY created_at', [clinic_id]),
      query('SELECT * FROM appointments WHERE clinic_id=$1 ORDER BY created_at', [clinic_id]),
      query('SELECT * FROM invoices WHERE clinic_id=$1 ORDER BY created_at', [clinic_id]),
      query('SELECT * FROM dental_charts WHERE clinic_id=$1 ORDER BY created_at', [clinic_id]),
      query('SELECT * FROM consultations WHERE clinic_id=$1 ORDER BY created_at', [clinic_id]).catch(() => ({ rows: [] })),
      query('SELECT * FROM lab_orders WHERE clinic_id=$1 ORDER BY created_at', [clinic_id]).catch(() => ({ rows: [] })),
      query('SELECT * FROM pharmacy_sales WHERE clinic_id=$1 ORDER BY created_at', [clinic_id]).catch(() => ({ rows: [] })),
      query('SELECT id, full_name, email, role, phone, specialization, is_active, created_at FROM clinic_users WHERE clinic_id=$1', [clinic_id]),
    ]);

    const backup = {
      version: '1.0',
      clinic_id,
      exported_at: new Date().toISOString(),
      exported_by: req.user.email,
      data: {
        patients: patients.rows,
        appointments: appointments.rows,
        invoices: invoices.rows,
        dental_charts: dentalCharts.rows,
        consultations: consultations.rows,
        lab_orders: labOrders.rows,
        pharmacy_sales: pharmacySales.rows,
        staff: staff.rows,
      },
      summary: {
        patients: patients.rows.length,
        appointments: appointments.rows.length,
        invoices: invoices.rows.length,
        dental_charts: dentalCharts.rows.length,
        consultations: consultations.rows.length,
        lab_orders: labOrders.rows.length,
        pharmacy_sales: pharmacySales.rows.length,
        staff: staff.rows.length,
      }
    };

    // Also save a copy on server
    const filename = `backup_${clinic_id}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(BACKUP_DIR, filename);
    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));

    // Update last_backup timestamp in clinics table (best effort)
    await query('UPDATE clinics SET updated_at=NOW() WHERE id=$1', [clinic_id]).catch(() => {});

    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Disposition', `attachment; filename="HUDI-backup-${dateStr}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(backup);
  } catch (err) {
    console.error('Backup export error:', err);
    res.status(500).json({ message: 'Backup failed: ' + err.message });
  }
};

/** POST /api/backup/restore  — restore clinic data from uploaded JSON */
const restoreBackup = async (req, res) => {
  try {
    const clinic_id = req.user.clinic_id;
    const backup = req.body;

    if (!backup || !backup.data) {
      return res.status(400).json({ message: 'Invalid backup file. Please upload a valid HUDI backup JSON.' });
    }

    if (backup.version !== '1.0') {
      return res.status(400).json({ message: 'Unsupported backup version: ' + backup.version });
    }

    const { patients = [], appointments = [], invoices = [], dental_charts = [], consultations = [], pharmacy_sales = [] } = backup.data;

    let restored = { patients: 0, appointments: 0, invoices: 0, dental_charts: 0, consultations: 0, pharmacy_sales: 0 };
    let errors = [];

    // Restore patients
    for (const p of patients) {
      try {
        await query(`
          INSERT INTO patients (id, clinic_id, patient_number, full_name, gender, date_of_birth, phone, email, address, blood_type, allergies, medical_history, notes, is_active, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
          ON CONFLICT (id) DO UPDATE SET
            full_name=EXCLUDED.full_name, phone=EXCLUDED.phone, email=EXCLUDED.email,
            address=EXCLUDED.address, notes=EXCLUDED.notes, updated_at=NOW()
        `, [
          p.id, clinic_id, p.patient_number, p.full_name, p.gender, p.date_of_birth,
          p.phone, p.email, p.address, p.blood_type, p.allergies, p.medical_history,
          p.notes, p.is_active ?? true, p.created_at || new Date(), p.updated_at || new Date()
        ]);
        restored.patients++;
      } catch (e) { errors.push(`Patient ${p.full_name}: ${e.message}`); }
    }

    // Restore appointments
    for (const a of appointments) {
      try {
        await query(`
          INSERT INTO appointments (id, clinic_id, patient_id, doctor_id, appointment_date, appointment_time, duration_minutes, type, status, notes, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
          ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, notes=EXCLUDED.notes, updated_at=NOW()
        `, [
          a.id, clinic_id, a.patient_id, a.doctor_id, a.appointment_date, a.appointment_time,
          a.duration_minutes || 30, a.type || 'consultation', a.status || 'scheduled',
          a.notes, a.created_at || new Date(), a.updated_at || new Date()
        ]);
        restored.appointments++;
      } catch (e) { errors.push(`Appointment ${a.id}: ${e.message}`); }
    }

    // Restore invoices
    for (const inv of invoices) {
      try {
        await query(`
          INSERT INTO invoices (id, clinic_id, patient_id, invoice_number, total_amount, paid_amount, status, notes, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
          ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, paid_amount=EXCLUDED.paid_amount, updated_at=NOW()
        `, [
          inv.id, clinic_id, inv.patient_id, inv.invoice_number, inv.total_amount || 0,
          inv.paid_amount || 0, inv.status || 'unpaid', inv.notes,
          inv.created_at || new Date(), inv.updated_at || new Date()
        ]);
        restored.invoices++;
      } catch (e) { errors.push(`Invoice ${inv.invoice_number}: ${e.message}`); }
    }

    // Restore dental charts
    for (const dc of dental_charts) {
      try {
        await query(`
          INSERT INTO dental_charts (id, clinic_id, patient_id, tooth_number, condition, treatment, notes, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          ON CONFLICT (id) DO UPDATE SET condition=EXCLUDED.condition, treatment=EXCLUDED.treatment, notes=EXCLUDED.notes, updated_at=NOW()
        `, [
          dc.id, clinic_id, dc.patient_id, dc.tooth_number, dc.condition, dc.treatment,
          dc.notes, dc.created_at || new Date(), dc.updated_at || new Date()
        ]);
        restored.dental_charts++;
      } catch (e) { errors.push(`Dental chart ${dc.id}: ${e.message}`); }
    }

    // Restore consultations
    for (const c of consultations) {
      try {
        await query(`
          INSERT INTO consultations (id, clinic_id, patient_id, doctor_id, diagnosis, treatment_plan, notes, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          ON CONFLICT (id) DO NOTHING
        `, [
          c.id, clinic_id, c.patient_id, c.doctor_id, c.diagnosis, c.treatment_plan,
          c.notes, c.created_at || new Date(), c.updated_at || new Date()
        ]);
        restored.consultations++;
      } catch (e) { /* skip silently */ }
    }

    res.json({
      message: 'Restore completed successfully!',
      restored,
      errors: errors.length ? errors.slice(0, 10) : [],
      total_errors: errors.length,
    });
  } catch (err) {
    console.error('Restore error:', err);
    res.status(500).json({ message: 'Restore failed: ' + err.message });
  }
};

/** GET /api/backup/list  — list server-side backups */
const listBackups = async (req, res) => {
  try {
    const clinic_id = req.user.clinic_id;
    if (!fs.existsSync(BACKUP_DIR)) return res.json([]);

    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith(`backup_${clinic_id}_`) && f.endsWith('.json'))
      .map(f => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f));
        return {
          filename: f,
          created_at: stat.mtime.toISOString(),
          size_kb: Math.round(stat.size / 1024),
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 30); // Last 30 backups

    res.json(files);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** GET /api/backup/download/:filename  — download a server-side backup */
const downloadServerBackup = async (req, res) => {
  try {
    const clinic_id = req.user.clinic_id;
    const { filename } = req.params;

    // Security: only allow files belonging to this clinic
    if (!filename.startsWith(`backup_${clinic_id}_`) || !filename.endsWith('.json') || filename.includes('..')) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const filepath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filepath)) return res.status(404).json({ message: 'Backup file not found' });

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.sendFile(filepath);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** POST /api/backup/auto  — called by cron to save auto backup */
const autoBackup = async (clinic_id) => {
  try {
    const [patients, appointments, invoices, dentalCharts] = await Promise.all([
      query('SELECT * FROM patients WHERE clinic_id=$1', [clinic_id]),
      query('SELECT * FROM appointments WHERE clinic_id=$1', [clinic_id]),
      query('SELECT * FROM invoices WHERE clinic_id=$1', [clinic_id]),
      query('SELECT * FROM dental_charts WHERE clinic_id=$1', [clinic_id]),
    ]);

    const backup = {
      version: '1.0',
      clinic_id,
      exported_at: new Date().toISOString(),
      exported_by: 'auto-cron',
      data: {
        patients: patients.rows,
        appointments: appointments.rows,
        invoices: invoices.rows,
        dental_charts: dentalCharts.rows,
      },
      summary: {
        patients: patients.rows.length,
        appointments: appointments.rows.length,
        invoices: invoices.rows.length,
        dental_charts: dentalCharts.rows.length,
      }
    };

    const filename = `backup_${clinic_id}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(path.join(BACKUP_DIR, filename), JSON.stringify(backup, null, 2));

    // Keep only last 14 backups per clinic
    const all = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith(`backup_${clinic_id}_`))
      .sort();
    while (all.length > 14) {
      fs.unlinkSync(path.join(BACKUP_DIR, all.shift()));
    }

    console.log(`[AUTO-BACKUP] Clinic ${clinic_id}: ${backup.summary.patients} patients saved → ${filename}`);
    return { success: true, filename, summary: backup.summary };
  } catch (err) {
    console.error(`[AUTO-BACKUP] Failed for clinic ${clinic_id}:`, err.message);
    return { success: false, error: err.message };
  }
};

module.exports = { exportBackup, restoreBackup, listBackups, downloadServerBackup, autoBackup };
