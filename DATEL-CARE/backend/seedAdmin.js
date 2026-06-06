/**
 * Ensures default HMS admin exists — same PostgreSQL DB as HUDI SOFT HMS web.
 * Email: admin@hospital.com  Password: admin123
 */
const bcrypt = require('bcryptjs');
const db = require('./database');

const ADMIN_ID = '00000000-0000-0000-0000-000000000000';
const ADMIN_EMAIL = 'admin@hospital.com';

async function ensureAdminUser() {
    const passwordHash = bcrypt.hashSync('admin123', 10);

    const updated = await db.query(
        `UPDATE users
         SET password_hash = $1, role = 'admin', is_active = 1, name = 'Admin'
         WHERE LOWER(TRIM(email)) = LOWER($2)`,
        [passwordHash, ADMIN_EMAIL]
    );

    if (updated.rowCount > 0) {
        console.log(`✅ Admin user updated: ${ADMIN_EMAIL}`);
        return;
    }

    try {
        await db.query(
            `INSERT INTO users (id, name, email, password_hash, role, is_active, created_at)
             VALUES ($1, $2, $3, $4, $5, 1, CURRENT_TIMESTAMP)`,
            [ADMIN_ID, 'Admin', ADMIN_EMAIL, passwordHash, 'admin']
        );
        console.log(`✅ Admin user created: ${ADMIN_EMAIL}`);
    } catch (err) {
        if (err.code === '23505') {
            await db.query(
                `UPDATE users
                 SET password_hash = $1, role = 'admin', is_active = 1, name = 'Admin'
                 WHERE LOWER(TRIM(email)) = LOWER($2)`,
                [passwordHash, ADMIN_EMAIL]
            );
            console.log(`✅ Admin user repaired after conflict: ${ADMIN_EMAIL}`);
            return;
        }
        throw err;
    }
}

module.exports = ensureAdminUser;
