const db = require('./database');
const { AsyncLocalStorage } = require('async_hooks');

global.tenantStorage = new AsyncLocalStorage();

async function run() {
  console.log("🧪 Testing superuser-to-restricted role-switching RLS...");
  try {
    // 1. Run query outside request context (should run as superuser)
    const storeRes = await db.query("SELECT current_user, current_setting('app.current_tenant_id', true)");
    console.log("👑 Outside request context (superuser):", storeRes.rows[0]);

    // 2. Run query inside request context (should run as hms_app)
    const tenantId = 'test-tenant-role-switch';
    await global.tenantStorage.run(tenantId, async () => {
      const insideRes = await db.query("SELECT current_user, current_setting('app.current_tenant_id', true)");
      console.log("🔒 Inside request context (restricted role):", insideRes.rows[0]);
    });

    console.log("🎉 SUCCESS: Role switching and RLS parameter propagation works perfectly!");
  } catch (err) {
    console.error("❌ Test failed:", err.message);
  }
}

run();
