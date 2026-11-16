const fs = require('fs');
const path = require('path');

const dir = 'C:/Users/admin/.gemini/antigravity/scratch/streetfighter';
const files = [
    'index.html',
    'server.js',
    'css/style.css',
    'js/audio.js',
    'js/sprites.js',
    'js/particles.js',
    'js/fighter.js',
    'js/ai.js',
    'js/game.js',
    'assets/chunli.png',
    'assets/ryu.png',
    'android/app/src/main/AndroidManifest.xml',
    'android/app/src/main/java/com/arcade/streetfight/MainActivity.java',
    'android/app/src/main/assets/www/index.html',
    'android/app/src/main/assets/www/assets/chunli.png',
    'android/app/src/main/assets/www/assets/ryu.png'
];

let allOk = true;
files.forEach(f => {
    const fullPath = path.join(dir, f);
    if (!fs.existsSync(fullPath)) {
        console.error('MISSING:', f);
        allOk = false;
    } else {
        const stats = fs.statSync(fullPath);
        console.log('OK:', f, `(${stats.size} bytes)`);
    }
});

if (allOk) {
    console.log('\n>>> ALL 16 FILES VERIFIED SUCCESSFULLY! <<<');
} else {
    process.exit(1);
}
