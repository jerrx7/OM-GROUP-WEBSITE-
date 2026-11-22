/* OM GROUP - Plaster Sand page, thickness widget: Blender stills (_review/thick3d) -> web assets.
   Run after scripts/thick3d/build-thickness.py:   node scripts/thick3d/export-web-assets.js
   -> img/applications/plaster-sand/thick-<unev|guides|minor|spec|excess>-{820,1640}.{webp,avif}   transparent, floor shadow faded out toward the frame edges */
const path = require('path'), sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..', '..'), SRC = path.join(ROOT, '_review', 'thick3d'), IMG = path.join(ROOT, 'img', 'applications', 'plaster-sand');
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
(async () => {
  for (const k of ['unev', 'guides', 'minor', 'spec', 'excess']) {
    const { data, info } = await sharp(path.join(SRC, k + '.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const W = info.width, H = info.height;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4 + 3, ex = Math.min(x, W - 1 - x) / W, ey = Math.min(y, H - 1 - y) / H; data[i] = Math.round(data[i] * ss(0, .04, ex) * ss(0, .06, ey)); }
    for (const w of [820, 1640]) {
      const im = () => sharp(data, { raw: { width: W, height: H, channels: 4 } }).resize({ width: w, kernel: 'lanczos3', withoutEnlargement: true });
      await im().webp({ quality: 86, alphaQuality: 92, effort: 6 }).toFile(path.join(IMG, `thick-${k}-${w}.webp`));
      await im().avif({ quality: 62, effort: 6 }).toFile(path.join(IMG, `thick-${k}-${w}.avif`));
    }
  }
  console.log('exported thickness stills');
})();
