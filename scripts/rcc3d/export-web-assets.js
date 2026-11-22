/* OM GROUP - RCC members: turn the Blender stills (_review/rcc3d) into web assets.
   Run after scripts/rcc3d/build-rcc-members.py:   node scripts/rcc3d/export-web-assets.js
   - img/applications/20mm-aggregates/rcc-{member}-poster-{1000,1400,2100}.webp   the Cycles still (object + soft shadow, transparent), loading state / no WebGL
   - img/applications/20mm-aggregates/rcc-{member}-shadow-1000.webp               the soft shadow alone, under the live canvas
   The stills are clipped by the frame, so their alpha is feathered to zero toward the frame edges (no visible rectangle) and faint noise (below 7 %) is cut; shadow RGB is forced to black and written `exact` so lossy WebP cannot turn it pale. */
const path = require('path'), fs = require('fs'), sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..', '..'), SRC = path.join(ROOT, '_review', 'rcc3d'), IMG = path.join(ROOT, 'img', 'applications', '20mm-aggregates');
async function feathered(file, w, black) {
  const base = sharp(file).resize({ width: w, kernel: 'lanczos3', withoutEnlargement: true }).ensureAlpha();
  const { data, info } = await base.raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, out = Buffer.from(data), fx = Math.round(W * .06), fy = Math.round(H * .08);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4 + 3; let a = out[i] / 255;
    const e = Math.min(1, x / fx, (W - 1 - x) / fx, y / fy, (H - 1 - y) / fy), s = e * e * (3 - 2 * e);
    a = Math.max(0, (a - .07) / .93); out[i] = Math.round(255 * a * s); if (black) { out[i - 3] = out[i - 2] = out[i - 1] = 0; }
  }
  return sharp(out, { raw: { width: W, height: H, channels: 4 } });
}
(async () => {
  fs.mkdirSync(IMG, { recursive: true });
  for (const k of ['slab', 'beam', 'column']) {
    for (const w of [1000, 1400, 2100]) await (await feathered(path.join(SRC, k + '-poster.png'), w)).webp({ quality: 88, alphaQuality: 92, effort: 6, exact: true }).toFile(path.join(IMG, `rcc-${k}-poster-${w}.webp`));
    await (await feathered(path.join(SRC, k + '-shadow.png'), 1000, true)).blur(.6).webp({ quality: 80, alphaQuality: 90, effort: 6, exact: true }).toFile(path.join(IMG, `rcc-${k}-shadow-1000.webp`));
  }
  console.log(fs.readdirSync(IMG).filter(f => f.startsWith('rcc-')).map(f => f + ' ' + fs.statSync(path.join(IMG, f)).size).join('\n'));
  for (const k of ['slab', 'beam', 'column']) console.log('glb', k, fs.statSync(path.join(ROOT, 'assets', '3d', `rcc-${k}.glb`)).size);
})();
