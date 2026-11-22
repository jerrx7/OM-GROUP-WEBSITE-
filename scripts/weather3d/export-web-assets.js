/* OM GROUP - Plaster Sand page, "What the Weather Does to a Render": Blender stills (_review/weather3d) -> web assets.
   Run after scripts/weather3d/build-weather.py:   node scripts/weather3d/export-web-assets.js
   -> img/applications/plaster-sand/weather-<rain|wind|sun|temp|wetdry|moist>-{1040,2080}.{webp,avif} */
const path = require('path'), sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..', '..'), SRC = path.join(ROOT, '_review', 'weather3d'), IMG = path.join(ROOT, 'img', 'applications', 'plaster-sand');
(async () => {
  for (const k of ['rain', 'wind', 'sun', 'temp', 'wetdry', 'moist']) for (const w of [1040, 2080]) {
    const im = () => sharp(path.join(SRC, k + '.png')).resize({ width: w, kernel: 'lanczos3', withoutEnlargement: true });
    await im().webp({ quality: 84, effort: 6 }).toFile(path.join(IMG, `weather-${k}-${w}.webp`));
    await im().avif({ quality: 58, effort: 6 }).toFile(path.join(IMG, `weather-${k}-${w}.avif`));
  }
  console.log('exported weather stills');
})();
