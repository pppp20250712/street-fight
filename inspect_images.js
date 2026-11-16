const fs = require('fs');
const path = require('path');

const img1 = "C:/Users/admin/.gemini/antigravity/brain/24d17577-997d-4aca-9ca4-ddc3cada8fec/.user_uploaded/media_1793623916539_146432ca.png";
const img2 = "C:/Users/admin/.gemini/antigravity/brain/24d17577-997d-4aca-9ca4-ddc3cada8fec/.user_uploaded/media_1793623961247_a50a641e.png";

function getPngDimensions(filePath) {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(24);
    fs.readSync(fd, buffer, 0, 24, 0);
    fs.closeSync(fd);
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height };
}

console.log("Image 1 (Female Chun-Li style):", getPngDimensions(img1));
console.log("Image 2 (Male Ryu style):", getPngDimensions(img2));

const destDir = "C:/Users/admin/.gemini/antigravity/scratch/streetfighter/assets";
fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(img1, path.join(destDir, "chunli_sheet.png"));
fs.copyFileSync(img2, path.join(destDir, "ryu_sheet.png"));
console.log("Copied sprite sheets to:", destDir);
