/**
 * Copies HUDI SOFT logo PNGs into Android mipmap folders for launcher icons.
 * Run after logo files exist in public/: node scripts/setup-android-icons.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');
const resDir = path.join(root, 'android', 'app', 'src', 'main', 'res');

const densityMap = [
  { folder: 'mipmap-mdpi', size: 'logo-144.png' },
  { folder: 'mipmap-hdpi', size: 'logo-144.png' },
  { folder: 'mipmap-xhdpi', size: 'logo-192.png' },
  { folder: 'mipmap-xxhdpi', size: 'logo-192.png' },
  { folder: 'mipmap-xxxhdpi', size: 'logo-512.png' },
];

const sourceLogo = path.join(publicDir, 'logo-512.png');
const drawableLogo = path.join(resDir, 'drawable', 'hms_logo.png');

if (!fs.existsSync(sourceLogo)) {
  console.error('Missing public/logo-512.png — download assets first.');
  process.exit(1);
}

fs.mkdirSync(path.join(resDir, 'drawable'), { recursive: true });
fs.copyFileSync(sourceLogo, drawableLogo);

for (const { folder, size } of densityMap) {
  const src = path.join(publicDir, size);
  if (!fs.existsSync(src)) {
    console.warn(`Skip ${folder}: missing ${size}`);
    continue;
  }
  const destDir = path.join(resDir, folder);
  fs.mkdirSync(destDir, { recursive: true });
  for (const name of ['ic_launcher.png', 'ic_launcher_round.png']) {
    fs.copyFileSync(src, path.join(destDir, name));
  }
}

console.log('Android launcher icons updated from HUDI SOFT logo.');
