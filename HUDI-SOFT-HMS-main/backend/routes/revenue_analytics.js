const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

async function getLiveRevenueRows({ startDate, endDate, source, tenantId }) {
    const normalizedSource = String(source || 'ALL').toUpperCase();
    const includePharmacy = normalizedSource === 'ALL' || normalizedSource === 'PHARMACY';
    const includePos = normalizedSource === 'ALL' || normalizedSource === 'POS';
    const rows = [];

    if (includePharmacy) {
        let pharmacyQuery = `
            SELECT
                id,
                invoice_id,
                patient_name,
                COALESCE(subtotal_amount, total_amount) AS subtotal_amount,
                COALESCE(discount_amount, 0) AS discount_amount,
                total_amount,
                paid_amount,
                credit_amount,
                payment_method,
                status,
                created_at AS transaction_date
            FROM pharmacy_transactions
            WHERE tenant_id = ?
        `;
        const pharmacyParams = [tenantId];
        if (startDate) {
            pharmacyQuery += ' AND DATE(created_at) >= ?';
            pharmacyParams.push(startDate);
        }
        if (endDate) {
            pharmacyQuery += ' AND DATE(created_at) <= ?';
            pharmacyParams.push(endDate);
        }
        pharmacyQuery += ' ORDER BY created_at DESC';

        const pharmacyRows = await db.prepare(pharmacyQuery).all(...pharmacyParams);
        rows.push(...pharmacyRows.map(row => ({
            id: row.id,
            invoiceId: row.invoice_id,
            patientName: row.patient_name || 'Walk-In',
            source: 'Pharmacy',
            subtotalAmount: parseFloat(row.subtotal_amount) || parseFloat(row.total_amount) || 0,
            discountAmount: parseFloat(row.discount_amount) || 0,
            totalAmount: parseFloat(row.total_amount) || 0,
            paidAmount: parseFloat(row.paid_amount) || 0,
            outstandingAmount: parseFloat(row.credit_amount) || 0,
            paymentMethod: row.payment_method,
            status: row.status,
            date: row.transaction_date
        })));
    }

    if (includePos) {
        let posQuery = `
            SELECT
                id,
                invoice_id,
                patient_name,
                subtotal,
                discount,
                total,
                paid_amount,
                payment_method,
                status,
                date
            FROM invoices
            WHERE invoice_id LIKE 'INV-POS-%' AND tenant_id = ?
        `;
        const posParams = [tenantId];
        if (startDate) {
            posQuery += ' AND date >= ?';
            posParams.push(startDate);
        }
        if (endDate) {
            posQuery += ' AND date <= ?';
            posParams.push(endDate);
        }
        posQuery += ' ORDER BY date DESC, created_at DESC';

        const posRows = await db.prepare(posQuery).all(...posParams);
        rows.push(...posRows.map(row => {
            const totalAmount = parseFloat(row.total) || 0;
            const paidAmount = parseFloat(row.paid_amount) || 0;
            return {
                id: row.id,
                invoiceId: row.invoice_id,
                patientName: row.patient_name || 'Walk-In',
                source: 'Reception POS',
                subtotalAmount: parseFloat(row.subtotal) || totalAmount,
                discountAmount: parseFloat(row.discount) || 0,
                totalAmount,
                paidAmount,
                outstandingAmount: Math.max(0, totalAmount - paidAmount),
                paymentMethod: row.payment_method,
                status: row.status,
                date: row.date
            };
        }));
    }

    return rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function buildLiveRevenueSummary(rows) {
    const summary = {
        transactionCount: rows.length,
        totalRevenue: 0,
        totalDiscount: 0,
        totalPaid: 0,
        totalOutstanding: 0,
        bySource: {},
        byMethod: {}
    };

    rows.forEach((row) => {
        summary.totalRevenue += row.totalAmount || 0;
        summary.totalDiscount += row.discountAmount || 0;
        summary.totalPaid += row.paidAmount || 0;
        summary.totalOutstanding += row.outstandingAmount || 0;

        summary.bySource[row.source] = (summary.bySource[row.source] || 0) + (row.totalAmount || 0);
        const methodKey = (row.paymentMethod || 'OTHER').toUpperCase();
        summary.byMethod[methodKey] = (summary.byMethod[methodKey] || 0) + (row.paidAmount || 0);
    });

    return {
        transactionCount: summary.transactionCount,
        totalRevenue: parseFloat(summary.totalRevenue.toFixed(2)),
        totalDiscount: parseFloat(summary.totalDiscount.toFixed(2)),
        totalPaid: parseFloat(summary.totalPaid.toFixed(2)),
        totalOutstanding: parseFloat(summary.totalOutstanding.toFixed(2)),
        bySource: summary.bySource,
        byMethod: summary.byMethod
    };
}

// ─── DEPARTMENTS ─────────────────────────────────────────────────

// GET /api/revenue-analytics/departments
router.get('/departments', async (req, res) => {
    const tenantId = req.tenantId;
    try {
        const rows = await db.prepare('SELECT * FROM departments WHERE tenant_id = ? ORDER BY name ASC').all(tenantId);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/revenue-analytics/departments
router.post('/departments', authorize(['admin', 'receptionist']), async (req, res) => {
    const tenantId = req.tenantId;
    const { name, code } = req.body;
    if (!name) return res.status(400).json({ error: 'Department name is required' });

    try {
        const id = uuidv4();
        await db.prepare('INSERT INTO departments (id, name, code, tenant_id) VALUES (?, ?, ?, ?)').run(id, name, code || null, tenantId);
        const newDept = await db.prepare('SELECT * FROM departments WHERE id = ? AND tenant_id = ?').get(id, tenantId);
        res.status(201).json(newDept);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/revenue-analytics/departments/:id
router.put('/departments/:id', authorize(['admin', 'receptionist']), async (req, res) => {
    const tenantId = req.tenantId;
    const { name, code, is_active } = req.body;
    const { id } = req.params;
    if (!name) return res.status(400).json({ error: 'Department name is required' });

    try {
        await db.prepare('UPDATE departments SET name = ?, code = ?, is_active = COALESCE(?, is_active) WHERE id = ? AND tenant_id = ?').run(name, code || null, is_active !== undefined ? is_active : null, id, tenantId);
        const updatedDept = await db.prepare('SELECT * FROM departments WHERE id = ? AND tenant_id = ?').get(id, tenantId);
        res.json(updatedDept);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/revenue-analytics/departments/:id
router.delete('/departments/:id', authorize(['admin', 'receptionist']), async (req, res) => {
    const tenantId = req.tenantId;
    const { id } = req.params;
    try {
        await db.prepare('DELETE FROM departments WHERE id = ? AND tenant_id = ?').run(id, tenantId);
        res.json({ message: 'Department deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── SERVICE CATEGORIES ──────────────────────────────────────────

// GET /api/revenue-analytics/service-categories
router.get('/service-categories', async (req, res) => {
    const tenantId = req.tenantId;
    try {
        const rows = await db.prepare('SELECT * FROM service_categories WHERE tenant_id = ? ORDER BY name ASC').all(tenantId);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/revenue-analytics/service-categories
router.post('/service-categories', authorize(['admin', 'receptionist']), async (req, res) => {
    const tenantId = req.tenantId;
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });

    try {
        const id = uuidv4();
        await db.prepare('INSERT INTO service_categories (id, name, description, tenant_id) VALUES (?, ?, ?, ?)').run(id, name, description || null, tenantId);
        const newCat = await db.prepare('SELECT * FROM service_categories WHERE id = ? AND tenant_id = ?').get(id, tenantId);
        res.status(201).json(newCat);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/revenue-analytics/service-categories/:id
router.put('/service-categories/:id', authorize(['admin', 'receptionist']), async (req, res) => {
    const tenantId = req.tenantId;
    const { name, description, is_active } = req.body;
    const { id } = req.params;
    if (!name) return res.status(400).json({ error: 'Category name is required' });

    try {
        await db.prepare('UPDATE service_categories SET name = ?, description = ?, is_active = COALESCE(?, is_active) WHERE id = ? AND tenant_id = ?').run(name, description || null, is_active !== undefined ? is_active : null, id, tenantId);
        const updatedCat = await db.prepare('SELECT * FROM service_categories WHERE id = ? AND tenant_id = ?').get(id, tenantId);
        res.json(updatedCat);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/revenue-analytics/service-categories/:id
router.delete('/service-categories/:id', authorize(['admin', 'receptionist']), async (req, res) => {
    const tenantId = req.tenantId;
    const { id } = req.params;
    try {
        await db.prepare('DELETE FROM service_categories WHERE id = ? AND tenant_id = ?').run(id, tenantId);
        res.json({ message: 'Service category deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── REVENUE REPORT ──────────────────────────────────────────────

// GET /api/revenue-analytics/report
router.get('/report', async (req, res) => {
    const tenantId = req.tenantId;
    const { startDate, endDate } = req.query;
    
    try {
        // 1. Fetch all departments and service categories
        const departments = await db.prepare('SELECT name FROM departments WHERE is_active = 1 AND tenant_id = ? ORDER BY name ASC').all(tenantId);
        const categories = await db.prepare('SELECT name FROM service_categories WHERE is_active = 1 AND tenant_id = ? ORDER BY name ASC').all(tenantId);

        // 2. Fetch manual revenue data instead of calculated data
        let query = `
            SELECT department, category, amount as revenue
            FROM manual_daily_revenue
            WHERE tenant_id = ?
        `;
        const params = [tenantId];
        if (startDate) {
            query += ' AND date >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND date <= ?';
            params.push(endDate);
        }

        const rawData = await db.prepare(query).all(...params);

        // 3. Structure data for the frontend (Matrix)
        const report = departments.map(dept => {
            const row = { department: dept.name, totals: {} };
            let deptTotal = 0;

            categories.forEach(cat => {
                const matchs = rawData.filter(d => d.department === dept.name && d.category === cat.name);
                const val = matchs.reduce((sum, m) => sum + parseFloat(m.revenue), 0);
                row.totals[cat.name] = val;
                deptTotal += val;
            });

            row.rowTotal = deptTotal;
            return row;
        });

        // 4. Calculate Column Totals & Grand Total
        const columnTotals = {};
        let grandTotal = 0;
        categories.forEach(cat => {
            const total = report.reduce((sum, row) => sum + (row.totals[cat.name] || 0), 0);
            columnTotals[cat.name] = total;
            grandTotal += total;
        });

        // 5. System Values (Payment Methods, Daymaha, Expenses)
        let sysQuery = `SELECT department as key, SUM(amount) as value FROM manual_daily_revenue WHERE category = 'SYSTEM_VALUES' AND tenant_id = ?`;
        const sysParams = [tenantId];
        if (startDate) { sysQuery += ' AND date >= ?'; sysParams.push(startDate); }
        if (endDate) { sysQuery += ' AND date <= ?'; sysParams.push(endDate); }
        sysQuery += ' GROUP BY department';
        const systemValuesRaw = await db.prepare(sysQuery).all(...sysParams);
        
        const systemValues = {};
        systemValuesRaw.forEach(row => {
            systemValues[row.key] = parseFloat(row.value) || 0;
        });

        // Calculate legacy fields from systemValues just in case anything else uses them.
        const totalExpenses = parseFloat(systemValues['EXPENSES']) || 0;
        const autoNetIncome = grandTotal - totalExpenses;

        res.json({
            columns: categories.map(c => c.name),
            rows: report,
            columnTotals,
            grandTotal,
            paymentBreakdown: [], // Deprecated in favor of systemValues
            totalExpenses,
            netIncome: autoNetIncome,
            systemValues
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/revenue-analytics/live-report
router.get('/live-report', async (req, res) => {
    const tenantId = req.tenantId;
    const { startDate, endDate, source } = req.query;

    try {
        const rows = await getLiveRevenueRows({ startDate, endDate, source, tenantId });
        res.json({
            summary: buildLiveRevenueSummary(rows),
            rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/revenue-analytics/discounts
router.get('/discounts', async (req, res) => {
    const tenantId = req.tenantId;
    const { startDate, endDate, source } = req.query;

    try {
        const rows = (await getLiveRevenueRows({ startDate, endDate, source, tenantId }))
            .filter(row => (row.discountAmount || 0) > 0);

        res.json({
            summary: buildLiveRevenueSummary(rows),
            rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/revenue-analytics/report/cell
router.post('/report/cell', authorize(['admin', 'receptionist']), async (req, res) => {
    const tenantId = req.tenantId;
    const { date, department, category, amount } = req.body;
    if (!date || !department || !category) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        const id = uuidv4();
        await db.prepare('DELETE FROM manual_daily_revenue WHERE date = ? AND department = ? AND category = ? AND tenant_id = ?')
            .run(date, department, category, tenantId);
        
        if (amount !== undefined && amount !== null && amount !== '') {
            await db.prepare(`
                INSERT INTO manual_daily_revenue (id, date, department, category, amount, tenant_id)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(id, date, department, category, parseFloat(amount) || 0, tenantId);
        }
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
