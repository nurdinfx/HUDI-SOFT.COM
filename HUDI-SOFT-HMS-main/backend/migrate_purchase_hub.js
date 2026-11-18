const db = require('./database');
const { v4: uuidv4 } = require('uuid');

async function migratePurchaseHub() {
    console.log('🚀 Starting Pharmacy Purchase Hub Migration...');
    try {
        // 1. Suppliers
        await db.query(`
            CREATE TABLE IF NOT EXISTS pharmacy_suppliers (
                id UUID PRIMARY KEY,
                name TEXT NOT NULL,
                contact_person TEXT,
                phone TEXT,
                email TEXT,
                address TEXT,
                tenant_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        try {
            await db.query(`ALTER TABLE pharmacy_suppliers ADD COLUMN IF NOT EXISTS tenant_id TEXT`);
        } catch (e) {}

        // 2. Purchase Orders
        await db.query(`
            CREATE TABLE IF NOT EXISTS pharmacy_purchase_orders (
                id UUID PRIMARY KEY,
                po_number TEXT NOT NULL,
                supplier_id UUID REFERENCES pharmacy_suppliers(id),
                order_date DATE DEFAULT CURRENT_DATE,
                total_amount DECIMAL(15,2) DEFAULT 0,
                status TEXT DEFAULT 'pending', -- pending, received, cancelled
                payment_type TEXT DEFAULT 'cash', -- cash, loan
                notes TEXT,
                created_by TEXT,
                tenant_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        try {
            await db.query(`ALTER TABLE pharmacy_purchase_orders ADD COLUMN IF NOT EXISTS tenant_id TEXT`);
            await db.query(`ALTER TABLE pharmacy_purchase_orders ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'cash'`);
            // Drop global unique constraint on po_number if present so multi-tenants don't collide
            await db.query(`ALTER TABLE pharmacy_purchase_orders DROP CONSTRAINT IF EXISTS pharmacy_purchase_orders_po_number_key`);
            // Create per-tenant unique index on (tenant_id, po_number)
            await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_pharmacy_po_tenant ON pharmacy_purchase_orders(tenant_id, po_number)`);
        } catch (e) {}

        // 3. Purchase Items
        await db.query(`
            CREATE TABLE IF NOT EXISTS pharmacy_purchase_items (
                id UUID PRIMARY KEY,
                po_id UUID REFERENCES pharmacy_purchase_orders(id) ON DELETE CASCADE,
                medicine_id UUID REFERENCES medicines(id),
                medicine_name TEXT,
                quantity INTEGER NOT NULL,
                unit_price DECIMAL(15,2) NOT NULL,
                total_price DECIMAL(15,2) NOT NULL,
                tenant_id TEXT
            )
        `);
        try {
            await db.query(`ALTER TABLE pharmacy_purchase_items ADD COLUMN IF NOT EXISTS tenant_id TEXT`);
        } catch (e) {}

        // 4. Batches (Inventory tracking)
        await db.query(`
            CREATE TABLE IF NOT EXISTS pharmacy_batches (
                id UUID PRIMARY KEY,
                medicine_id UUID REFERENCES medicines(id),
                batch_number TEXT NOT NULL,
                quantity_received INTEGER NOT NULL,
                quantity_remaining INTEGER NOT NULL,
                expiry_date DATE NOT NULL,
                po_id UUID REFERENCES pharmacy_purchase_orders(id),
                supplier_id UUID REFERENCES pharmacy_suppliers(id),
                status TEXT DEFAULT 'valid', -- valid, near-expiry, expired
                tenant_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        try {
            await db.query(`ALTER TABLE pharmacy_batches ADD COLUMN IF NOT EXISTS tenant_id TEXT`);
        } catch (e) {}

        // 5. Supplier Returns
        await db.query(`
            CREATE TABLE IF NOT EXISTS pharmacy_supplier_returns (
                id UUID PRIMARY KEY,
                supplier_id UUID REFERENCES pharmacy_suppliers(id),
                medicine_id UUID REFERENCES medicines(id),
                batch_id UUID REFERENCES pharmacy_batches(id),
                item_name TEXT,
                quantity INTEGER NOT NULL,
                amount DECIMAL(15,2) NOT NULL,
                reason TEXT,
                return_date DATE DEFAULT CURRENT_DATE,
                tenant_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        try {
            await db.query(`ALTER TABLE pharmacy_supplier_returns ADD COLUMN IF NOT EXISTS tenant_id TEXT`);
            await db.query(`ALTER TABLE pharmacy_supplier_returns ADD COLUMN IF NOT EXISTS medicine_id UUID REFERENCES medicines(id)`);
        } catch (e) {}

        // Backfill NULL tenant_ids from active license if available
        try {
            const licRes = await db.query(`SELECT tenant_id FROM license_info LIMIT 1`);
            const fallbackTenantId = licRes.rows[0]?.tenant_id;
            if (fallbackTenantId) {
                const hubTables = ['pharmacy_suppliers', 'pharmacy_purchase_orders', 'pharmacy_purchase_items', 'pharmacy_batches', 'pharmacy_supplier_returns'];
                for (const t of hubTables) {
                    try {
                        await db.query(`UPDATE ${t} SET tenant_id = $1 WHERE tenant_id IS NULL`, [fallbackTenantId]);
                    } catch (e) {}
                }
            }
        } catch (e) {}

        console.log('✨ Pharmacy Purchase Hub Migration completed successfully!');
    } catch (err) {
        console.error('❌ Pharmacy Purchase Hub Migration Error:', err.message);
        throw err;
    }
}

module.exports = migratePurchaseHub;
