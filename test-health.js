const https = require('https');

function get(hostname, path) {
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

async function run() {
  console.log('Testing hudi-soft-com.onrender.com health...');
  const r1 = await get('hudi-soft-com.onrender.com', '/api/health');
  console.log('Health:', JSON.stringify(r1, null, 2));

  console.log('Testing root...');
  const r2 = await get('hudi-soft-com.onrender.com', '/');
  console.log('Root:', JSON.stringify(r2, null, 2));
}
run();
