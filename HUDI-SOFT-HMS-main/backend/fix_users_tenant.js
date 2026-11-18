const db = require('./database');

(async () => {
  try {
    // Get the existing tenant_id from license_info
    const lic = await db.query('SELECT tenant_id FROM license_info LIMIT 1');
    const tenantId = lic.rows[0] && lic.rows[0].tenant_id;
    console.log('Existing tenant_id:', tenantId);

    // Add tenant_id column if missing
    await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id TEXT');
    console.log('tenant_id column ensured on users table');

    // Backfill existing admin user(s) with the tenant_id
    if (tenantId) {
      const r = await db.query(
        'UPDATE users SET tenant_id = $1 WHERE tenant_id IS NULL RETURNING id, email, tenant_id',
        [tenantId]
      );
      console.log('Backfilled users:', JSON.stringify(r.rows));
    }

    // Add composite unique constraint if not already there
    try {
      await db.query('ALTER TABLE users ADD CONSTRAINT users_email_tenant_unique UNIQUE(email, tenant_id)');
      console.log('Added (email, tenant_id) unique constraint');
    } catch (e) {
      console.log('Constraint note:', e.message);
    }

    // Verify final state
    const users = await db.query('SELECT id, name, email, role, tenant_id FROM users');
    console.log('Final users:', JSON.stringify(users.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
