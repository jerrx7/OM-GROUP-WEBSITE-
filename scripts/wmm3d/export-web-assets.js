/* OM GROUP - Wet Mix Macadam page: Blender stills (_review/wmm3d/*.png) -> web assets.
   Run after scripts/wmm3d/build-road.py (render-all.sh) and build-lab.py:   node scripts/wmm3d/export-web-assets.js
   -> img/applications/wet-mix-macadam/wmx/<name>-{1000,1600,2000}.{webp,avif}  (road scenes, opaque 2:1)
      img/applications/wet-mix-macadam/wmx/lab-<name>-{900,1500}.{webp,avif}       (laboratory scenes, transparent, floor shadow faded out toward the frame edges) */
const path = require('path'), fs = require('fs'), sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..', '..'), SRC = path.join(ROOT, '_review', 'wmm3d'), IMG = path.join(ROOT, 'img', 'applications', 'wet-mix-macadam', 'wmx');
fs.mkdirSync(IMG, { recursive: true });
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const ROAD = ['transport', 'spread', 'roll', 'check', 'thin0', 'thin1', 'med0', 'med1', 'thick0', 'thick1', 'seg0', 'seg1', 'edge'], LAB = ['shape', 'la', 'impact', 'pi'];
(async () => {
  const STILLS = !process.env.ANIMONLY;     // ANIMONLY=1 copies just the motion loops
  for (const k of STILLS ? ROAD : []) {
    const f = path.join(SRC, k + '.png'); if (!fs.existsSync(f)) { console.log('missing', k); continue; }
    for (const w of [1000, 1600, 2000]) {
      const im = () => sharp(f).resize({ width: w, kernel: 'lanczos3', withoutEnlargement: true });
      await im().webp({ quality: 84, effort: 6 }).toFile(path.join(IMG, `${k}-${w}.webp`)); await im().avif({ quality: 56, effort: 5 }).toFile(path.join(IMG, `${k}-${w}.avif`));
    }
  }
  for (const k of STILLS ? LAB : []) {
    const f = path.join(SRC, 'lab-' + k + '.png'); if (!fs.existsSync(f)) { console.log('missing lab-' + k); continue; }
    const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); const W = info.width, H = info.height;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4 + 3, ex = Math.min(x, W - 1 - x) / W, ey = Math.min(y, H - 1 - y) / H; data[i] = Math.round(data[i] * ss(0, .05, ex) * ss(0, .07, ey)); }
    for (const w of [900, 1500]) {
      const im = () => sharp(data, { raw: { width: W, height: H, channels: 4 } }).resize({ width: w, kernel: 'lanczos3', withoutEnlargement: true });
      await im().webp({ quality: 86, alphaQuality: 92, effort: 6 }).toFile(path.join(IMG, `lab-${k}-${w}.webp`)); await im().avif({ quality: 62, effort: 5 }).toFile(path.join(IMG, `lab-${k}-${w}.avif`));
    }
  }
  const AN = path.join(SRC, 'anim'), OUTA = path.join(IMG, 'anim'); fs.mkdirSync(OUTA, { recursive: true });
  if (fs.existsSync(AN)) for (const f of fs.readdirSync(AN)) if (/.(mp4|json)$/.test(f)) fs.copyFileSync(path.join(AN, f), path.join(OUTA, f));   // motion loops + their per-frame pin / bar tables
  console.log('exported road + lab stills and motion loops');
})();
