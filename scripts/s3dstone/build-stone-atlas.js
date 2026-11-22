/* OM GROUP - real-stone texture atlas for the 3D stone scenes (assets/s3dstone/real-stone.js).
   Cuts surface patches out of the site's own stone photographs (transparent cut-outs in img/products/), removes the lighting that was in the photo
   (so the 3D scene lights them), and packs 8 patches of 512 px into one 2048 x 1024 atlas:
     cells 0-3  crushed stone  (om-group-60mm-aggregate-single-stone-transparent.png)
     cells 4-5  boulder        (om-group-boulders-hero-transparent.png)
     cells 6-7  boulder, greyer (om-group-boulders-specification-transparent.png)
   Run: node scripts/s3dstone/build-stone-atlas.js     Output: assets/s3dstone/stone-atlas.webp */
const sharp = require('sharp'), path = require('path'), fs = require('fs');
const ROOT = path.resolve(__dirname, '..', '..'), OUT = path.join(ROOT, 'assets', 's3dstone');
const CELL = 512;
fs.mkdirSync(OUT, { recursive: true });

async function windows(file, size, n, seed, ymax) {
  const img = sharp(path.join(ROOT, 'img', 'products', file)).ensureAlpha(), { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, ok = (x, y) => { for (let j = 0; j < size; j += 8) for (let i = 0; i < size; i += 8) if (data[((y + j) * W + x + i) * 4 + 3] < 250) return false; return true; };
  const cand = []; for (let y = 0; y + size < Math.min(H, ymax || H); y += 16) for (let x = 0; x + size < W; x += 16) if (ok(x, y)) cand.push([x, y]);
  if (cand.length < n) throw new Error(file + ': only ' + cand.length + ' opaque windows of ' + size);
  // pick n windows that are far apart (greedy farthest point from a seeded start)
  const pick = [cand[(seed * 7919) % cand.length]];
  while (pick.length < n) { let best = null, bd = -1; for (const c of cand) { const d = Math.min(...pick.map(p => Math.hypot(p[0] - c[0], p[1] - c[1]))); if (d > bd) { bd = d; best = c; } } pick.push(best); }
  return { file, size, pick };
}

async function patch(file, x, y, size, flip) {
  // a flat, evenly lit version of the photo patch: divide by a heavy blur (removes the photo's own light), keep the grain and the colour
  const base = sharp(path.join(ROOT, 'img', 'products', file)).flatten({ background: '#808080' }).extract({ left: x, top: y, width: size, height: size }).resize(CELL, CELL, { kernel: 'lanczos3' });
  const rgb = await base.clone().removeAlpha().raw().toBuffer(), blur = await base.clone().blur(Math.max(10, size / 5)).removeAlpha().raw().toBuffer();
  const out = Buffer.alloc(CELL * CELL * 3); let mean = 0; for (let i = 0; i < blur.length; i++) mean += blur[i]; mean /= blur.length;
  for (let i = 0; i < out.length; i++) out[i] = Math.max(0, Math.min(255, Math.round(rgb[i] * Math.pow(mean / Math.max(24, blur[i]), .8))));
  let s = sharp(out, { raw: { width: CELL, height: CELL, channels: 3 } });
  if (flip & 1) s = s.flop(); if (flip & 2) s = s.flip(); if (flip & 4) s = s.rotate(90);
  return s.png().toBuffer();
}

(async () => {
  const jobs = [
    { f: 'om-group-60mm-aggregate-single-stone-transparent.png', size: 190, n: 4, seed: 3, flips: [0, 1, 2, 3] },
    { f: 'om-group-boulders-hero-transparent.png', size: 300, n: 2, seed: 5, flips: [0, 5] },
    { f: 'om-group-boulders-specification-transparent.png', size: 240, n: 2, seed: 9, flips: [0, 6], ymax: 420 },
  ];
  const tiles = [];
  for (const j of jobs) { const w = await windows(j.f, j.size, j.n, j.seed, j.ymax); console.log(j.f, JSON.stringify(w.pick)); for (let k = 0; k < j.n; k++) tiles.push(await patch(j.f, w.pick[k][0], w.pick[k][1], j.size, j.flips[k])); }
  await sharp({ create: { width: CELL * 4, height: CELL * 2, channels: 3, background: '#808080' } }).composite(tiles.map((b, i) => ({ input: b, left: (i % 4) * CELL, top: Math.floor(i / 4) * CELL }))).webp({ quality: 84, effort: 6 }).toFile(path.join(OUT, 'stone-atlas.webp'));
  console.log('atlas', fs.statSync(path.join(OUT, 'stone-atlas.webp')).size, 'bytes');
})();
