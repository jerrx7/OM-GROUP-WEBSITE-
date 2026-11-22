/* OM GROUP - Concrete Sand page, seven-factor widget: Blender stills (_review/csx) -> web assets.
   Run after scripts/csx3d/build-csx.py:   node scripts/csx3d/export-web-assets.js
   -> img/applications/concrete-sand/inside-{base,sand,paste}-{880,1760}.{webp,avif} */
const path = require('path'), sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..', '..'), SRC = path.join(ROOT, '_review', 'csx'), IMG = path.join(ROOT, 'img', 'applications', 'concrete-sand');
(async () => {
  for (const k of ['base', 'sand', 'paste']) for (const w of [880, 1760]) {
    const im = () => sharp(path.join(SRC, k + '.png')).resize({ width: w, kernel: 'lanczos3', withoutEnlargement: true });
    await im().webp({ quality: 84, effort: 6 }).toFile(path.join(IMG, `inside-${k}-${w}.webp`));
    await im().avif({ quality: 60, effort: 6 }).toFile(path.join(IMG, `inside-${k}-${w}.avif`));
  }
  console.log('exported concrete section stills');
})();
