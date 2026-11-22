/* OM GROUP - rebar box: turn the Blender stills (_review/rebar3d) into web assets.
   Run after scripts/rebar3d/build-rebar-box.py:   node scripts/rebar3d/export-web-assets.js
   - assets/3d/rebar-box-shadow.webp        contact shadow (alpha of the shadow-catcher render, as greyscale)
   - assets/3d/rebar-box-studio.webp        the empty studio (grid wall + polished floor) the live canvas sits on
   - img/applications/10mm-aggregates/rebar-box-{1000,1600,2400}.{webp,avif}   the full Cycles still (loading state / no WebGL) */
const path = require('path'), fs = require('fs'), sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..', '..'), SRC = path.join(ROOT, '_review', 'rebar3d'), IMG = path.join(ROOT, 'img', 'applications', '10mm-aggregates');
(async () => {
  /* the contact shadow: the catcher's alpha carries a faint ambient tint out to the plane's border, which would print a hard-edged slab on the floor.
     Remove the ambient floor level (the darkest border value) and fade the rest to zero toward the border with an elliptical window. */
  const { data, info } = await sharp(path.join(SRC, 'shadow.png')).ensureAlpha().extractChannel('alpha').resize(1024, null, { kernel: 'lanczos3' }).blur(0.6).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height; let amb = 255;
  for (let x = 0; x < W; x++) { amb = Math.min(amb, data[x], data[(H - 1) * W + x]); }
  for (let y = 0; y < H; y++) { amb = Math.min(amb, data[y * W], data[y * W + W - 1]); }
  const out = Buffer.alloc(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const nx = (x + .5) / W * 2 - 1, ny = (y + .5) / H * 2 - 1, r = Math.hypot(nx, ny), t = Math.min(1, Math.max(0, (1 - r) / .45)), win = t * t * (3 - 2 * t);
    out[y * W + x] = Math.round(Math.max(0, data[y * W + x] - amb) * win);
  }
  await sharp(out, { raw: { width: W, height: H, channels: 1 } }).toColourspace('b-w').webp({ quality: 86 }).toFile(path.join(ROOT, 'assets', '3d', 'rebar-box-shadow.webp'));
  await sharp(path.join(SRC, 'studio-bg.png')).resize(1600, null, { kernel: 'lanczos3' }).webp({ quality: 90, effort: 6 }).toFile(path.join(ROOT, 'assets', '3d', 'rebar-box-studio.webp'));
  for (const w of [1000, 1600, 2400]) {
    const im = () => sharp(path.join(SRC, 'poster.png')).resize({ width: w, kernel: 'lanczos3', withoutEnlargement: true });
    await im().webp({ quality: 88, effort: 6 }).toFile(path.join(IMG, 'rebar-box-' + w + '.webp'));
    await im().avif({ quality: 64, effort: 6 }).toFile(path.join(IMG, 'rebar-box-' + w + '.avif'));
  }
  const sizes = fs.readdirSync(IMG).filter(f => f.startsWith('rebar-box-')).map(f => f + ' ' + fs.statSync(path.join(IMG, f)).size);
  console.log(sizes.join('\n')); for (const f of ['shadow', 'studio']) console.log(f, fs.statSync(path.join(ROOT, 'assets', '3d', 'rebar-box-' + f + '.webp')).size);
})();
