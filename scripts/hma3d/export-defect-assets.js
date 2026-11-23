/* OM GROUP - Hot Mix Asphalt page: the eight defect cut-aways (_review/hma3d/def-<key>.png from build-defects.py) -> web assets.
   Run:  node scripts/hma3d/export-defect-assets.js
   -> img/applications/hot-mix-asphalt/hma-def-<key>-{720,1200,1880}.{webp,avif}   (transparent; one shared crop so all eight cards line up; floor shadow faded at the crop edge)
   -> scripts/hma3d/defs.json   (crop size + annotation anchors re-mapped to the crop, 0-1)   read by scripts/hma3d/def-figs.js */
const path = require('path'), fs = require('fs'), sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..', '..'), SRC = path.join(ROOT, '_review', 'hma3d'), IMG = path.join(ROOT, 'img', 'applications', 'hot-mix-asphalt');
const KEYS = ['rut', 'fat', 'the', 'rav', 'ble', 'str', 'seg', 'pot'];
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
(async () => {
  const defs = { keys: KEYS, items: {} };
  for (const k of KEYS) {
    const f = path.join(SRC, 'def-' + k + '.png'); if (!fs.existsSync(f)) { console.log('missing', k); continue; }
    const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); const W = info.width, H = info.height;
    const x0 = Math.round(W * .03), x1 = Math.round(W * .97), y0 = Math.round(H * .05), y1 = Math.round(H * .93), cw = x1 - x0, ch = y1 - y0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4 + 3, a = data[i]; if (a >= 250) continue;
      const ex = Math.min(x - x0, x1 - x) / cw, ey = Math.min(y - y0, y1 - y) / ch;
      data[i] = Math.round(a * ss(0, .05, ex) * ss(0, .07, ey));
    }
    const anch = JSON.parse(fs.readFileSync(path.join(SRC, 'def-' + k + '-anchors.json'), 'utf8')), A = {};
    for (const n in anch) A[n] = [+((anch[n][0] * W - x0) / cw).toFixed(4), +((anch[n][1] * H - y0) / ch).toFixed(4)];
    defs.w = cw; defs.h = ch; defs.items[k] = A;
    for (const w of [720, 1200, 1880]) {
      const im = () => sharp(data, { raw: { width: W, height: H, channels: 4 } }).extract({ left: x0, top: y0, width: cw, height: ch }).resize({ width: w, kernel: 'lanczos3', withoutEnlargement: true });
      await im().webp({ quality: 86, alphaQuality: 92, effort: 6 }).toFile(path.join(IMG, `hma-def-${k}-${w}.webp`));
      await im().avif({ quality: 62, effort: 5 }).toFile(path.join(IMG, `hma-def-${k}-${w}.avif`));
    }
    console.log(k, 'ok');
  }
  fs.writeFileSync(path.join(__dirname, 'defs.json'), JSON.stringify(defs));
})();
