const https = require('https');

function get(url) {
  return new Promise((resolve) => {
    https.get(url, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => { resolve(b); });
    }).on('error', e => resolve(''));
  });
}

async function run() {
  console.log('Downloading live bundle...');
  const code = await get('https://www.hudisoft.online/assets/index-Bmj9XPA2.js');
  
  // Find where Pe (the Axios instance) gets its baseURL set
  // The fallback URL is hardcoded after the VITE env replacement
  const idx = code.indexOf('Cannot reach the server');
  if (idx !== -1) {
    // Look 1000 chars before and after the error message to find the baseURL init
    console.log('=== AREA NEAR error message (1000 chars before) ===');
    console.log(code.substring(idx - 1000, idx));
  }
}
run();
