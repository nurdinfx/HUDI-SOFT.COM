/**
 * Creates admin@hospital.com in the Render HMS backend database
 * using the /api/license/activate endpoint which seeds admin user automatically,
 * OR by calling the backend reset endpoint.
 */
const https = require('https');

async function callApi(hostname, path, method, data) {
  return new Promise((resolve) => {
    const body = data ? JSON.stringify(data) : null;
    const req = https.request({
      hostname,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {})
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(b) }); }
        catch { resolve({ status: res.statusCode, body: b.substring(0, 300) }); }
      });
    });
    req.on('error', e => resolve({ error: e.message }));
    if (body) req.write(body);
    req.end();
  });
}

async function run() {
  const hostname = 'hudi-soft-com-1.onrender.com';
  
  console.log('Checking HMS backend health...');
  const health = await callApi(hostname, '/api/health', 'GET');
  console.log('Health:', health.body?.status || health.error);
  
  // Try emergency reset endpoint if it exists
  console.log('\nTrying emergency admin reset...');
  const reset = await callApi(hostname, '/api/emergency-reset', 'GET');
  console.log('Reset result:', JSON.stringify(reset.body).substring(0, 200));
  
  // Test login after reset
  console.log('\nTesting login after reset...');
  const login = await callApi(hostname, '/api/auth/login', 'POST', {
    email: 'admin@hudisoft.com',
    password: 'admin123'
  });
  console.log('Login test:', login.body?.token ? 
    `✅ SUCCESS - ${login.body.user?.email}` : 
    `❌ ${login.body?.error || login.body}`
  );
  
  // Also try the seeded user
  const login2 = await callApi(hostname, '/api/auth/login', 'POST', {
    email: 'admin@hospital.com',
    password: 'admin123'
  });
  console.log('Login2 test:', login2.body?.token ? 
    `✅ SUCCESS - ${login2.body.user?.email}` : 
    `❌ ${login2.body?.error || login2.body}`
  );
}

run();
