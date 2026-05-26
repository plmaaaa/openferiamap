const fs = require('fs');
const path = require('path');

const ITEMS = ['index.html', 'manifest.json', 'icon.svg', 'css', 'js', 'descargas'];

if (fs.existsSync('www')) fs.rmSync('www', { recursive: true });
fs.mkdirSync('www');

function copyRecursive(src, dest) {
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
        fs.mkdirSync(dest, { recursive: true });
        for (const file of fs.readdirSync(src)) {
            copyRecursive(path.join(src, file), path.join(dest, file));
        }
    } else {
        fs.copyFileSync(src, dest);
    }
}

for (const item of ITEMS) {
    copyRecursive(item, path.join('www', item));
    console.log(' copied', item);
}
console.log('\nBuild complete → www/');
