const fs = require('fs');
const path = require('path');

const srcDir = 'C:/Users/admin/.gemini/antigravity/scratch/streetfighter/assets';
const destDir = 'C:/Users/admin/.gemini/antigravity/brain/24d17577-997d-4aca-9ca4-ddc3cada8fec/assets';

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

const files = fs.readdirSync(srcDir);
files.forEach(file => {
    const srcFile = path.join(srcDir, file);
    const destFile = path.join(destDir, file);
    fs.copyFileSync(srcFile, destFile);
    console.log(`Copied ${file} -> ${destFile}`);
});

console.log('ALL ASSETS COPIED SUCCESSFULLY TO ARTIFACT DIR!');
