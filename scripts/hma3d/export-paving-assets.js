/* converts the asphalt mat tiles written by build-paving.py (assets/hma3d/asphalt-*.png) to .webp and removes the .png files
   node scripts/hma3d/export-paving-assets.js */
const sharp = require('sharp'), fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', '..', 'assets', 'hma3d');
(async () => {
  for (const f of fs.readdirSync(dir).filter(f => /^asphalt-.*\.png$/.test(f))) {
    const src = path.join(dir, f), dst = src.replace(/\.png$/, '.webp'), kind = f.slice(-5, -4);
    await sharp(src).webp({ quality: kind === 'c' ? 86 : 92, effort: 6 }).toFile(dst);
    fs.unlinkSync(src); console.log(path.basename(dst), fs.statSync(dst).size);
  }
})();
