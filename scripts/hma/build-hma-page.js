/* OM GROUP - builds applications/hot-mix-asphalt/index.html (static page, no build step on the site itself).
   Run: node scripts/hma/build-hma-page.js     Pictures: node scripts/hma/export-photos.js first.
   Commercial state: see HMA.verified in lib.js (currently false: educational wording, noindex, no supplier claim). */
const fs = require('fs'), path = require('path');
const T = require('./parts/01-top'), B = require('./parts/02-basics'), P = require('./parts/03-plant'), S = require('./parts/04-site'), C = require('./parts/05-commercial');
const html = [T.top(), B.quick(), B.answers(), B.product(), B.ingredients(), B.types(), B.pavement(), B.binder(), B.grading(), B.jmf(),
  P.plant(), P.batchDrum(), P.process(), P.goa(), S.quality(), S.temperature(), S.transport(), S.preparation(), S.paving(), S.compaction(), S.finished(), S.defects(),
  C.applications(), C.compare(), C.standards(), C.quantity(), C.whyOm(), C.order(), C.faq(), C.enquire(), C.related(), C.footer()].join('');
const out = path.resolve(__dirname, '..', '..', 'applications', 'hot-mix-asphalt');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'index.html'), html);
console.log('wrote applications/hot-mix-asphalt/index.html ' + (html.length / 1024).toFixed(0) + ' KB');
