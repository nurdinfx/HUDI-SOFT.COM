const https = require('https');

const data = JSON.stringify({
  name: 'Test Agent',
  email: 'agent_test@hudisoft.com',
  phone: '1234567890',
  companyName: 'Test Company',
  systemType: 'Cloud POS Solution',
  zipCode: '12345'
});

const options = {
  hostname: 'hudi-soft-com.onrender.com',
  path: '/api/leads',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

console.log('Sending test POST request to https://hudi-soft-com.onrender.com/api/leads ...');

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Response Status:', res.statusCode);
    console.log('Response Body:', body);
  });
});

req.on('error', (err) => {
  console.error('Request Error:', err.message);
});

req.write(data);
req.end();
