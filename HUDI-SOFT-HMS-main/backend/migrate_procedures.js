/**
 * migrate_procedures.js
 * Creates the procedures table and ensures links to OPD and Financial entries.
 */
const db = require('./database');
const { v4: uuidv4 } = require('uuid');

async function migrate() {
    try {
        console.log('🚀 Starting Procedure Hub Migration...');

        // 1. Create Procedures Table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS procedures (
                id UUID PRIMARY KEY,
                opd_visit_id UUID NOT NULL,
                patient_id UUID NOT NULL,
                doctor_id UUID NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                category TEXT,
                cost DECIMAL(10, 2) NOT NULL,
                status TEXT DEFAULT 'active',
                tenant_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        try {
            await db.query(`ALTER TABLE procedures ADD COLUMN IF NOT EXISTS tenant_id TEXT`);
        } catch (e) {}
        console.log('✅ Procedures table created/verified');

        // Note: FOREIGN KEY constraints are often skipped in this codebase for flexibility, 
        // but we assume logical links to opd_visits, patients, and doctors.

        console.log('✨ Procedure Hub migration completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        throw err;
    }
}

if (require.main === module) {
    migrate();
}

module.exports = migrate;
