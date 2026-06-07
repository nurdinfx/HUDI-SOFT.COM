/**
 * HUDI SOFT Capacitor branding — APK launcher icon + splash screen.
 * Run: npm run icons:android  (included in npm run cap:build)
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');
const resDir = path.join(root, 'android', 'app', 'src', 'main', 'res');
const resourcesDir = path.join(root, 'resources');

const TEAL = '#0d9488';

const densityMap = [
  { folder: 'mipmap-mdpi', logo: 'logo-144.png', splash: 'logo-192.png' },
  { folder: 'mipmap-hdpi', logo: 'logo-144.png', splash: 'logo-192.png' },
  { folder: 'mipmap-xhdpi', logo: 'logo-192.png', splash: 'logo-512.png' },
  { folder: 'mipmap-xxhdpi', logo: 'logo-192.png', splash: 'logo-512.png' },
  { folder: 'mipmap-xxxhdpi', logo: 'logo-512.png', splash: 'logo-512.png' },
];

const splashFolders = [
  'drawable-port-mdpi',
  'drawable-port-hdpi',
  'drawable-port-xhdpi',
  'drawable-port-xxhdpi',
  'drawable-port-xxxhdpi',
  'drawable-land-mdpi',
  'drawable-land-hdpi',
  'drawable-land-xhdpi',
  'drawable-land-xxhdpi',
  'drawable-land-xxxhdpi',
];

const sourceLogo = path.join(publicDir, 'logo-512.png');
const fallbackLogo = path.join(publicDir, 'logo.png');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyIfExists(src, dest) {
  if (!fs.existsSync(src)) return false;
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  return true;
}

const logoSource = fs.existsSync(sourceLogo) ? sourceLogo : fallbackLogo;
if (!fs.existsSync(logoSource)) {
  console.error('Missing public/logo-512.png or public/logo.png');
  process.exit(1);
}

// ─── Capacitor resources/ (icon + splash for tooling) ─────────────────────
ensureDir(resourcesDir);
fs.copyFileSync(logoSource, path.join(resourcesDir, 'icon.png'));
fs.copyFileSync(logoSource, path.join(resourcesDir, 'splash.png'));

// ─── In-app drawable logo ───────────────────────────────────────────────────
const drawableLogo = path.join(resDir, 'drawable', 'hms_logo.png');
ensureDir(path.join(resDir, 'drawable'));
fs.copyFileSync(logoSource, drawableLogo);

const foregroundXml = `<?xml version="1.0" encoding="utf-8"?>
<inset xmlns:android="http://schemas.android.com/apk/res/android"
    android:drawable="@drawable/hms_logo"
    android:inset="8%" />
`;

fs.writeFileSync(path.join(resDir, 'drawable', 'ic_launcher_foreground.xml'), foregroundXml, 'utf8');
fs.writeFileSync(path.join(resDir, 'drawable-v24', 'ic_launcher_foreground.xml'), foregroundXml, 'utf8');

// ─── Splash screen (launch) ─────────────────────────────────────────────────
const splashXml = `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/ic_launcher_background" />
    <item>
        <bitmap
            android:gravity="center"
            android:src="@drawable/hms_logo" />
    </item>
</layer-list>
`;

const drawableSplashPng = path.join(resDir, 'drawable', 'splash.png');
if (fs.existsSync(drawableSplashPng)) fs.unlinkSync(drawableSplashPng);
fs.writeFileSync(path.join(resDir, 'drawable', 'splash.xml'), splashXml, 'utf8');

for (const folder of splashFolders) {
  const dest = path.join(resDir, folder, 'splash.png');
  const preferred =
    folder.includes('xxxhdpi') || folder.includes('xxhdpi')
      ? path.join(publicDir, 'logo-512.png')
      : folder.includes('xhdpi') || folder.includes('hdpi')
        ? path.join(publicDir, 'logo-192.png')
        : path.join(publicDir, 'logo-144.png');
  const splashSrc = fs.existsSync(preferred) ? preferred : logoSource;
  copyIfExists(splashSrc, dest);
}

// ─── Launcher mipmaps ─────────────────────────────────────────────────────────
for (const { folder, logo } of densityMap) {
  const src = path.join(publicDir, logo);
  if (!fs.existsSync(src)) {
    console.warn(`Skip ${folder}: missing ${logo}`);
    continue;
  }
  const destDir = path.join(resDir, folder);
  ensureDir(destDir);
  for (const name of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']) {
    fs.copyFileSync(src, path.join(destDir, name));
  }
}

// ─── Teal brand background ──────────────────────────────────────────────────
const bgXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${TEAL}</color>
</resources>
`;
fs.writeFileSync(path.join(resDir, 'values', 'ic_launcher_background.xml'), bgXml, 'utf8');

console.log('✓ HUDI SOFT Capacitor branding applied (APK icon + splash + resources/)');
