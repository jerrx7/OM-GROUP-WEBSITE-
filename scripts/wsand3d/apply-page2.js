/* Swaps the three flat cross-section SVGs (.wsd-xs) on the Washed Sand page for the Blender stills + overlay (.wsd-x3).
   Reads _review/wsand3d/layout2.json (normalised polygons / anchors from build-wsand2.py). Run once on a page that still has the .wsd-xs figures. */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..'), PAGE = path.join(ROOT, 'applications', 'washed-sand', 'index.html');
const L = JSON.parse(fs.readFileSync(path.join(ROOT, '_review', 'wsand3d', 'layout2.json'), 'utf8'));
let s = fs.readFileSync(PAGE, 'utf8');
const W = 2080, H = 990;
const pts = a => a.map(p => `${(p[0] * W).toFixed(0)},${(p[1] * H).toFixed(0)}`).join(' ');
const poly = (sc, k, cls = 'hl') => `<polygon class="${cls}" points="${pts(L[sc].poly[k])}"/>`;
const pill = (sc, k, text, dx = 0, dy = 0) => { const a = L[sc].anc[k][0]; return `<span class="wx-lb" style="left:${(a[0] * 100 + dx).toFixed(1)}%;top:${(a[1] * 100 + dy).toFixed(1)}%">${text}</span>`; };
const pic = img => `<picture><source type="image/avif" srcset="/img/applications/washed-sand/x3-${img}-1040.avif 1040w, /img/applications/washed-sand/x3-${img}-2080.avif 2080w" sizes="(max-width:820px) 92vw, 780px"><img src="/img/applications/washed-sand/x3-${img}-1040.webp" srcset="/img/applications/washed-sand/x3-${img}-1040.webp 1040w, /img/applications/washed-sand/x3-${img}-2080.webp 2080w" sizes="(max-width:820px) 92vw, 780px" width="2080" height="990" alt="" loading="lazy" decoding="async"></picture>`;
const build = (k, f) => {
  let img, ov = '', lb = '';
  if (k === 'screed') {
    img = 'screed';
    ov = poly('screed', 'sub', 'hl hz-sub') + poly('screed', 'scr1', 'hl hz-screed') + poly('screed', 'scr2', 'hl hz-screed') + poly('screed', 'fin1', 'hl hz-finish') + poly('screed', 'fin2', 'hl hz-finish') + poly('screed', 'joint', 'hl hz-joint');
    lb = pill('screed', 'sub', 'Prepared substrate') + pill('screed', 'screed', 'Screed layer') + pill('screed', 'finish', 'Floor finish') + pill('screed', 'joint', 'Movement joint');
  } else if (k === 'bed') {
    const pave = f === 'pave'; img = pave ? 'bedpave' : 'bed'; const sc = img;
    ov = poly(sc, 'bed', 'hl hz-bed') + (pave ? poly(sc, 'pave', 'hl hz-pave') : '');
    lb = pill(sc, 'soil', 'Surrounding material', 8, 0) + pill(sc, 'bedmat', 'Bedding material') + pill(sc, 'pipe', 'pipe');
  } else {
    img = 'filter';
    ov = poly('filter', 'soil', 'hl hz-soil') + poly('filter', 'filter', 'hl hz-filter') + poly('filter', 'drain', 'hl hz-drain');
    const a = L.filter.anc.flow0[0], b = L.filter.anc.flow1[0];
    ov += `<path class="wx-flow" d="M${(a[0] * W).toFixed(0)} ${(a[1] * H).toFixed(0)}L${(b[0] * W - 40).toFixed(0)} ${(b[1] * H - 4).toFixed(0)}"/><path class="wx-flow wx-head" d="M${(b[0] * W - 66).toFixed(0)} ${(b[1] * H - 30).toFixed(0)}l36 26-38 22"/>`;
    lb = pill('filter', 'soil', 'Surrounding soil') + pill('filter', 'filter', 'Filter layer') + pill('filter', 'drain', 'Drain');
  }
  return { img, ov, lb };
};
let n = 0;
s = s.replace(/<svg class="wsd-xs" data-k="(\w+)" data-f="(\w+)" viewBox="0 0 520 190" role="img" aria-label="([^"]*)" focusable="false">[\s\S]*?<\/svg>/g, (m, k, f, al) => {
  n++; const { img, ov, lb } = build(k, f);
  return `<div class="wsd-x3" data-k="${k}" data-f="${f}" role="img" aria-label="${al}">${pic(img)}<svg class="wx-o" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">${ov}</svg>${lb}</div>`;
});
console.log('replaced', n); fs.writeFileSync(PAGE, s);
