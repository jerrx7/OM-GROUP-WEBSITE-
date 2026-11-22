/* OM GROUP - River Sand page: turn the Blender stills (_review/rsand3d) into web assets.
   Run after scripts/rsand3d/build-rsand.py:   node scripts/rsand3d/export-web-assets.js
   - img/applications/river-sand/screed-{1000,1600,2400}.{webp,avif}   floor build-up, transparent, soft shadow faded out before the frame edges
   - img/applications/river-sand/trench-{1000,1600,2000}.{webp,avif}   trench cross-section, opaque */
const path = require('path'), sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..', '..'), SRC = path.join(ROOT, '_review', 'rsand3d'), IMG = path.join(ROOT, 'img', 'applications', 'river-sand');
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
(async () => {
  /* screed: the floor shadow is a soft alpha; fade it out toward the frame edges so no hard crop shows on the page's stage */
  const { data, info } = await sharp(path.join(SRC, 'screed.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4 + 3, ex = Math.min(x, W - 1 - x) / W, ey = Math.min(y, H - 1 - y) / H;
    data[i] = Math.round(data[i] * ss(0.0, 0.07, ex) * ss(0.0, 0.10, ey));
  }
  for (const w of [1000, 1600, 2400]) {
    const im = () => sharp(data, { raw: { width: W, height: H, channels: 4 } }).resize({ width: w, kernel: 'lanczos3', withoutEnlargement: true });
    await im().webp({ quality: 86, alphaQuality: 92, effort: 6 }).toFile(path.join(IMG, 'screed-' + w + '.webp'));
    await im().avif({ quality: 62, effort: 6 }).toFile(path.join(IMG, 'screed-' + w + '.avif'));
  }
  for (const w of [1000, 1600, 2000]) {
    const im = () => sharp(path.join(SRC, 'trench.png')).flatten({ background: '#5a3b26' }).resize({ width: w, kernel: 'lanczos3', withoutEnlargement: true });
    await im().webp({ quality: 84, effort: 6 }).toFile(path.join(IMG, 'trench-' + w + '.webp'));
    await im().avif({ quality: 60, effort: 6 }).toFile(path.join(IMG, 'trench-' + w + '.avif'));
  }
  console.log('exported screed + trench');
})();
