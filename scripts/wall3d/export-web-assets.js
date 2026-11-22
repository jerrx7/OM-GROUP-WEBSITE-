/* OM GROUP - Plaster Sand page, "Why plaster cracks" + "What can go wrong": Blender stills (_review/wall3d) -> web assets.
   Run after scripts/wall3d/build-wall.py:   node scripts/wall3d/export-web-assets.js
   -> img/applications/plaster-sand/wall-<ck_water|...|df_ceil>-{660,1320}.{webp,avif} */
const path = require('path'), fs = require('fs'), sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..', '..'), SRC = path.join(ROOT, '_review', 'wall3d'), IMG = path.join(ROOT, 'img', 'applications', 'plaster-sand');
(async () => {
  for (const f of fs.readdirSync(SRC).filter(f => /^(ck|df)_.*\.png$/.test(f))) {
    const k = f.replace(/\.png$/, '');
    for (const w of [660, 1320]) {
      const im = () => sharp(path.join(SRC, f)).resize({ width: w, kernel: 'lanczos3', withoutEnlargement: true });
      await im().webp({ quality: 84, effort: 6 }).toFile(path.join(IMG, `wall-${k}-${w}.webp`));
      await im().avif({ quality: 58, effort: 6 }).toFile(path.join(IMG, `wall-${k}-${w}.avif`));
    }
  }
  console.log('exported wall stills');
})();
