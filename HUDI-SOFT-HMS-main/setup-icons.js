/**
 * setup-icons.js
 * Copies the Hudi Soft logo (public/logo.png OR public/logo.jpg) to all
 * required icon slots for Capacitor + PWA.
 *
 * Run with:  node setup-icons.js
 *
 * For best results, first replace assets/icon.png with the 1024×1024 Hudi Soft logo,
 * then run:  npx @capacitor/assets generate --android
 * to auto-generate all Android adaptive icon sizes.
 */

const fs = require('fs');
const path = require('path');

const root = __dirname;

// Source: prefer PNG, fall back to JPG
let src = path.join(root, 'public', 'logo.png');
if (!fs.existsSync(src)) {
  src = path.join(root, 'public', 'logo.jpg');
}
if (!fs.existsSync(src)) {
  console.error('❌  No logo found at public/logo.png or public/logo.jpg');
  process.exit(1);
}

const targets = [
  'public/logo.png',
  'public/logo-192.png',
  'public/logo-144.png',
  'public/logo-512.png',
  'public/apple-icon.png',
  'public/favicon.ico',
  'assets/icon.png',
  'assets/splash.png',
];

let copied = 0;
for (const rel of targets) {
  const dest = path.join(root, rel);
  // Skip if source and dest are the same file
  if (path.resolve(src) === path.resolve(dest)) {
    console.log(`⏭  Skipped (same file): ${rel}`);
    continue;
  }
  try {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    console.log(`✅  Copied → ${rel}`);
    copied++;
  } catch (e) {
    console.warn(`⚠️  Failed to copy ${rel}: ${e.message}`);
  }
}

console.log(`\nDone — ${copied} icon files updated.`);
console.log('\nNext steps:');
console.log('  1. npx next build              (generates /out)');
console.log('  2. npx cap add android         (first time only)');
console.log('  3. npx cap sync android        (copies /out into android)');
console.log('  4. npx @capacitor/assets generate --android   (generates icons)');
console.log('  5. npx cap open android        (open Android Studio → Build APK)');
