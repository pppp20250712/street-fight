const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Minimal PNG decoder in pure Node
function decodePng(filePath) {
    const data = fs.readFileSync(filePath);
    let offset = 8;
    let width, height, bitDepth, colorType;
    const idatBuffers = [];

    while (offset < data.length) {
        const length = data.readUInt32BE(offset);
        const type = data.toString('ascii', offset + 4, offset + 8);
        if (type === 'IHDR') {
            width = data.readUInt32BE(offset + 8);
            height = data.readUInt32BE(offset + 12);
            bitDepth = data[offset + 16];
            colorType = data[offset + 17];
        } else if (type === 'IDAT') {
            idatBuffers.push(data.slice(offset + 8, offset + 8 + length));
        } else if (type === 'IEND') {
            break;
        }
        offset += 12 + length;
    }

    const uncompressed = zlib.inflateSync(Buffer.concat(idatBuffers));
    const bytesPerPixel = colorType === 6 ? 4 : (colorType === 2 ? 3 : 1);
    const stride = 1 + width * bytesPerPixel;
    const pixels = Buffer.alloc(width * height * 4);

    let prevRow = Buffer.alloc(width * bytesPerPixel);

    for (let y = 0; y < height; y++) {
        const filterType = uncompressed[y * stride];
        const row = Buffer.alloc(width * bytesPerPixel);

        for (let x = 0; x < width * bytesPerPixel; x++) {
            const rawVal = uncompressed[y * stride + 1 + x];
            const a = x >= bytesPerPixel ? row[x - bytesPerPixel] : 0;
            const b = prevRow[x];
            const c = x >= bytesPerPixel ? prevRow[x - bytesPerPixel] : 0;

            let val = rawVal;
            if (filterType === 1) val = (rawVal + a) & 0xff;
            else if (filterType === 2) val = (rawVal + b) & 0xff;
            else if (filterType === 3) val = (rawVal + Math.floor((a + b) / 2)) & 0xff;
            else if (filterType === 4) {
                const p = a + b - c;
                const pa = Math.abs(p - a);
                const pb = Math.abs(p - b);
                const pc = Math.abs(p - c);
                const pr = (pa <= pb && pa <= pc) ? a : ((pb <= pc) ? b : c);
                val = (rawVal + pr) & 0xff;
            }
            row[x] = val;
        }
        prevRow = row;

        for (let x = 0; x < width; x++) {
            const destOffset = (y * width + x) * 4;
            if (bytesPerPixel === 4) {
                pixels[destOffset] = row[x * 4];
                pixels[destOffset + 1] = row[x * 4 + 1];
                pixels[destOffset + 2] = row[x * 4 + 2];
                pixels[destOffset + 3] = row[x * 4 + 3];
            } else if (bytesPerPixel === 3) {
                pixels[destOffset] = row[x * 3];
                pixels[destOffset + 1] = row[x * 3 + 1];
                pixels[destOffset + 2] = row[x * 3 + 2];
                pixels[destOffset + 3] = 255;
            }
        }
    }

    return { width, height, pixels };
}

function findGridLines(imageName) {
    const file = path.join('C:/Users/admin/.gemini/antigravity/scratch/streetfighter/assets', imageName);
    const { width, height, pixels } = decodePng(file);

    // Scan vertical columns for grid lines (dark vertical lines)
    const colDarkness = [];
    for (let x = 0; x < width; x++) {
        let darkCount = 0;
        for (let y = 0; y < height; y++) {
            const idx = (y * width + x) * 4;
            const r = pixels[idx], g = pixels[idx + 1], b = pixels[idx + 2];
            if (r < 70 && g < 70 && b < 70) {
                darkCount++;
            }
        }
        if (darkCount > height * 0.6) {
            colDarkness.push(x);
        }
    }

    // Scan horizontal rows for grid lines
    const rowDarkness = [];
    for (let y = 0; y < height; y++) {
        let darkCount = 0;
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = pixels[idx], g = pixels[idx + 1], b = pixels[idx + 2];
            if (r < 70 && g < 70 && b < 70) {
                darkCount++;
            }
        }
        if (darkCount > width * 0.6) {
            rowDarkness.push(y);
        }
    }

    console.log(imageName, "Vertical Grid Lines:", colDarkness);
    console.log(imageName, "Horizontal Grid Lines:", rowDarkness);
}

findGridLines('chunli.png');
findGridLines('ryu.png');
