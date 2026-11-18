const https = require('https');

async function test(email, password) {
  return new Promise((resolve) => {
    const data = JSON.stringify({ email, password });
    const req = https.request({
      hostname: 'hudi-soft-com-1.onrender.com',
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(body);
          resolve({ ok: !!j.token, email: j.user?.email, role: j.user?.role, tenant: j.user?.tenantId || j.user?.tenant_id, err: j.error });
        } catch { resolve({ ok: false, err: body.substring(0, 200) }); }
      });
    });
    req.on('error', e => resolve({ ok: false, err: e.message }));
    req.write(data); req.end();
  });
}

async function run() {
  console.log('Testing hudi-soft-com-1.onrender.com:\n');
  const tests = [
    ['admin@hospital.com', 'admin123'],
    ['admin@gmail.com', 'admin123'],
    ['admin@hudisoft.com', 'admin123'],
  ];
  for (const [e, p] of tests) {
    const r = await test(e, p);
    if (r.ok) console.log(`✅ ${e} / ${p} → role:${r.role} tenant:${r.tenant}`);
    else console.log(`❌ ${e} / ${p} → ${r.err}`);
  }
}
run();
