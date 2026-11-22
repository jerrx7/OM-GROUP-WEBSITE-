/* OM GROUP - plastering kit: the plaster surface sets (rough coat, floated, sponge finish) from Blender's numpy textures to webp.
   Run after scripts/plaster3d/build-plaster-kit.py:   node scripts/plaster3d/export-web-assets.js   ->  assets/plaster3d/pl-c{1,2,3}-{a,n}.webp */
const path = require('path'), sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..', '..'), SRC = path.join(ROOT, '_review', 'plaster3d', 'tex'), OUT = path.join(ROOT, 'assets', 'plaster3d');
(async () => {
  for (const k of ['c1', 'c2', 'c3']) {
    await sharp(path.join(SRC, `pl-${k}-a.png`)).webp({ quality: 84, effort: 6 }).toFile(path.join(OUT, `pl-${k}-a.webp`));
    await sharp(path.join(SRC, `pl-${k}-n.png`)).webp({ quality: 90, effort: 6 }).toFile(path.join(OUT, `pl-${k}-n.webp`));
  }
  console.log('exported plaster textures');
})();
