/* OM GROUP - hollow concrete block: turn the Blender outputs (_review/block3d) into web assets.
   Run after scripts/block3d/build-hollow-block.py:   node scripts/block3d/export-web-assets.js
   - assets/3d/hollow-block-shadow.webp       floor shadow (alpha of the Cycles shadow-catcher render, as greyscale)
   - img/applications/6mm-aggregates/hollow-concrete-block-anatomy-{wide,tall}-{w}.{webp,avif}   static posters
   Prints the poster framing from meta.json; those numbers live in assets/application-block3d.js (POSTERS). */
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, '_review', 'block3d');
const IMG = path.join(ROOT, 'img', 'applications', '6mm-aggregates');

(async () => {
  const meta = JSON.parse(fs.readFileSync(path.join(SRC, 'meta.json'), 'utf8'));

  // shadow: alpha only, softened a touch so the 512 px texture never shows texels
  const sh = sharp(path.join(SRC, 'shadow.png')).ensureAlpha().extractChannel('alpha');
  await sh.resize(512, 512, { kernel: 'lanczos3' }).blur(0.6).toColourspace('b-w')
    .webp({ quality: 86 }).toFile(path.join(ROOT, 'assets', '3d', 'hollow-block-shadow.webp'));

  const sizes = { wide: [1000, 1800], tall: [800, 1400] };
  for (const key of Object.keys(sizes)) {
    const src = path.join(SRC, 'poster-' + key + '.png');
    for (const w of sizes[key]) {
      const base = path.join(IMG, 'hollow-concrete-block-anatomy-' + key + '-' + w);
      const im = () => sharp(src).resize({ width: w, kernel: 'lanczos3' });
      await im().webp({ quality: 84, alphaQuality: 90, effort: 6 }).toFile(base + '.webp');
      await im().avif({ quality: 58, effort: 6 }).toFile(base + '.avif');
    }
  }
  const out = {};
  for (const [k, p] of Object.entries(meta.posters)) out[k] = { w: p.w, h: p.h, uv: p.uv.map(n => +n.toFixed(6)) };
  console.log('POSTERS =', JSON.stringify(out));
  console.log('CAMS =', JSON.stringify(meta.cams));
  console.log('SHADOW =', JSON.stringify(meta.shadow));
  console.log('ANCHORS =', JSON.stringify(meta.anchors));
  for (const f of fs.readdirSync(IMG).filter(f => f.startsWith('hollow-concrete-block-anatomy'))) console.log(f, fs.statSync(path.join(IMG, f)).size);
  console.log('shadow', fs.statSync(path.join(ROOT, 'assets', '3d', 'hollow-block-shadow.webp')).size);
})();
