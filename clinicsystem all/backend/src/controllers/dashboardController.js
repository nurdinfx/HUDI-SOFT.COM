const { query } = require('../db/pool');

/** GET /api/dashboard/stats */
const getStats = async (req, res) => {
  try {
    const cid = req.user.clinic_id;
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [
      totalPatients, newPatientsMonth, todayAppts, completedToday,
      monthRevenue, dailyRevenue, unpaidInvoices, pendingLab,
      lowStockCount, pharmacySalesMonth,
    ] = await Promise.all([
      query('SELECT COUNT(*) AS cnt FROM patients WHERE clinic_id=$1 AND is_active=true', [cid]),
      query('SELECT COUNT(*) AS cnt FROM patients WHERE clinic_id=$1 AND created_at >= $2', [cid, monthStart]),
      query('SELECT COUNT(*) AS cnt FROM appointments WHERE clinic_id=$1 AND appointment_date=$2', [cid, today]),
      query("SELECT COUNT(*) AS cnt FROM appointments WHERE clinic_id=$1 AND appointment_date=$2 AND status='Completed'", [cid, today]),
      query("SELECT COALESCE(SUM(total_amount),0) AS val FROM invoices WHERE clinic_id=$1 AND payment_status='Paid' AND paid_at >= $2", [cid, monthStart]),
      query("SELECT COALESCE(SUM(total_amount),0) AS val FROM invoices WHERE clinic_id=$1 AND payment_status='Paid' AND DATE(paid_at)=$2", [cid, today]),
      query("SELECT COUNT(*) AS cnt FROM invoices WHERE clinic_id=$1 AND payment_status IN ('Unpaid','Partial')", [cid]),
      query("SELECT COUNT(*) AS cnt FROM lab_requests WHERE clinic_id=$1 AND status NOT IN ('Completed','Cancelled')", [cid]),
      query('SELECT COUNT(*) AS cnt FROM medications WHERE clinic_id=$1 AND is_active=true AND stock_quantity <= reorder_level', [cid]),
      query("SELECT COALESCE(SUM(total_amount),0) AS val FROM pharmacy_sales WHERE clinic_id=$1 AND created_at >= $2", [cid, monthStart]),
    ]);

    res.json({
      totalPatients: parseInt(totalPatients.rows[0].cnt),
      newPatientsThisMonth: parseInt(newPatientsMonth.rows[0].cnt),
      todayAppointments: parseInt(todayAppts.rows[0].cnt),
      completedTodayAppointments: parseInt(completedToday.rows[0].cnt),
      monthlyRevenue: parseFloat(monthRevenue.rows[0].val),
      dailyRevenue: parseFloat(dailyRevenue.rows[0].val),
      unpaidInvoices: parseInt(unpaidInvoices.rows[0].cnt),
      pendingLabRequests: parseInt(pendingLab.rows[0].cnt),
      lowStockMedications: parseInt(lowStockCount.rows[0].cnt),
      pharmacySalesThisMonth: parseFloat(pharmacySalesMonth.rows[0].val),
    });
  } catch (err) {
    console.error('[Dashboard] Stats error:', err);
    res.status(500).json({ message: err.message });
  }
};

/** GET /api/dashboard/recent-appointments */
const getRecentAppointments = async (req, res) => {
  try {
    const cid = req.user.clinic_id;
    const today = new Date().toISOString().split('T')[0];
    const { rows } = await query(
      `SELECT a.*, p.full_name AS patient_name, p.patient_number,
              cu.full_name AS doctor_name, cu.specialization
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       JOIN clinic_users cu ON cu.id = a.doctor_id
       WHERE a.clinic_id = $1 AND a.appointment_date >= $2
         AND a.status NOT IN ('Cancelled','No Show')
       ORDER BY a.appointment_date ASC, a.time_slot ASC
       LIMIT 10`,
      [cid, today]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** GET /api/dashboard/monthly-chart */
const getMonthlyChart = async (req, res) => {
  try {
    const cid = req.user.clinic_id;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const [apptData, revenueData] = await Promise.all([
      query(
        `SELECT EXTRACT(YEAR FROM appointment_date) AS year,
                EXTRACT(MONTH FROM appointment_date) AS month,
                COUNT(*) AS count
         FROM appointments WHERE clinic_id=$1 AND appointment_date >= $2
         GROUP BY year, month ORDER BY year, month`,
        [cid, sixMonthsAgo.toISOString().split('T')[0]]
      ),
      query(
        `SELECT EXTRACT(YEAR FROM paid_at) AS year,
                EXTRACT(MONTH FROM paid_at) AS month,
                SUM(total_amount) AS revenue
         FROM invoices WHERE clinic_id=$1 AND payment_status='Paid' AND paid_at >= $2
         GROUP BY year, month ORDER BY year, month`,
        [cid, sixMonthsAgo.toISOString()]
      ),
    ]);

    res.json({ appointments: apptData.rows, revenue: revenueData.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** GET /api/dashboard/activity-timeline */
const getActivityTimeline = async (req, res) => {
  try {
    const cid = req.user.clinic_id;
    const { rows } = await query(
      `(SELECT 'appointment' AS type, appointment_number AS ref, 'New appointment' AS action, created_at FROM appointments WHERE clinic_id=$1)
       UNION ALL
       (SELECT 'patient' AS type, patient_number AS ref, 'New patient registered' AS action, created_at FROM patients WHERE clinic_id=$1)
       UNION ALL
       (SELECT 'invoice' AS type, invoice_number AS ref, 'Invoice created' AS action, created_at FROM invoices WHERE clinic_id=$1)
       ORDER BY created_at DESC LIMIT 20`,
      [cid]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getStats, getRecentAppointments, getMonthlyChart, getActivityTimeline };
