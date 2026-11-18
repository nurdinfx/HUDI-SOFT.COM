const https = require('https');

function get(url) {
  return new Promise((resolve) => {
    https.get(url, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => { resolve(b); });
    });
  });
}

async function run() {
  const code = await get('https://www.hudisoft.online/assets/index-Bmj9XPA2.js');
  
  // Find where "/leads" is called
  const leadsIndex = code.indexOf('"/leads"');
  if (leadsIndex !== -1) {
    console.log('Found /leads context:', code.substring(leadsIndex - 150, leadsIndex + 150));
  } else {
    console.log('/leads not found');
  }

  // Find where "The server is waking up" or similar text is
  const msgIndex = code.indexOf('is waking up (free tier)');
  if (msgIndex !== -1) {
    console.log('Found error message context:', code.substring(msgIndex - 200, msgIndex + 200));
  } else {
    console.log('Error message context not found');
  }
}
run();
