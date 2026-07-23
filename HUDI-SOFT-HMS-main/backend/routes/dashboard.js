const express = require('express');
const db = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const thisMonthPattern = today.slice(0, 7) + '%';
  
  // Always use the authenticated user's tenant_id for ALL queries
  const tenantId = req.user.tenant_id || '00000000-0000-0000-0000-000000000000';

  try {
    const q = (sql, ...params) => db.queryBypassRLS(
      sql.replace(/\?/g, (_, i) => `$${i + 1}`), 
      params
    ).then(r => r.rows[0]);
    
    const qAll = (sql, ...params) => db.queryBypassRLS(
      sql.replace(/\?/g, (_, i) => `$${i + 1}`), 
      params
    ).then(r => r.rows);

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
      topDepartments,
      monthlyPayroll,
      creditStats,
    ] = await Promise.all([
      q('SELECT COUNT(*) as c FROM patients WHERE tenant_id = $1', tenantId).then(r => r.c),
      q("SELECT COUNT(*) as c FROM patients WHERE tenant_id = $1 AND status = 'active'", tenantId).then(r => r.c),
      q('SELECT COUNT(*) as c FROM appointments WHERE tenant_id = $1 AND date = $2', tenantId, today).then(r => r.c),
      q("SELECT COUNT(*) as c FROM ipd_admissions WHERE tenant_id = $1 AND status = 'admitted'", tenantId).then(r => r.c),
      q("SELECT COUNT(*) as c FROM doctors WHERE tenant_id = $1 AND status = 'available'", tenantId).then(r => r.c),
      q('SELECT COUNT(*) as c FROM doctors WHERE tenant_id = $1', tenantId).then(r => r.c),
      q("SELECT COUNT(*) as c FROM lab_tests WHERE tenant_id = $1 AND status NOT IN ('completed','cancelled')", tenantId).then(r => r.c),
      q("SELECT COUNT(*) as c FROM medicines WHERE tenant_id = $1 AND status IN ('low-stock','out-of-stock')", tenantId).then(r => r.c),
      q("SELECT COUNT(*) as c FROM invoices WHERE tenant_id = $1 AND status IN ('unpaid','partial')", tenantId).then(r => r.c),
      q('SELECT SUM(paid_amount) as total FROM invoices WHERE tenant_id = $1', tenantId),
      q("SELECT SUM(paid_amount) as total FROM invoices WHERE tenant_id = $1 AND TO_CHAR(date::date, 'YYYY-MM') = $2", tenantId, today.slice(0, 7)),
      q("SELECT COUNT(*) as c FROM beds WHERE tenant_id = $1 AND status = 'available'", tenantId).then(r => r.c),
      q('SELECT COUNT(*) as c FROM beds WHERE tenant_id = $1', tenantId).then(r => r.c),
      qAll('SELECT * FROM appointments WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 5', tenantId),
      db.queryBypassRLS(`
        SELECT TO_CHAR(date::date, 'YYYY-MM') as month, SUM(paid_amount) as revenue, COUNT(*) as count
        FROM invoices
        WHERE tenant_id = $1 AND date::date >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY month ORDER BY month
      `, [tenantId]).then(r => r.rows),
      db.queryBypassRLS(
        'SELECT status, COUNT(*) as count FROM appointments WHERE tenant_id = $1 GROUP BY status',
        [tenantId]
      ).then(r => r.rows),
      db.queryBypassRLS(
        'SELECT department, COUNT(*) as count FROM appointments WHERE tenant_id = $1 GROUP BY department ORDER BY count DESC LIMIT 5',
        [tenantId]
      ).then(r => r.rows),
      // Monthly payroll total
      db.queryBypassRLS(
        "SELECT COALESCE(SUM(net_salary), 0) as total, COUNT(DISTINCT employee_id) as staff FROM employee_payroll WHERE tenant_id = $1 AND TO_CHAR(pay_period::date, 'YYYY-MM') = $2",
        [tenantId, today.slice(0, 7)]
      ).then(r => r.rows[0]).catch(() => ({ total: 0, staff: 0 })),
      // Credit outstanding
      db.queryBypassRLS(
        "SELECT COALESCE(SUM(outstanding_balance), 0) as outstanding, COUNT(*) as accounts FROM credit_customers WHERE tenant_id = $1",
        [tenantId]
      ).then(r => r.rows[0]).catch(() => ({ outstanding: 0, accounts: 0 })),
    ]);

    const recentAppointments = recentAppointmentsRows.map(a => ({
      id: a.id, appointmentId: a.appointment_id, patientName: a.patient_name,
      doctorName: a.doctor_name, date: a.date, time: a.time, status: a.status, type: a.type
    }));

    res.json({
      stats: {
        totalPatients: parseInt(totalPatients) || 0,
        activePatients: parseInt(activePatients) || 0,
        todayAppointments: parseInt(todayAppointments) || 0,
        admittedPatients: parseInt(admittedPatients) || 0,
        availableDoctors: parseInt(availableDoctors) || 0,
        totalDoctors: parseInt(totalDoctors) || 0,
        pendingLabTests: parseInt(pendingLabTests) || 0,
        lowStockMedicines: parseInt(lowStockMedicines) || 0,
        pendingBills: parseInt(pendingBills) || 0,
        totalRevenue: parseFloat(totalRevenueRow?.total || 0),
        monthRevenue: parseFloat(monthRevenueRow?.total || 0),
        availableBeds: parseInt(availableBeds) || 0,
        totalBeds: parseInt(totalBeds) || 0,
        monthlyPayroll: parseFloat(monthlyPayroll?.total || 0),
        totalStaff: parseInt(monthlyPayroll?.staff || 0),
        outstandingCredit: parseFloat(creditStats?.outstanding || 0),
        creditAccounts: parseInt(creditStats?.accounts || 0),
      },
      recentAppointments,
      revenueByMonth,
      apptByStatus,
      topDepartments
    });
  } catch (err) {
    console.error('❌ Dashboard Error:', err.message);
    res.status(500).json({ error: `Dashboard Error: ${err.message}` });
  }
});

module.exports = router;
