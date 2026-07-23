/**
 * Figures out what backend the PWA uses by checking the /api/health endpoint
 * and trying to find what server processes login
 */
const https = require('https');

async function get(hostname, path) {
  return new Promise((resolve) => {
    https.get(`https://${hostname}${path}`, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(b), headers: res.headers }); }
        catch { resolve({ status: res.statusCode, body: b.substring(0, 300), headers: res.headers }); }
      });
    }).on('error', e => resolve({ error: e.message }));
  });
}

async function post(hostname, path, data) {
  return new Promise((resolve) => {
    const body = JSON.stringify(data);
    const req = https.request({ hostname, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(b) }); }
        catch { resolve({ status: res.statusCode, body: b.substring(0, 300) }); }
      });
    });
    req.on('error', e => resolve({ error: e.message }));
    req.write(body); req.end();
  });
}

async function run() {
  // 1. Check PWA health endpoint — this shows backend version and db connection
  console.log('=== PWA Health ===');
  const health = await get('daryeel-hms-com.vercel.app', '/api/health');
  console.log(JSON.stringify(health.body, null, 2));
  
  // 2. Check if PWA has its own Next.js API routes (Vercel serverless)
  console.log('\n=== PWA DB Test ===');
  const dbTest = await get('daryeel-hms-com.vercel.app', '/api/db-test');
  console.log(JSON.stringify(dbTest.body, null, 2));
  
  // 3. Check various HMS backends
  const backends = [
    'hudi-soft-com-1.onrender.com',
    'hudi-soft-hms.onrender.com',
    'hudi-soft-hms-backend.onrender.com',
  ];
  
  console.log('\n=== Backend Health Checks ===');
  for (const b of backends) {
    const r = await get(b, '/api/health');
    console.log(`${b}: ${r.error ? 'ERROR: ' + r.error : JSON.stringify(r.body).substring(0, 100)}`);
  }
  
  // 4. Try to find working credentials
  console.log('\n=== Trying credentials on PWA ===');
  const testCreds = [
    { email: 'admin@hospital.com', password: 'admin123' },
    { email: 'admin@hudisoft.com', password: 'admin123' },
    { email: 'admin@hms.com', password: 'admin123' },
  ];
  for (const cred of testCreds) {
    const r = await post('daryeel-hms-com.vercel.app', '/api/auth/login', cred);
    console.log(`${cred.email}: ${r.body?.token ? '✅ WORKS' : '❌ ' + r.body?.error}`);
  }
}
run();
