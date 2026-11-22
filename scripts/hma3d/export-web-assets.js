/* OM GROUP - Hot Mix Asphalt page: Blender stills (_review/hma3d/jmf.png, drum.png) -> web assets.
   Run after build-jmf.py / build-drum.py:   node scripts/hma3d/export-web-assets.js
   -> img/applications/hot-mix-asphalt/hma3d-<name>-{1000,1600,2400}.{webp,avif}   (transparent, cropped to the picture + a small margin, floor shadow faded at the edges)
   -> scripts/hma3d/figs.json  (frame size + label anchors re-mapped to the cropped picture, 0-1)   read by scripts/hma/parts/03-plant.js and 02-basics.js */
const path = require('path'), fs = require('fs'), sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..', '..'), SRC = path.join(ROOT, '_review', 'hma3d'), IMG = path.join(ROOT, 'img', 'applications', 'hot-mix-asphalt');
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
(async () => {
  const figs = {};
  for (const k of ['jmf', 'drum']) {
    const f = path.join(SRC, k + '.png'); if (!fs.existsSync(f)) { console.log('missing', k); continue; }
    const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); const W = info.width, H = info.height;
    let x0 = W, x1 = 0, y0 = H, y1 = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (data[(y * W + x) * 4 + 3] > 110) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const pad = Math.round(W * .02); x0 = Math.max(0, x0 - pad); x1 = Math.min(W - 1, x1 + pad); y0 = Math.max(0, y0 - pad); y1 = Math.min(H - 1, y1 + pad);
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {                // soft floor shadow: fade out toward the crop edge (solid content is untouched)
      const i = (y * W + x) * 4 + 3, a = data[i]; if (a >= 250) continue;
      const ex = Math.min(x - x0, x1 - x) / cw, ey = Math.min(y - y0, y1 - y) / ch, m = ss(0, .06, ex) * ss(0, .08, ey);
      data[i] = Math.round(a * m);
    }
    const anch = JSON.parse(fs.readFileSync(path.join(SRC, k + '-anchors.json'), 'utf8')), A = {};
    for (const n in anch) A[n] = [+((anch[n][0] * W - x0) / cw).toFixed(4), +((anch[n][1] * H - y0) / ch).toFixed(4)];
    figs[k] = { w: 2400, h: Math.round(2400 * ch / cw), a: A };
    for (const w of [1000, 1600, 2400]) {
      const im = () => sharp(data, { raw: { width: W, height: H, channels: 4 } }).extract({ left: x0, top: y0, width: cw, height: ch }).resize({ width: w, kernel: 'lanczos3', withoutEnlargement: true });
      await im().webp({ quality: 88, alphaQuality: 94, effort: 6 }).toFile(path.join(IMG, `hma3d-${k}-${w}.webp`));
      await im().avif({ quality: 66, effort: 5 }).toFile(path.join(IMG, `hma3d-${k}-${w}.avif`));
    }
    console.log(k, cw + 'x' + ch, 'ratio', (cw / ch).toFixed(3));
  }
  fs.writeFileSync(path.join(__dirname, 'figs.json'), JSON.stringify(figs, null, 1));
})();
