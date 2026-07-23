const https = require('https');

// Simulate exactly what the app sends
function testLogin(tenantId) {
  return new Promise((resolve) => {
    const data = JSON.stringify({ email: 'admin@hospital.com', password: 'admin123' });
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
      'X-Machine-ID': 'test-device-123',
    };
    if (tenantId) headers['X-Tenant-ID'] = tenantId;
    
    const req = https.request({
      hostname: 'daryeel-hms-com.vercel.app',
      path: '/api/auth/login',
      method: 'POST',
      headers
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
        catch(e) { resolve({ status: res.statusCode, body }); }
      });
    });
    req.on('error', e => resolve({ error: e.message }));
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log('=== Testing exact login scenarios ===\n');

  // Test 1: no tenant ID
  let r = await testLogin(null);
  console.log('No tenant ID:', r.body.token ? '✅ SUCCESS' : `❌ ${r.body.error}`);

  // Test 2: empty tenant ID  
  r = await testLogin('');
  console.log('Empty tenant ID:', r.body.token ? '✅ SUCCESS' : `❌ ${r.body.error}`);

  // Test 3: default tenant
  r = await testLogin('00000000-0000-0000-0000-000000000000');
  console.log('Default tenant:', r.body.token ? '✅ SUCCESS' : `❌ ${r.body.error}`);

  // Test 4: random wrong tenant
  r = await testLogin('6a2eb465b5a58300aa5ca61e');
  console.log('Wrong tenant:', r.body.token ? '✅ SUCCESS' : `❌ ${r.body.error}`);

  // Also check what users exist
  console.log('\n=== Checking users via API ===');
}
run();
