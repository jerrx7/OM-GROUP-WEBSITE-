/* OM GROUP - Concrete Sand page: turn the Blender still (_review/scale3d/scale.png) into web assets.
   Run after scripts/scale3d/build-scale.py:   node scripts/scale3d/export-web-assets.js
   -> img/applications/concrete-sand/scale-{1000,1600,2400}.{webp,avif}   transparent, floor shadow faded out toward the frame edges */
const path = require('path'), sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..', '..'), SRC = path.join(ROOT, '_review', 'scale3d', 'scale.png'), IMG = path.join(ROOT, 'img', 'applications', 'concrete-sand');
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
(async () => {
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4 + 3, ex = Math.min(x, W - 1 - x) / W, ey = Math.min(y, H - 1 - y) / H;
    data[i] = Math.round(data[i] * ss(0.0, 0.04, ex) * ss(0.0, 0.08, ey));
  }
  for (const w of [1000, 1600, 2400]) {
    const im = () => sharp(data, { raw: { width: W, height: H, channels: 4 } }).resize({ width: w, kernel: 'lanczos3', withoutEnlargement: true });
    await im().webp({ quality: 86, alphaQuality: 92, effort: 6 }).toFile(path.join(IMG, 'scale-' + w + '.webp'));
    await im().avif({ quality: 62, effort: 6 }).toFile(path.join(IMG, 'scale-' + w + '.avif'));
  }
  console.log('exported scale');
})();
