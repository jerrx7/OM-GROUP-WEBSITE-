/* OM GROUP - Plaster Sand page, "Decorative and textured rendering": Blender stills (_review/finish3d) -> web assets.
   Run after scripts/finish3d/build-finish.py:   node scripts/finish3d/export-web-assets.js
   -> img/applications/plaster-sand/finish-<plain|scraped|textured|deco|lime>-{800,1600}.{webp,avif} */
const path = require('path'), sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..', '..'), SRC = path.join(ROOT, '_review', 'finish3d'), IMG = path.join(ROOT, 'img', 'applications', 'plaster-sand');
(async () => {
  for (const k of ['plain', 'scraped', 'textured', 'deco', 'lime']) for (const w of [800, 1600]) {
    const im = () => sharp(path.join(SRC, k + '.png')).resize({ width: w, kernel: 'lanczos3', withoutEnlargement: true });
    await im().webp({ quality: 85, effort: 6 }).toFile(path.join(IMG, `finish-${k}-${w}.webp`));
    await im().avif({ quality: 60, effort: 6 }).toFile(path.join(IMG, `finish-${k}-${w}.avif`));
  }
  console.log('exported finish stills');
})();
