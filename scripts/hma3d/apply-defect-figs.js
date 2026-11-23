/* OM GROUP - swaps the eight flat defect SVGs on applications/hot-mix-asphalt/index.html for the Blender cut-away stills (def-figs.js).
   Edits the live page in place (the page generator is NOT used: it is behind the live HTML).  Idempotent: exits if the figures were already replaced.
   Run: node scripts/hma3d/apply-defect-figs.js [--dry] */
const fs = require('fs'), path = require('path');
const { figHtml, KEYS } = require('./def-figs');
const f = path.resolve(__dirname, '..', '..', 'applications', 'hot-mix-asphalt', 'index.html');
let h = fs.readFileSync(f, 'utf8');
const re = /<div class="hma-def-fig">[\s\S]*?(?=<div class="hma-def-tx">)/g;
const m = h.match(re) || [];
if (m.length !== 8) { console.log('expected 8 old SVG figures, found ' + m.length + ' (already replaced?)'); process.exit(1); }
let i = 0; h = h.replace(re, () => figHtml(KEYS[i++]));
const t1 = 'Each card shows a technical cross-section of the defect, its common contributing factors and the considerations that help control it.';
const t2 = 'The drawings are simplified cross-sections, not to scale.';
const c1 = h.split(t1).length - 1, c2 = h.split(t2).length - 1;
if (c1 + c2 > 0 && (c1 < 1 || c2 !== 1)) { console.log('text anchors not found', c1, c2); process.exit(1); }
h = h.split(t1).join('Each card shows a cut-away of the pavement with the defect, its common contributing factors and the considerations that help control it.').split(t2).join('The pictures are cut-away views, not to scale.');
if (process.argv.includes('--dry')) { console.log('dry run ok, 8 figures'); process.exit(0); }
fs.writeFileSync(f, h); console.log('replaced 8 figures');
