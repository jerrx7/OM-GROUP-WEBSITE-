/* OM GROUP - Washed Sand page: the three cross-section widgets, Blender stills (_review/wsand3d/<scene>.png) -> web assets.
   Run after scripts/wsand3d/build-wsand2.py (once per SCENE=screed|bed|bedpave|filter):   node scripts/wsand3d/export-web-assets2.js
   -> img/applications/washed-sand/x3-<scene>-{1040,2080}.{webp,avif}   transparent, floor shadow faded toward the frame edges */
const path = require('path'), sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..', '..'), SRC = path.join(ROOT, '_review', 'wsand3d'), IMG = path.join(ROOT, 'img', 'applications', 'washed-sand');
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
(async () => {
  for (const k of ['screed', 'bed', 'bedpave', 'filter']) {
    const { data, info } = await sharp(path.join(SRC, k + '.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const W = info.width, H = info.height;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4 + 3, ex = Math.min(x, W - 1 - x) / W, ey = Math.min(y, H - 1 - y) / H;
      data[i] = Math.round(data[i] * ss(0.0, 0.04, ex) * ss(0.0, 0.07, ey));
    }
    for (const w of [1040, 2080]) {
      const im = () => sharp(data, { raw: { width: W, height: H, channels: 4 } }).resize({ width: w, kernel: 'lanczos3', withoutEnlargement: true });
      await im().webp({ quality: 86, alphaQuality: 92, effort: 6 }).toFile(path.join(IMG, `x3-${k}-${w}.webp`));
      await im().avif({ quality: 62, effort: 6 }).toFile(path.join(IMG, `x3-${k}-${w}.avif`));
    }
  }
  console.log('exported cross-section stills');
})();
