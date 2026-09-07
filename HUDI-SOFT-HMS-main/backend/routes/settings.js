const express = require('express');
const db = require('../database');
const { authenticate, logAction, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const fmt = (s = {}) => ({
    name: s?.name || 'Hospital', 
    tagline: s?.tagline || '', 
    address: s?.address || '', 
    phone: s?.phone || '', 
    email: s?.email || '', 
    website: s?.website || '', 
    currency: s?.currency || 'USD', 
    taxRate: s?.tax_rate ?? 10, 
    logo: s?.logo || null,
    zaad: s?.zaad || '',
    sahal: s?.sahal || '',
    edahab: s?.edahab || '',
    mycash: s?.mycash || '',
    pharmacy_zaad: s?.pharmacy_zaad || '',
    pharmacy_sahal: s?.pharmacy_sahal || '',
    pharmacy_edahab: s?.pharmacy_edahab || '',
    pharmacy_mycash: s?.pharmacy_mycash || ''
});

router.get('/', async (req, res) => {
    try {
        const tenantId = req.tenantId;
        let row = await db.prepare('SELECT * FROM hospital_settings WHERE tenant_id = ?').get(tenantId);
        if (!row) {
            // Fallback: check if id=1 exists or create default for this tenant
            const baseRow = await db.prepare('SELECT * FROM hospital_settings WHERE id = 1').get();
            let hospitalName = 'Hospital';
            try {
                const licRow = await db.query('SELECT hospital_name FROM license_info WHERE tenant_id = $1 LIMIT 1', [tenantId]);
                hospitalName = licRow.rows[0]?.hospital_name || baseRow?.name || 'Hospital';
            } catch(e) {
                hospitalName = baseRow?.name || 'Hospital';
            }

            try {
                const maxIdRes = await db.query('SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM hospital_settings');
                const nextId = parseInt(maxIdRes.rows[0]?.next_id || 1);

                await db.prepare(`
                    INSERT INTO hospital_settings (id, name, tagline, address, phone, email, website, currency, tax_rate, logo, zaad, sahal, edahab, mycash, pharmacy_zaad, pharmacy_sahal, pharmacy_edahab, pharmacy_mycash, tenant_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    nextId,
                    hospitalName, baseRow?.tagline || '', baseRow?.address || '', baseRow?.phone || '', baseRow?.email || '',
                    baseRow?.website || '', baseRow?.currency || 'USD', baseRow?.tax_rate || 10, baseRow?.logo || null,
                    baseRow?.zaad || '', baseRow?.sahal || '', baseRow?.edahab || '', baseRow?.mycash || '',
                    baseRow?.pharmacy_zaad || '', baseRow?.pharmacy_sahal || '', baseRow?.pharmacy_edahab || '', baseRow?.pharmacy_mycash || '',
                    tenantId
                );
            } catch(insErr) {
                console.warn('⚠️ hospital_settings insert warning:', insErr.message);
            }
            row = await db.prepare('SELECT * FROM hospital_settings WHERE tenant_id = ?').get(tenantId);
        }
        res.json(fmt(row || { name: 'Hospital', currency: 'USD', tax_rate: 10 }));
    } catch (err) {
        console.error('Settings GET error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

router.put('/', async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const tenantId = req.tenantId;
    try {
        const existing = await db.prepare('SELECT * FROM hospital_settings WHERE tenant_id = ?').get(tenantId);
        const { name, tagline, address, phone, email, website, currency, taxRate, logo, zaad, sahal, edahab, mycash, pharmacy_zaad, pharmacy_sahal, pharmacy_edahab, pharmacy_mycash } = req.body;
        if (!existing) {
            const maxIdRes = await db.query('SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM hospital_settings');
            const nextId = parseInt(maxIdRes.rows[0]?.next_id || 1);
            await db.prepare('INSERT INTO hospital_settings (id, name, tagline, address, phone, email, website, currency, tax_rate, logo, zaad, sahal, edahab, mycash, pharmacy_zaad, pharmacy_sahal, pharmacy_edahab, pharmacy_mycash, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                .run(nextId, name || 'Hospital', tagline || '', address || '', phone || '', email || '', website || '', currency || 'USD', taxRate || 10, logo || null, zaad || '', sahal || '', edahab || '', mycash || '', pharmacy_zaad || '', pharmacy_sahal || '', pharmacy_edahab || '', pharmacy_mycash || '', tenantId);
        } else {
            await db.prepare('UPDATE hospital_settings SET name=?, tagline=?, address=?, phone=?, email=?, website=?, currency=?, tax_rate=?, logo=?, zaad=?, sahal=?, edahab=?, mycash=?, pharmacy_zaad=?, pharmacy_sahal=?, pharmacy_edahab=?, pharmacy_mycash=? WHERE tenant_id=?')
                .run(name || existing.name, tagline ?? existing.tagline, address || existing.address, phone || existing.phone, email || existing.email, website ?? existing.website, currency || existing.currency, taxRate ?? existing.tax_rate, logo ?? existing.logo, zaad ?? existing.zaad, sahal ?? existing.sahal, edahab ?? existing.edahab, mycash ?? existing.mycash, pharmacy_zaad ?? existing.pharmacy_zaad, pharmacy_sahal ?? existing.pharmacy_sahal, pharmacy_edahab ?? existing.pharmacy_edahab, pharmacy_mycash ?? existing.pharmacy_mycash, tenantId);
        }
        logAction(req.user.id, req.user.name, req.user.role, 'UPDATE', 'Settings', 'Hospital settings updated', req.ip);
        const updatedRow = await db.prepare('SELECT * FROM hospital_settings WHERE tenant_id = ?').get(tenantId);
        res.json(fmt(updatedRow));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── ADMIN: Reset all financial/transactional data ──────────────
// Clears: invoices, account_entries, pharmacy transactions, purchase orders,
//         batches, daily_operations, manual_daily_revenue, insurance_claims
// Preserves: patients, doctors, medicines, lab catalog, inventory, users, settings
router.delete('/admin/reset-financial', async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const tenantId = req.tenantId;

    const tables = [
        'insurance_claims',
        'daily_operations',
        'account_entries',
        'manual_daily_revenue',
        'pharmacy_returns',
        'pharmacy_transaction_items',
        'pharmacy_transactions',
        'pharmacy_purchase_items',
        'pharmacy_supplier_returns',
        'pharmacy_batches',
        'pharmacy_purchase_orders',
        'credit_transactions',
        'credit_ledger',
        'employee_ledger',
        'employee_expenses',
        'employee_payroll',
        'procedures',
        'invoices',
    ];

    try {
        await db.exec('BEGIN');

        for (const table of tables) {
            try {
                await db.query(`DELETE FROM ${table} WHERE tenant_id = $1`, [tenantId]);
            } catch (e) {
                // table may not exist or error — skip silently
                console.warn(`⚠️  Could not clear ${table}: ${e.message}`);
            }
        }

        // Reset balances on master tables for this tenant only
        try { await db.query("UPDATE credit_customers SET outstanding_balance = 0, total_credit_taken = 0, total_payments_made = 0 WHERE tenant_id = $1", [tenantId]); } catch(e){}
        try { await db.query("UPDATE employees SET outstanding_balance = 0 WHERE tenant_id = $1", [tenantId]); } catch(e){}
        try { await db.query("UPDATE department_budgets SET budget_amount = 0 WHERE tenant_id = $1", [tenantId]); } catch(e){}
        try { await db.query("UPDATE patient_credits SET balance = 0 WHERE tenant_id = $1", [tenantId]); } catch(e){}
        // Reset medicine quantities back (set status to in-stock only if qty > 0)
        try { await db.query("UPDATE medicines SET status = CASE WHEN quantity = 0 THEN 'out-of-stock' WHEN quantity <= reorder_level THEN 'low-stock' ELSE 'in-stock' END WHERE tenant_id = $1", [tenantId]); } catch(e){}

        await db.exec('COMMIT');

        logAction(req.user.id, req.user.name, req.user.role, 'DELETE', 'Settings', 'ADMIN: Full financial data reset performed', req.ip);

        res.json({
            success: true,
            message: 'All financial and transactional data cleared for your hospital. Patients, medicines, inventory, and users are preserved.'
        });
    } catch (err) {
        try { await db.exec('ROLLBACK'); } catch(e) {}
        console.error('❌ Financial reset error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
