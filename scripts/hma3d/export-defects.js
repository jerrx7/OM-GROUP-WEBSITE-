/* OM GROUP - Hot Mix Asphalt page: the eight defect stills (_review/hma3d/defect-<key>.png) -> web assets.
   Run after build-defects.py:   node scripts/hma3d/export-defects.js
   -> img/applications/hot-mix-asphalt/hma3d-defect-<key>-{900,1500}.{webp,avif}  (transparent, cropped to the block + margin, floor shadow faded at the edges)
   -> scripts/hma3d/defect-figs.json  (frame size + label anchors re-mapped to the cropped picture, 0-1)   read by scripts/hma/parts/04-site.js */
const path = require('path'), fs = require('fs'), sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..', '..'), SRC = path.join(ROOT, '_review', 'hma3d'), IMG = path.join(ROOT, 'img', 'applications', 'hot-mix-asphalt');
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
(async () => {
  const anch = JSON.parse(fs.readFileSync(path.join(SRC, 'defect-anchors.json'), 'utf8')), figs = {};
  for (const k of ['rut', 'fat', 'the', 'rav', 'ble', 'str', 'seg', 'pot']) {
    const f = path.join(SRC, `defect-${k}.png`); if (!fs.existsSync(f)) { console.log('missing', k); continue; }
    const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); const W = info.width, H = info.height;
    let x0 = W, x1 = 0, y0 = H, y1 = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (data[(y * W + x) * 4 + 3] > 110) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const pad = Math.round(W * .03); x0 = Math.max(0, x0 - pad); x1 = Math.min(W - 1, x1 + pad); y0 = Math.max(0, y0 - pad * 2.2); y1 = Math.min(H - 1, y1 + pad); /* extra headroom: the label sits above the block */
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4 + 3, a = data[i]; if (a >= 250) continue; const m = ss(0, .06, Math.min(x - x0, x1 - x) / cw) * ss(0, .1, Math.min(y - y0, y1 - y) / ch); data[i] = Math.round(a * m); }
    const A = {}; for (const n in anch[k]) A[n] = [+((anch[k][n][0] * W - x0) / cw).toFixed(4), +((anch[k][n][1] * H - y0) / ch).toFixed(4)];
    figs[k] = { w: 1500, h: Math.round(1500 * ch / cw), a: A };
    for (const w of [900, 1500]) {
      const im = () => sharp(data, { raw: { width: W, height: H, channels: 4 } }).extract({ left: x0, top: y0, width: cw, height: ch }).resize({ width: w, kernel: 'lanczos3', withoutEnlargement: true });
      await im().webp({ quality: 86, alphaQuality: 92, effort: 6 }).toFile(path.join(IMG, `hma3d-defect-${k}-${w}.webp`));
      await im().avif({ quality: 62, effort: 5 }).toFile(path.join(IMG, `hma3d-defect-${k}-${w}.avif`));
    }
    console.log(k, cw + 'x' + ch);
  }
  fs.writeFileSync(path.join(__dirname, 'defect-figs.json'), JSON.stringify(figs, null, 1));
})();
