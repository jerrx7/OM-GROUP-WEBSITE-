/* OM GROUP - swaps the flat prime-coat / tack-coat SVGs and the three flat "cut face of the mat" SVGs on applications/hot-mix-asphalt/index.html
   for the Blender cut-away stills (layer-figs.js).  Edits the live page in place (the page generator is behind the live HTML).
   Run: node scripts/hma3d/apply-layer-figs.js [--dry]     Exits without writing if the figures were already replaced. */
const fs = require('fs'), path = require('path');
const { figHtml } = require('./layer-figs');
const f = path.resolve(__dirname, '..', '..', 'applications', 'hot-mix-asphalt', 'index.html');
let h = fs.readFileSync(f, 'utf8');
const rePrime = /<svg viewBox="0 0 300 150" role="img" aria-label="Prime coat:[\s\S]*?<\/svg>/g;
const reTack = /<svg viewBox="0 0 300 150" role="img" aria-label="Tack coat:[\s\S]*?<\/svg>/g;
const reCut = /<svg viewBox="0 0 300 160" role="img" aria-label="Aggregate arrangement in the asphalt mat[\s\S]*?<\/svg>/g;
const n = [h.match(rePrime), h.match(reTack), h.match(reCut)].map(m => (m || []).length);
if (n[0] !== 1 || n[1] !== 1 || n[2] !== 3) { console.log('expected 1 prime, 1 tack, 3 cut-face SVGs, found', n.join('/'), '(already replaced?)'); process.exit(1); }
h = h.replace(rePrime, () => figHtml('prime')).replace(reTack, () => figHtml('tack'));
let i = 0; h = h.replace(reCut, () => figHtml('cf' + i++));
const cap = 'Schematic cut faces, not to scale. No density value is shown.';
if (h.split(cap).length !== 2) { console.log('caption not found'); process.exit(1); }
h = h.replace(cap, 'Cut faces of the mat, not to scale. No density value is shown.');
if (process.argv.includes('--dry')) { console.log('dry run ok: 5 figures + caption'); process.exit(0); }
fs.writeFileSync(f, h); console.log('replaced 5 figures');
