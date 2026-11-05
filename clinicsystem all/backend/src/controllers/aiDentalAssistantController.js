// backend/src/controllers/aiDentalAssistantController.js
const { query } = require('../db/pool');

/**
 * HUDI DENTAL CARE — AI Practice Operations Assistant
 * Data-First, zero-hallucination analysis of real PostgreSQL practice records
 */

/** POST /api/dental-ai/query */
const queryDentalAssistant = async (req, res) => {
  const { query: userPrompt } = req.body;
  if (!userPrompt || !userPrompt.trim()) {
    return res.status(400).json({ message: 'Query prompt is required' });
  }

  const clinicId = req.user.clinic_id;
  const promptLower = userPrompt.toLowerCase();

  try {
    // 1. Fetch live practice operational snapshot for this tenant
    const [
      patientStats,
      appointmentStats,
      revenueStats,
      treatmentStats,
      lowStockMedications,
      pendingLabOrders
    ] = await Promise.all([
      // Patients
      query(
        `SELECT
          COUNT(*) AS total_patients,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS new_this_month
         FROM patients WHERE clinic_id = $1`,
        [clinicId]
      ),
      // Appointments
      query(
        `SELECT
          COUNT(*) AS total_appointments,
          COUNT(*) FILTER (WHERE appointment_date = CURRENT_DATE) AS today_appointments,
          COUNT(*) FILTER (WHERE status = 'Completed') AS completed_appointments,
          COUNT(*) FILTER (WHERE status = 'Cancelled') AS cancelled_appointments
         FROM appointments WHERE clinic_id = $1`,
        [clinicId]
      ),
      // Invoices / Revenue
      query(
        `SELECT
          COALESCE(SUM(total_amount), 0) AS total_billed,
          COALESCE(SUM(paid_amount), 0) AS total_revenue,
          COALESCE(SUM(balance_due), 0) AS outstanding_balances,
          COALESCE(SUM(CASE WHEN created_at >= CURRENT_DATE THEN paid_amount ELSE 0 END), 0) AS today_revenue
         FROM invoices WHERE clinic_id = $1`,
        [clinicId]
      ),
      // Top Dental Treatments
      query(
        `SELECT treatment_name, COUNT(*) as procedure_count, COALESCE(SUM(estimated_cost), 0) as total_value
         FROM treatment_plan_items tpi
         JOIN treatment_plans tp ON tp.id = tpi.treatment_plan_id
         WHERE tp.clinic_id = $1
         GROUP BY treatment_name
         ORDER BY procedure_count DESC LIMIT 5`,
        [clinicId]
      ),
      // Low inventory
      query(
        `SELECT name, stock_quantity, reorder_level FROM medications
         WHERE clinic_id = $1 AND stock_quantity <= reorder_level LIMIT 5`,
        [clinicId]
      ),
      // Lab orders
      query(
        `SELECT COUNT(*) AS pending_count FROM dental_lab_orders
         WHERE clinic_id = $1 AND status != 'Delivered' AND status != 'Rejected'`,
        [clinicId]
      )
    ]);

    const p = patientStats.rows[0] || {};
    const a = appointmentStats.rows[0] || {};
    const r = revenueStats.rows[0] || {};
    const topTreatments = treatmentStats.rows || [];
    const lowSupplies = lowStockMedications.rows || [];
    const pendingLabs = pendingLabOrders.rows[0]?.pending_count || 0;

    // Build intelligent conversational insight based on verified clinic DB data
    let answer = '';
    let category = 'general';

    if (promptLower.includes('revenue') || promptLower.includes('money') || promptLower.includes('income') || promptLower.includes('financial')) {
      category = 'finance';
      answer = `### 📊 Financial & Revenue Summary:\n` +
        `- **Total Lifetime Collected Revenue:** $${Number(r.total_revenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}\n` +
        `- **Today's Revenue:** $${Number(r.today_revenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}\n` +
        `- **Outstanding Patient Balances:** $${Number(r.outstanding_balances).toLocaleString('en-US', { minimumFractionDigits: 2 })}\n` +
        `- **Total Billed Invoices:** $${Number(r.total_billed).toLocaleString('en-US', { minimumFractionDigits: 2 })}\n\n` +
        `💡 *Recommendation:* You have $${Number(r.outstanding_balances).toLocaleString('en-US', { minimumFractionDigits: 2 })} in pending patient accounts. Sending automatic SMS/WhatsApp reminders for unpaid balances can improve immediate cash flow.`;

    } else if (promptLower.includes('patient') || promptLower.includes('registration')) {
      category = 'patients';
      answer = `### 👥 Patient Activity Summary:\n` +
        `- **Total Registered Patients:** ${p.total_patients || 0}\n` +
        `- **New Patients This Month:** ${p.new_this_month || 0}\n` +
        `- **Appointment Completion Rate:** ${a.total_appointments > 0 ? Math.round((a.completed_appointments / a.total_appointments) * 100) : 0}%\n\n` +
        `💡 *Insight:* Your patient roster is actively growing with ${p.new_this_month || 0} registrations over the past 30 days.`;

    } else if (promptLower.includes('appointment') || promptLower.includes('schedule') || promptLower.includes('booking')) {
      category = 'appointments';
      answer = `### 🗓️ Appointment & Chair Occupancy:\n` +
        `- **Appointments Scheduled Today:** ${a.today_appointments || 0}\n` +
        `- **Total Historical Completed:** ${a.completed_appointments || 0}\n` +
        `- **Cancellations / No-Shows:** ${a.cancelled_appointments || 0}\n\n` +
        `💡 *Clinical Tip:* To minimize missed chairs, confirm scheduled appointments 24 hours prior via the portal or automated notifications.`;

    } else if (promptLower.includes('treatment') || promptLower.includes('procedure') || promptLower.includes('odontogram')) {
      category = 'clinical';
      const topList = topTreatments.length > 0 
        ? topTreatments.map((t, idx) => `${idx + 1}. **${t.treatment_name}** — ${t.procedure_count} planned/done ($${Number(t.total_value).toFixed(2)})`).join('\n')
        : 'No procedure trends recorded yet.';
      answer = `### 🦷 Top Clinical Procedures:\n${topList}\n\n` +
        `- **Pending Dental Lab Units:** ${pendingLabs} order(s) currently at external laboratories.`;

    } else if (promptLower.includes('stock') || promptLower.includes('supply') || promptLower.includes('inventory')) {
      category = 'inventory';
      const lowList = lowSupplies.length > 0
        ? lowSupplies.map(s => `- **${s.name}**: ${s.stock_quantity} remaining (Min threshold: ${s.reorder_level})`).join('\n')
        : 'All medical supplies and dental materials are currently within safe stock levels.';
      answer = `### 📦 Dental Materials & Inventory Status:\n${lowList}\n\n` +
        (lowSupplies.length > 0 ? `⚠️ *Action Required:* Please order replacement materials for low-stock items to prevent clinical delays.` : `✅ All supplies are well stocked.`);

    } else {
      // Comprehensive Executive Overview
      answer = `### 🏥 HUDI DENTAL CARE Practice Snapshot:\n` +
        `- **Active Patient Base:** ${p.total_patients || 0} patients (${p.new_this_month || 0} registered this month)\n` +
        `- **Revenue Collected:** $${Number(r.total_revenue).toLocaleString('en-US', { minimumFractionDigits: 2 })} (Outstanding balance: $${Number(r.outstanding_balances).toLocaleString('en-US', { minimumFractionDigits: 2 })})\n` +
        `- **Appointments:** ${a.today_appointments || 0} scheduled today (${a.completed_appointments || 0} completed historically)\n` +
        `- **Active Dental Lab Orders:** ${pendingLabs} order(s) in progress\n` +
        `- **Low Stock Items:** ${lowSupplies.length} item(s) below reorder threshold\n\n` +
        `How else can I assist your dental practice today? You can ask about revenue trends, chair scheduling, treatment performance, or inventory replenishment.`;
    }

    res.json({
      success: true,
      data: {
        query: userPrompt,
        category,
        answer,
        timestamp: new Date().toISOString()
      }
    });

  } catch (err) {
    console.error('[AI Dental Assistant] Error:', err);
    res.status(500).json({ message: 'Failed to process clinical intelligence query.', error: err.message });
  }
};

module.exports = { queryDentalAssistant };

