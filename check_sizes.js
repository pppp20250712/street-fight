const fs = require('fs');
const files = [
    'assets/ryu.png',
    'assets/chunli.png',
    'assets/portrait_jin.png',
    'assets/portrait_lihua.png'
];
const root = 'C:/Users/admin/.gemini/antigravity/scratch/streetfighter/';
const out = {};
files.forEach(f => {
    try {
        const s = fs.statSync(root + f);
        out[f] = s.size;
    } catch(e) {
        out[f] = e.message;
    }
});
fs.writeFileSync('C:/Users/admin/.gemini/antigravity/scratch/streetfighter/sizes.json', JSON.stringify(out, null, 2));
console.log('SIZES:', JSON.stringify(out));
