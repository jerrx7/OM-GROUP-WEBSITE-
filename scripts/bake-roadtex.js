/* Paints the seamless road-material tiles once and saves them as images: assets/road-tex/<kind>-c.webp (colour) and <kind>-b.webp (bump).
   Painting them in the page cost 200-400 ms of main-thread time per tile every time a figure was built (a scroll stall of seconds on the WMM / GSB pages).
     node scripts/bake-roadtex.js          (needs the preview server: node .static-serve.js, and Playwright)  */
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, '..', 'assets', 'road-tex'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 800, height: 600 } })).newPage();
  await p.goto('http://localhost:4173/applications/m-sand/', { waitUntil: 'domcontentloaded' });
  const kinds = await p.evaluate(async () => { const m = await import('/assets/application-s3d-rdkit.js'); window.__rk = m; return Object.keys(m.TILE_SEED); });
  for (const k of kinds) {
    const r = await p.evaluate(({ k }) => { const m = window.__rk, t = m.aggTex(k, m.TILE_SEED[k]); return { c: t.map.image.toDataURL('image/webp', .84), b: t.bump.image.toDataURL('image/webp', .7) }; }, { k });
    fs.writeFileSync(path.join(OUT, k + '-c.webp'), Buffer.from(r.c.split(',')[1], 'base64')); fs.writeFileSync(path.join(OUT, k + '-b.webp'), Buffer.from(r.b.split(',')[1], 'base64'));
    console.log(k, Math.round(fs.statSync(path.join(OUT, k + '-c.webp')).size / 1024) + ' KB colour', Math.round(fs.statSync(path.join(OUT, k + '-b.webp')).size / 1024) + ' KB bump');
  }
  /* the cut face of each GSB grading (cylinders of the grading figure) */
  const names = await p.evaluate(async () => { const rf = await import('/assets/application-s3d-rdfrac.js'); window.__rf = rf; return Object.keys(rf.GR); });
  for (const [i, n] of names.entries()) {
    const r = await p.evaluate(({ n, i }) => { const t = window.__rk.aggTex('gsb', 1000 + i, 1024, window.__rf.gradeRadii(n)); return { c: t.map.image.toDataURL('image/webp', .84), b: t.bump.image.toDataURL('image/webp', .7) }; }, { n, i });
    fs.writeFileSync(path.join(OUT, 'g-' + n + '-c.webp'), Buffer.from(r.c.split(',')[1], 'base64')); fs.writeFileSync(path.join(OUT, 'g-' + n + '-b.webp'), Buffer.from(r.b.split(',')[1], 'base64'));
    console.log('g-' + n, Math.round(fs.statSync(path.join(OUT, 'g-' + n + '-c.webp')).size / 1024) + ' KB colour');
  }
  await b.close();
})();
