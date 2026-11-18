const express = require('express');
const db = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const tenantId = req.tenantId;
  const today = new Date().toISOString().split('T')[0];
  const thisMonthPattern = today.slice(0, 7); // e.g. "2026-07"

  try {
    const [
      totalPatients,
      activePatients,
      todayAppointments,
      admittedPatients,
      availableDoctors,
      totalDoctors,
      pendingLabTests,
      lowStockMedicines,
      pendingBills,
      totalRevenueRow,
      monthRevenueRow,
      availableBeds,
      totalBeds,
      recentAppointmentsRows,
      revenueByMonth,
      apptByStatus,
      topDepartments
    ] = await Promise.all([
      db.query('SELECT COUNT(*) as c FROM patients WHERE tenant_id = $1', [tenantId]).then(r => r.rows[0]?.c || 0),
      db.query("SELECT COUNT(*) as c FROM patients WHERE status = 'active' AND tenant_id = $1", [tenantId]).then(r => r.rows[0]?.c || 0),
      db.query('SELECT COUNT(*) as c FROM appointments WHERE date = $1 AND tenant_id = $2', [today, tenantId]).then(r => r.rows[0]?.c || 0),
      db.query("SELECT COUNT(*) as c FROM ipd_admissions WHERE status = 'admitted' AND tenant_id = $1", [tenantId]).then(r => r.rows[0]?.c || 0),
      db.query("SELECT COUNT(*) as c FROM doctors WHERE status = 'available' AND tenant_id = $1", [tenantId]).then(r => r.rows[0]?.c || 0),
      db.query('SELECT COUNT(*) as c FROM doctors WHERE tenant_id = $1', [tenantId]).then(r => r.rows[0]?.c || 0),
      db.query("SELECT COUNT(*) as c FROM lab_tests WHERE status NOT IN ('completed','cancelled') AND tenant_id = $1", [tenantId]).then(r => r.rows[0]?.c || 0),
      db.query("SELECT COUNT(*) as c FROM medicines WHERE status IN ('low-stock','out-of-stock') AND tenant_id = $1", [tenantId]).then(r => r.rows[0]?.c || 0),
      db.query("SELECT COUNT(*) as c FROM invoices WHERE status IN ('unpaid','partial') AND tenant_id = $1", [tenantId]).then(r => r.rows[0]?.c || 0),
      db.query('SELECT SUM(paid_amount) as total FROM invoices WHERE tenant_id = $1', [tenantId]),
      db.query("SELECT SUM(paid_amount) as total FROM invoices WHERE LEFT(date::text, 7) = $1 AND tenant_id = $2", [thisMonthPattern, tenantId]),
      db.query("SELECT COUNT(*) as c FROM beds WHERE status = 'available' AND tenant_id = $1", [tenantId]).then(r => r.rows[0]?.c || 0),
      db.query('SELECT COUNT(*) as c FROM beds WHERE tenant_id = $1', [tenantId]).then(r => r.rows[0]?.c || 0),
      db.query('SELECT * FROM appointments WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 5', [tenantId]),
      db.query(`
        SELECT LEFT(date::text, 7) as month, SUM(paid_amount) as revenue, COUNT(*) as count
        FROM invoices
        WHERE date::text >= TO_CHAR(CURRENT_DATE - INTERVAL '6 months', 'YYYY-MM-DD')
          AND tenant_id = $1
        GROUP BY LEFT(date::text, 7) ORDER BY LEFT(date::text, 7)
      `, [tenantId]),
      db.query('SELECT status, COUNT(*) as count FROM appointments WHERE tenant_id = $1 GROUP BY status', [tenantId]),
      db.query('SELECT department, COUNT(*) as count FROM appointments WHERE tenant_id = $1 GROUP BY department ORDER BY count DESC LIMIT 5', [tenantId])
    ]);

    const recentAppointments = recentAppointmentsRows.rows.map(a => ({
      id: a.id, appointmentId: a.appointment_id, patientName: a.patient_name,
      doctorName: a.doctor_name, date: a.date, time: a.time, status: a.status, type: a.type
    }));

    res.json({
      stats: {
        totalPatients: parseInt(totalPatients),
        activePatients: parseInt(activePatients),
        todayAppointments: parseInt(todayAppointments),
        admittedPatients: parseInt(admittedPatients),
        availableDoctors: parseInt(availableDoctors),
        totalDoctors: parseInt(totalDoctors),
        pendingLabTests: parseInt(pendingLabTests),
        lowStockMedicines: parseInt(lowStockMedicines),
        pendingBills: parseInt(pendingBills),
        totalRevenue: parseFloat(totalRevenueRow.rows[0]?.total || 0),
        monthRevenue: parseFloat(monthRevenueRow.rows[0]?.total || 0),
        availableBeds: parseInt(availableBeds),
        totalBeds: parseInt(totalBeds)
      },
      recentAppointments,
      revenueByMonth: revenueByMonth.rows,
      apptByStatus: apptByStatus.rows,
      topDepartments: topDepartments.rows
    });
  } catch (err) {
    console.error('❌ Dashboard Data Error:', err.message);
    res.status(500).json({ error: `Dashboard Error: ${err.message}` });
  }
});

module.exports = router;
