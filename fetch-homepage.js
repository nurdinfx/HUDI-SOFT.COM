const https = require('https');

function get(url) {
  return new Promise((resolve) => {
    https.get(url, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body: b });
      });
    }).on('error', e => resolve({ error: e.message }));
  });
}

async function run() {
  console.log('Fetching live index-Bmj9XPA2.js...');
  const res = await get('https://www.hudisoft.online/assets/index-Bmj9XPA2.js');
  if (res.body) {
    console.log('Body length:', res.body.length);
    // Find the declaration of Axios baseURL
    const index = res.body.indexOf('baseURL:');
    if (index !== -1) {
      console.log('Found baseURL context:', res.body.substring(index - 100, index + 200));
    } else {
      console.log('baseURL not found');
    }
  }
}
run();
