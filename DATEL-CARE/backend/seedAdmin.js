/**
 * Ensures default HMS admin exists (same as schema.sql).
 * Password: admin123
 */
const db = require('./database');

const ADMIN_ID = '00000000-0000-0000-0000-000000000000';
const ADMIN_EMAIL = 'admin@hospital.com';
const ADMIN_PASSWORD_HASH = '$2a$10$N/9hhUBRWNSwgJDpkCwIH.Saq56rylQ2glQRnmJde5RYLZPG7/GqW';

async function ensureAdminUser() {
    await db.query(
        `INSERT INTO users (id, name, email, password_hash, role, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, 1, CURRENT_TIMESTAMP)
         ON CONFLICT (email) DO UPDATE SET
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           is_active = 1,
           name = EXCLUDED.name`,
        [ADMIN_ID, 'Admin', ADMIN_EMAIL, ADMIN_PASSWORD_HASH, 'admin']
    );
    console.log(`✅ Admin user ready: ${ADMIN_EMAIL}`);
}

module.exports = ensureAdminUser;
