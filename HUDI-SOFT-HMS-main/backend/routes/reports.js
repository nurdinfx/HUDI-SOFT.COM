const express = require('express');
const db = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Revenue report
router.get('/revenue', async (req, res) => {
    const { period } = req.query; // 'daily', 'monthly', 'yearly'
    const tenantId = req.tenantId;
    let groupBy = "date::text";
    if (period === 'monthly') groupBy = "LEFT(date::text, 7)";
    if (period === 'yearly') groupBy = "LEFT(date::text, 4)";

    try {
        const data = await db.prepare(`
            SELECT ${groupBy} as period, SUM(paid_amount) as revenue, SUM(total) as billed, COUNT(*) as invoices 
            FROM invoices 
            WHERE tenant_id = ?
            GROUP BY ${groupBy} 
            ORDER BY ${groupBy} DESC 
            LIMIT 30
        `).all(tenantId);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Advanced Financial Report (Profit & Loss, Dept Breakdown)
router.get('/financial', async (req, res) => {
    const tenantId = req.tenantId;
    try {
        const incomeByDept = await db.prepare(`
            SELECT department, SUM(amount) as amount 
            FROM account_entries 
            WHERE type = 'income' AND tenant_id = ?
            GROUP BY department
        `).all(tenantId);

        const expenseByCategory = await db.prepare(`
            SELECT category, SUM(amount) as amount 
            FROM account_entries 
            WHERE type = 'expense' AND tenant_id = ?
            GROUP BY category
        `).all(tenantId);

        const monthlyTrend = await db.prepare(`
            SELECT 
                LEFT(date::text, 7) as month,
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
            FROM account_entries
            WHERE tenant_id = ?
            GROUP BY LEFT(date::text, 7)
            ORDER BY LEFT(date::text, 7) DESC
            LIMIT 12
        `).all(tenantId);

        res.json({
            incomeByDept,
            expenseByCategory,
            monthlyTrend: monthlyTrend.reverse()
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Patient statistics
router.get('/patients', async (req, res) => {
    const tenantId = req.tenantId;
    try {
        const byGender = await db.prepare('SELECT gender, COUNT(*) as count FROM patients WHERE tenant_id = ? GROUP BY gender').all(tenantId);
        const byStatus = await db.prepare('SELECT status, COUNT(*) as count FROM patients WHERE tenant_id = ? GROUP BY status').all(tenantId);
        const byBloodGroup = await db.prepare('SELECT blood_group, COUNT(*) as count FROM patients WHERE tenant_id = ? AND blood_group IS NOT NULL GROUP BY blood_group').all(tenantId);
        const newThisMonth = await db.prepare("SELECT COUNT(*) as c FROM patients WHERE tenant_id = ? AND LEFT(registered_at::text, 7) = LEFT(CURRENT_DATE::text, 7)").get(tenantId);
        res.json({ byGender, byStatus, byBloodGroup, newThisMonth: newThisMonth?.c || 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Appointment statistics
router.get('/appointments', async (req, res) => {
    const tenantId = req.tenantId;
    try {
        const byType = await db.prepare('SELECT type, COUNT(*) as count FROM appointments WHERE tenant_id = ? GROUP BY type').all(tenantId);
        const byStatus = await db.prepare('SELECT status, COUNT(*) as count FROM appointments WHERE tenant_id = ? GROUP BY status').all(tenantId);
        const byDepartment = await db.prepare('SELECT department, COUNT(*) as count FROM appointments WHERE tenant_id = ? GROUP BY department ORDER BY count DESC').all(tenantId);
        const byMonth = await db.prepare("SELECT LEFT(date::text, 7) as month, COUNT(*) as count FROM appointments WHERE tenant_id = ? GROUP BY LEFT(date::text, 7) ORDER BY LEFT(date::text, 7) DESC LIMIT 12").all(tenantId);
        res.json({ byType, byStatus, byDepartment, byMonth });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Lab statistics
router.get('/laboratory', async (req, res) => {
    const tenantId = req.tenantId;
    try {
        const byCategory = await db.prepare('SELECT test_category, COUNT(*) as count FROM lab_tests WHERE tenant_id = ? GROUP BY test_category ORDER BY count DESC').all(tenantId);
        const byStatus = await db.prepare('SELECT status, COUNT(*) as count FROM lab_tests WHERE tenant_id = ? GROUP BY status').all(tenantId);
        const byPriority = await db.prepare('SELECT priority, COUNT(*) as count FROM lab_tests WHERE tenant_id = ? GROUP BY priority').all(tenantId);
        const stats = await db.prepare("SELECT SUM(amount) as total FROM account_entries WHERE department = 'Laboratory' AND type = 'income' AND tenant_id = ?").get(tenantId);
        res.json({ byCategory, byStatus, byPriority, totalRevenue: stats?.total || 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Pharmacy statistics
router.get('/pharmacy', async (req, res) => {
    const tenantId = req.tenantId;
    try {
        const byCategory = await db.prepare('SELECT category, COUNT(*) as count FROM medicines WHERE tenant_id = ? GROUP BY category').all(tenantId);
        const byStatus = await db.prepare('SELECT status, COUNT(*) as count FROM medicines WHERE tenant_id = ? GROUP BY status').all(tenantId);
        const lowStock = await db.prepare("SELECT COUNT(*) as count FROM medicines WHERE tenant_id = ? AND status IN ('low-stock','out-of-stock')").get(tenantId);
        const expiringSoon = await db.prepare("SELECT COUNT(*) as count FROM medicines WHERE tenant_id = ? AND expiry_date <= CURRENT_DATE + INTERVAL '90 days' AND expiry_date >= CURRENT_DATE").get(tenantId);
        const sales = await db.prepare("SELECT SUM(amount) as total FROM account_entries WHERE department = 'Pharmacy' AND type = 'income' AND tenant_id = ?").get(tenantId);
        res.json({ byCategory, byStatus, lowStock: lowStock?.count || 0, expiringSoon: expiringSoon?.count || 0, totalSales: sales?.total || 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
