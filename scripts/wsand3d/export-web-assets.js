/* OM GROUP - Washed Sand page, "Two Different Processing Functions": Blender stills (_review/wsand3d/{wash,screen}.png) -> web assets.
   Run after scripts/wsand3d/build-wsand.py (once with VIEW=wash, once with VIEW=screen):   node scripts/wsand3d/export-web-assets.js
   -> img/applications/washed-sand/wvs-<wash|screen>-{740,1480}.{webp,avif}   transparent, floor shadow faded out toward the frame edges */
const path = require('path'), sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..', '..'), SRC = path.join(ROOT, '_review', 'wsand3d'), IMG = path.join(ROOT, 'img', 'applications', 'washed-sand');
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
(async () => {
  for (const k of ['wash', 'screen']) {
    const { data, info } = await sharp(path.join(SRC, k + '.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const W = info.width, H = info.height;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4 + 3, ex = Math.min(x, W - 1 - x) / W, ey = Math.min(y, H - 1 - y) / H;
      data[i] = Math.round(data[i] * ss(0.0, 0.05, ex) * ss(0.0, 0.07, ey));
    }
    for (const w of [740, 1480]) {
      const im = () => sharp(data, { raw: { width: W, height: H, channels: 4 } }).resize({ width: w, kernel: 'lanczos3', withoutEnlargement: true });
      await im().webp({ quality: 86, alphaQuality: 92, effort: 6 }).toFile(path.join(IMG, `wvs-${k}-${w}.webp`));
      await im().avif({ quality: 62, effort: 6 }).toFile(path.join(IMG, `wvs-${k}-${w}.avif`));
    }
  }
  console.log('exported washing / screening stills');
})();
