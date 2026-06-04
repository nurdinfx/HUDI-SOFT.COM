const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'out');
const destDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'assets', 'public');

function copyDir(src, dest) {
    if (!fs.existsSync(src)) {
        console.error(`Source directory "${src}" does not exist. Run "next build" or "npm run build" first!`);
        return;
    }
    
    // Create destination directory if it doesn't exist
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    } else {
        // Clear destination directory to avoid stale files
        fs.rmSync(dest, { recursive: true, force: true });
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

console.log('🔄 Syncing Next.js built export to Capacitor Android assets...');
copyDir(srcDir, destDir);
console.log('✅ Sync complete! Android assets updated.');
