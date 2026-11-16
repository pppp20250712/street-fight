const fs = require('fs');
const path = require('path');

const srcBase = 'C:/Users/admin/.gemini/antigravity/scratch/streetfighter';
const destBase = 'C:/Users/admin/.gemini/antigravity/brain/24d17577-997d-4aca-9ca4-ddc3cada8fec';

['css', 'js'].forEach(dir => {
    const sDir = path.join(srcBase, dir);
    const dDir = path.join(destBase, dir);
    if (!fs.existsSync(dDir)) fs.mkdirSync(dDir, { recursive: true });
    fs.readdirSync(sDir).forEach(f => {
        fs.copyFileSync(path.join(sDir, f), path.join(dDir, f));
        console.log(`Copied ${dir}/${f}`);
    });
});
console.log('JS AND CSS COPIED SUCCESSFULLY!');
