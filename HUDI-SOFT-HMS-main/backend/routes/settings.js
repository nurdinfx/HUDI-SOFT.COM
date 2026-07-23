const express = require('express');
const db = require('../database');
const { authenticate, logAction } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const fmt = (s) => ({
    name: s.name,
    tagline: s.tagline,
    address: s.address,
    phone: s.phone,
    email: s.email,
    website: s.website,
    currency: s.currency,
    taxRate: s.tax_rate,
    logo: s.logo,
    zaad: s.zaad,
    sahal: s.sahal,
    edahab: s.edahab,
    mycash: s.mycash,
    pharmacy_zaad: s.pharmacy_zaad,
    pharmacy_sahal: s.pharmacy_sahal,
    pharmacy_edahab: s.pharmacy_edahab,
    pharmacy_mycash: s.pharmacy_mycash
});

// GET /api/settings — TENANT-SCOPED: each hospital sees only its own settings
router.get('/', async (req, res) => {
    const tenantId = req.user.tenant_id;
    try {
        // Look up settings for THIS hospital's tenant
        const result = await db.queryBypassRLS(
            'SELECT * FROM hospital_settings WHERE tenant_id = $1 LIMIT 1',
            [tenantId]
        );
        const row = result.rows[0];
        if (!row) {
            // Auto-create default settings for this tenant if none exist
            await db.queryBypassRLS(
                `INSERT INTO hospital_settings (tenant_id, name, tagline, currency, tax_rate)
                 VALUES ($1, 'My Hospital', 'Care with Excellence', 'USD', 10)
                 ON CONFLICT (tenant_id) DO NOTHING`,
                [tenantId]
            );
            const newResult = await db.queryBypassRLS(
                'SELECT * FROM hospital_settings WHERE tenant_id = $1 LIMIT 1',
                [tenantId]
            );
            return res.json(fmt(newResult.rows[0] || { name: 'My Hospital', currency: 'USD', tax_rate: 10 }));
        }
        res.json(fmt(row));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/settings — TENANT-SCOPED update
router.put('/', async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const tenantId = req.user.tenant_id;
    try {
        const existingRes = await db.queryBypassRLS(
            'SELECT * FROM hospital_settings WHERE tenant_id = $1 LIMIT 1',
            [tenantId]
        );
        const existing = existingRes.rows[0];
        const {
            name, tagline, address, phone, email, website, currency, taxRate, logo,
            zaad, sahal, edahab, mycash,
            pharmacy_zaad, pharmacy_sahal, pharmacy_edahab, pharmacy_mycash
        } = req.body;

        if (!existing) {
            // INSERT new settings row for this tenant
            await db.queryBypassRLS(
                `INSERT INTO hospital_settings
                    (tenant_id, name, tagline, address, phone, email, website, currency, tax_rate, logo,
                     zaad, sahal, edahab, mycash, pharmacy_zaad, pharmacy_sahal, pharmacy_edahab, pharmacy_mycash)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
                 ON CONFLICT (tenant_id) DO NOTHING`,
                [tenantId, name || 'Hospital', tagline || '', address || '', phone || '',
                 email || '', website || '', currency || 'USD', taxRate || 10, logo || null,
                 zaad || '', sahal || '', edahab || '', mycash || '',
                 pharmacy_zaad || '', pharmacy_sahal || '', pharmacy_edahab || '', pharmacy_mycash || '']
            );
        } else {
            // UPDATE only this tenant's row — WHERE tenant_id prevents cross-tenant writes
            await db.queryBypassRLS(
                `UPDATE hospital_settings SET
                    name=$2, tagline=$3, address=$4, phone=$5, email=$6, website=$7,
                    currency=$8, tax_rate=$9, logo=$10,
                    zaad=$11, sahal=$12, edahab=$13, mycash=$14,
                    pharmacy_zaad=$15, pharmacy_sahal=$16, pharmacy_edahab=$17, pharmacy_mycash=$18
                 WHERE tenant_id=$1`,
                [tenantId,
                 name || existing.name, tagline ?? existing.tagline, address || existing.address,
                 phone || existing.phone, email || existing.email, website ?? existing.website,
                 currency || existing.currency, taxRate ?? existing.tax_rate, logo ?? existing.logo,
                 zaad ?? existing.zaad, sahal ?? existing.sahal, edahab ?? existing.edahab, mycash ?? existing.mycash,
                 pharmacy_zaad ?? existing.pharmacy_zaad, pharmacy_sahal ?? existing.pharmacy_sahal,
                 pharmacy_edahab ?? existing.pharmacy_edahab, pharmacy_mycash ?? existing.pharmacy_mycash]
            );
        }

        logAction(req.user.id, req.user.name, req.user.role, 'UPDATE', 'Settings', 'Hospital settings updated', req.ip);

        const updatedRes = await db.queryBypassRLS(
            'SELECT * FROM hospital_settings WHERE tenant_id = $1 LIMIT 1',
            [tenantId]
        );
        res.json(fmt(updatedRes.rows[0]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── DELETE /api/settings/clear-transactions ─────────────────────────────────
// Admin only — clears ONLY this tenant's transactions & revenue data
router.delete('/clear-transactions', async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin only' });
    }

    const tenantId = req.user.tenant_id;

    // Only these tables are cleared — ALWAYS filtered by tenant_id
    const tables = [
        'pharmacy_transaction_items',
        'pharmacy_transactions',
        'pharmacy_returns',
        'invoices',
        'account_entries',
        'manual_daily_revenue',
        'daily_operations',
        'insurance_claims',
        'credit_payments',
        'credit_ledger',
        'credit_transactions',
        'procedures',
        'prescriptions',
        'audit_logs',
    ];

    const results = [];
    let totalRows = 0;

    for (const table of tables) {
        try {
            // TENANT-SCOPED delete — only deletes THIS hospital's data
            const result = await db.queryBypassRLS(`DELETE FROM ${table} WHERE tenant_id = $1`, [tenantId]);
            const rows = result.rowCount || 0;
            totalRows += rows;
            results.push({ table, rows, status: 'cleared' });
        } catch (err) {
            results.push({ table, rows: 0, status: 'skipped', reason: err.message });
        }
    }

    logAction(req.user.id, req.user.name, req.user.role, 'DELETE', 'Transactions',
        `Cleared all transactions for tenant ${tenantId.substring(0,8)} (${totalRows} rows)`, req.ip);

    res.json({
        success: true,
        message: `All transactions and revenue data cleared successfully (${totalRows} rows deleted)`,
        totalRows,
        results
    });
});

module.exports = router;
