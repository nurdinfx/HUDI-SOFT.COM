const https = require('https');

function testLogin(email, password) {
  return new Promise((resolve) => {
    const data = JSON.stringify({ email, password });
    const req = https.request({
      hostname: 'daryeel-hms-com.vercel.app',
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
        catch(e) { resolve({ status: res.statusCode, body: body.substring(0, 200) }); }
      });
    });
    req.on('error', e => resolve({ error: e.message }));
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log('Testing daryeel-hms-com.vercel.app login...\n');
  
  const tests = [
    { email: 'admin@hospital.com', password: 'admin123' },
    { email: 'admin@gmail.com', password: 'admin123' },
    { email: 'admin@hospital.com', password: 'Admin123' },
    { email: 'admin@hospital.com', password: 'password' },
  ];
  
  for (const t of tests) {
    const result = await testLogin(t.email, t.password);
    if (result.body?.token) {
      console.log(`✅ SUCCESS: ${t.email} / ${t.password}`);
      console.log(`   User: ${result.body.user?.name}, Role: ${result.body.user?.role}`);
      console.log(`   Tenant: ${result.body.user?.tenantId || result.body.user?.tenant_id}`);
    } else {
      console.log(`❌ FAILED: ${t.email} / ${t.password} → ${JSON.stringify(result.body).substring(0, 80)}`);
    }
  }
}
run();
