/* OM GROUP - compression machine: turn the Blender stills (_review/machine3d) into web assets.
   Run after scripts/machine3d/build-compression-machine.py:   node scripts/machine3d/export-web-assets.js
   - assets/3d/compression-machine-shadow.webp        contact shadow (alpha of the shadow-catcher render, as greyscale)
   - assets/3d/compression-machine-studio.webp        the empty studio (backdrop + polished floor) the live canvas sits on
   - img/applications/6mm-aggregates/compression-machine-{1000,1600,2400}.{webp,avif}   the full Cycles still (loading state / no WebGL) */
const path = require('path'), fs = require('fs'), sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..', '..'), SRC = path.join(ROOT, '_review', 'machine3d'), IMG = path.join(ROOT, 'img', 'applications', '6mm-aggregates');
(async () => {
  await sharp(path.join(SRC, 'shadow.png')).ensureAlpha().extractChannel('alpha').resize(1024, null, { kernel: 'lanczos3' }).blur(0.6).toColourspace('b-w')
    .webp({ quality: 86 }).toFile(path.join(ROOT, 'assets', '3d', 'compression-machine-shadow.webp'));
  await sharp(path.join(SRC, 'studio-bg.png')).resize(1400, null, { kernel: 'lanczos3' }).webp({ quality: 88, effort: 6 }).toFile(path.join(ROOT, 'assets', '3d', 'compression-machine-studio.webp'));
  for (const w of [1000, 1600, 2400]) {
    const im = () => sharp(path.join(SRC, 'poster.png')).resize({ width: w, kernel: 'lanczos3', withoutEnlargement: true });
    await im().webp({ quality: 86, effort: 6 }).toFile(path.join(IMG, 'compression-machine-' + w + '.webp'));
    await im().avif({ quality: 62, effort: 6 }).toFile(path.join(IMG, 'compression-machine-' + w + '.avif'));
  }
  const sizes = fs.readdirSync(IMG).filter(f => f.startsWith('compression-machine-')).map(f => f + ' ' + fs.statSync(path.join(IMG, f)).size);
  console.log(sizes.join('\n')); for (const f of ['shadow', 'studio']) console.log(f, fs.statSync(path.join(ROOT, 'assets', '3d', 'compression-machine-' + f + '.webp')).size);
})();
