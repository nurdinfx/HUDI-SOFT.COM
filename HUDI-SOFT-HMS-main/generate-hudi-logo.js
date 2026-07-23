const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SOURCE_IMAGE = 'C:/Users/cali/.gemini/antigravity/brain/9d7e98e2-012a-45d4-ba38-f4909a92f9b5/media__1781240927424.png';
const PUBLIC_DIR = path.join(__dirname, 'public');
const ICONS_DIR = path.join(PUBLIC_DIR, 'icons');

async function main() {
    console.log('🚀 Generating HUDI-SOFT logo assets...');

    if (!fs.existsSync(SOURCE_IMAGE)) {
        console.error('❌ Source image not found at:', SOURCE_IMAGE);
        process.exit(1);
    }

    // Ensure icons directory exists
    if (!fs.existsSync(ICONS_DIR)) {
        fs.mkdirSync(ICONS_DIR, { recursive: true });
    }

    try {
        // 1. Direct Copies / Standard Formats
        console.log('Creating standard assets...');
        
        // PNG Logo
        await sharp(SOURCE_IMAGE).toFile(path.join(PUBLIC_DIR, 'logo.png'));
        console.log('✅ Created public/logo.png');

        // JPG Logo
        await sharp(SOURCE_IMAGE)
            .jpeg({ quality: 90 })
            .toFile(path.join(PUBLIC_DIR, 'logo.jpg'));
        console.log('✅ Created public/logo.jpg');

        // Favicon (just write as PNG - modern browsers handle this perfectly)
        await sharp(SOURCE_IMAGE)
            .resize(32, 32)
            .toFile(path.join(PUBLIC_DIR, 'favicon.ico'));
        console.log('✅ Created public/favicon.ico');

        // Apple Icon
        await sharp(SOURCE_IMAGE)
            .resize(180, 180)
            .toFile(path.join(PUBLIC_DIR, 'apple-icon.png'));
        console.log('✅ Created public/apple-icon.png');

        // 2. Main PNG icons used by Layout / iOS / Manifest
        console.log('Creating main resized PNGs...');
        await sharp(SOURCE_IMAGE).resize(144, 144).toFile(path.join(PUBLIC_DIR, 'logo-144.png'));
        await sharp(SOURCE_IMAGE).resize(192, 192).toFile(path.join(PUBLIC_DIR, 'logo-192.png'));
        await sharp(SOURCE_IMAGE).resize(512, 512).toFile(path.join(PUBLIC_DIR, 'logo-512.png'));
        console.log('✅ Created logo-144.png, logo-192.png, logo-512.png');

        // 3. WebP PWA Icons
        console.log('Creating WebP PWA icons...');
        const webpSizes = [48, 72, 96, 128, 192, 256, 512];
        for (const size of webpSizes) {
            await sharp(SOURCE_IMAGE)
                .resize(size, size)
                .webp({ quality: 85 })
                .toFile(path.join(ICONS_DIR, `icon-${size}.webp`));
            console.log(`✅ Created public/icons/icon-${size}.webp`);
        }

        console.log('🎉 Logo asset generation complete!');
    } catch (err) {
        console.error('❌ Error during logo generation:', err);
    }
}

main();
