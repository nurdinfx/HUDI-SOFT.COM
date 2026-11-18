const https = require('https');

const data = JSON.stringify({ email: 'admin@gmail.com', password: 'admin123' });
const options = {
  hostname: 'daryeel-hms-com.vercel.app',
  path: '/api/auth/login',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
};

const req = https.request(options, res => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    try {
      const j = JSON.parse(body);
      if (j.token) console.log('SUCCESS - token received, user:', j.user?.email, 'tenant:', j.user?.tenantId);
      else console.log('RESPONSE:', JSON.stringify(j).substring(0, 300));
    } catch(e) { console.log('RAW:', body.substring(0, 300)); }
  });
});
req.on('error', e => console.log('ERROR:', e.message));
req.write(data);
req.end();
