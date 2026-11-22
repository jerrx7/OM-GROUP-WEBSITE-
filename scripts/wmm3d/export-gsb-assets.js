/* OM GROUP - Granular Sub-base page: Blender posters + motion loops -> web assets.   node scripts/wmm3d/export-gsb-assets.js
   _review/wmm3d/lab-gsb-<scene>-poster.png -> img/applications/granular-sub-base/gsbx/<scene>-{1000,1600,2000}.{webp,avif}
   _review/wmm3d/anim/lab-gsb-<scene>.{mp4,json} -> img/applications/granular-sub-base/gsbx/ */
const path = require('path'), fs = require('fs'), sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..', '..'), SRC = path.join(ROOT, '_review', 'wmm3d'), IMG = path.join(ROOT, 'img', 'applications', 'granular-sub-base', 'gsbx');
fs.mkdirSync(IMG, { recursive: true });
(async () => {
  for (const k of ['load', 'filter', 'drain', 'drainoff']) {
    const f = path.join(SRC, `lab-gsb-${k}-poster.png`); if (!fs.existsSync(f)) { console.log('missing poster', k); continue; }
    for (const w of [1000, 1600, 2000]) {
      const im = () => sharp(f).resize({ width: w, kernel: 'lanczos3', withoutEnlargement: true });
      await im().webp({ quality: 84, effort: 6 }).toFile(path.join(IMG, `${k}-${w}.webp`)); await im().avif({ quality: 58, effort: 5 }).toFile(path.join(IMG, `${k}-${w}.avif`));
    }
    for (const e of ['mp4', 'json']) { const a = path.join(SRC, 'anim', `lab-gsb-${k}.${e}`); if (fs.existsSync(a)) fs.copyFileSync(a, path.join(IMG, `lab-gsb-${k}.${e}`)); else console.log('missing', path.basename(a)); }
  }
  console.log('exported GSB posters and loops');
})();
