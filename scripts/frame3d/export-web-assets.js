/* OM GROUP - concrete frame: turn the Blender stills (_review/frame3d) into web assets for the 20mm aggregates page.
   Run after scripts/frame3d/build-frame.py:   node scripts/frame3d/export-web-assets.js
   - img/applications/20mm-aggregates/frame-{1000,1600,2400}.{webp,avif}   the frame (soil bank faded out before the section card)
   - img/applications/20mm-aggregates/frame-sec-<member>.webp               the five member cross-sections (card) */
const path = require('path'), fs = require('fs'), sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..', '..'), SRC = path.join(ROOT, '_review', 'frame3d'), IMG = path.join(ROOT, 'img', 'applications', '20mm-aggregates');
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
(async () => {
  /* the soil bank runs out to the right with a soft fade (the card sits there): only the soil rows are faded, the structure is left alone */
  const { data, info } = await sharp(path.join(SRC, 'frame.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  for (let y = Math.floor(H * 0.74); y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4 + 3; data[i] = Math.round(data[i] * (1 - ss(0.625, 0.70, x / W))); }
  for (const w of [1000, 1600, 2400]) {
    const im = () => sharp(data, { raw: { width: W, height: H, channels: 4 } }).resize({ width: w, kernel: 'lanczos3', withoutEnlargement: true });
    await im().webp({ quality: 86, alphaQuality: 92, effort: 6 }).toFile(path.join(IMG, 'frame-' + w + '.webp'));
    await im().avif({ quality: 62, effort: 6 }).toFile(path.join(IMG, 'frame-' + w + '.avif'));
  }
  for (const k of ['slab', 'beam', 'column', 'footing', 'foundation'])
    await sharp(path.join(SRC, 'sec-' + k + '.png')).resize({ width: 700, kernel: 'lanczos3' }).webp({ quality: 88, alphaQuality: 92, effort: 6 }).toFile(path.join(IMG, 'frame-sec-' + k + '.webp'));
  for (const f of fs.readdirSync(IMG).filter(f => f.startsWith('frame'))) console.log(f, fs.statSync(path.join(IMG, f)).size);
})();
