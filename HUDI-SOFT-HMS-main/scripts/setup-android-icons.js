/**
 * Copies HUDI SOFT logo into Android launcher icons (APK home-screen icon).
 * Run: npm run icons:android  (also runs before cap:build)
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
const foregroundXml = path.join(resDir, 'drawable', 'ic_launcher_foreground.xml');

if (!fs.existsSync(sourceLogo)) {
  console.error('Missing public/logo-512.png');
  process.exit(1);
}

fs.mkdirSync(path.join(resDir, 'drawable'), { recursive: true });
fs.copyFileSync(sourceLogo, drawableLogo);

fs.writeFileSync(
  foregroundXml,
  `<?xml version="1.0" encoding="utf-8"?>
<inset xmlns:android="http://schemas.android.com/apk/res/android"
    android:drawable="@drawable/hms_logo"
    android:inset="10%" />
`,
  'utf8'
);

for (const { folder, size } of densityMap) {
  const src = path.join(publicDir, size);
  if (!fs.existsSync(src)) {
    console.warn(`Skip ${folder}: missing ${size}`);
    continue;
  }
  const destDir = path.join(resDir, folder);
  fs.mkdirSync(destDir, { recursive: true });
  for (const name of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']) {
    fs.copyFileSync(src, path.join(destDir, name));
  }
}

console.log('Android APK icon updated with HUDI SOFT company logo.');
