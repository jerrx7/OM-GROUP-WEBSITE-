/* OM GROUP - Ready Mix Concrete page: three widget stills (_review/rmc3d/{wall,scc,mass}.png) -> web assets.
   Run after scripts/rmc3d/build-rmc.py (once per SCENE):   node scripts/rmc3d/export-web-assets.js
   -> img/applications/ready-mix-concrete/rx3-<wall|scc|mass>-{1040,2080}.{webp,avif}   transparent, floor shadow faded toward the frame edges */
const path = require('path'), sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..', '..'), SRC = path.join(ROOT, '_review', 'rmc3d'), IMG = path.join(ROOT, 'img', 'applications', 'ready-mix-concrete');
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
(async () => {
  for (const k of ['wall', 'scc', 'mass']) {
    const { data, info } = await sharp(path.join(SRC, k + '.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const W = info.width, H = info.height;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4 + 3, ex = Math.min(x, W - 1 - x) / W, ey = Math.min(y, H - 1 - y) / H;
      data[i] = Math.round(data[i] * ss(0.0, 0.04, ex) * ss(0.0, 0.07, ey));
    }
    for (const w of [1040, 2080]) {
      const im = () => sharp(data, { raw: { width: W, height: H, channels: 4 } }).resize({ width: w, kernel: 'lanczos3', withoutEnlargement: true });
      await im().webp({ quality: 86, alphaQuality: 92, effort: 6 }).toFile(path.join(IMG, `rx3-${k}-${w}.webp`));
      await im().avif({ quality: 62, effort: 6 }).toFile(path.join(IMG, `rx3-${k}-${w}.avif`));
    }
  }
  console.log('exported RMC widget stills');
})();
