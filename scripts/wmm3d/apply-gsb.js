/* OM GROUP - Granular Sub-base page: swaps the three real-time water / load figures (data-s3d="rdwater") for the photoreal Blender loops (build-gsb.py + render-gsb.sh).
   Run after:  node scripts/wmm3d/export-gsb-assets.js      then:  node scripts/wmm3d/apply-gsb.js     (keeps the controls and text panels; only the figure changes; keep a backup, it only works on a page that still has the original boxes) */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..'), PAGE = path.join(ROOT, 'applications', 'granular-sub-base', 'index.html'), SRC = path.join(ROOT, '_review', 'wmm3d'), AN = path.join(SRC, 'anim');
const IMG = '/img/applications/granular-sub-base/gsbx/';
const J = n => JSON.parse(fs.readFileSync(path.join(AN, n + '.json'), 'utf8'));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const pct = p => `left:${(p[0] * 100).toFixed(2)}%;top:${(p[1] * 100).toFixed(2)}%`;
const mark = (p, n, key = '', when = '') => (p && p[0] > .015 && p[0] < .985 && p[1] > .02 && p[1] < .98) ? `<span class="wmx-n"${key ? ` data-pin="${key}"` : ''}${when ? ` data-when="${when}"` : ''} style="${pct(p)}" aria-hidden="true">${n}</span>` : '';
const legend = items => items.map(([n, t, when, cls]) => `<li${when ? ` data-when="${when}"` : ''}><i${cls ? ` class="${cls}"` : ''}>${n}</i><span>${t}</span></li>`).join('');
function pic(name, alt) {
  const sz = [1000, 1600, 2000], ext = e => sz.map(w => `${IMG}${name}-${w}.${e} ${w}w`).join(', '), sizes = '(max-width:1000px) 92vw, 62vw';
  return `<picture><source type="image/avif" srcset="${ext('avif')}" sizes="${sizes}" /><img src="${IMG}${name}-1600.webp" srcset="${ext('webp')}" sizes="${sizes}" width="2000" height="1000" alt="${esc(alt)}" loading="lazy" decoding="async" /></picture>`;
}
const vid = name => `<video class="wmx-vid" muted loop playsinline preload="none" disableremoteplayback tabindex="-1" aria-hidden="true" data-src="${IMG}${name}.mp4" data-pins="${IMG}${name}.json"></video>`;
const stage = inner => `<div class="s3d-stage wmx-stage" data-ar="road">${inner}</div>`;
const DEFS = `<svg class="wmx-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs><linearGradient id="wmxw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff5e29" stop-opacity=".62"/><stop offset=".5" stop-color="#ff5e29" stop-opacity=".26"/><stop offset="1" stop-color="#ff5e29" stop-opacity=".06"/></linearGradient></defs></svg>`;

/* ---------------- the three figures ---------------- */
function W_LOAD() {
  const P = J('lab-gsb-load'), st = P.static, f = k => (P[k] || [[0, 0]])[0], alt = 'A cut-away pavement, surface course, base course, granular sub-base and subgrade, with a truck tyre rolling on the surface and an orange wedge showing the load spreading downwards.';
  const wedge = `<svg class="wmx-fx wmx-wedge" viewBox="0 0 100 50" preserveAspectRatio="none" aria-hidden="true" focusable="false"><polygon data-pts="wa,wl,wr" points="${[f('wa'), f('wl'), f('wr')].map(p => (p[0] * 100).toFixed(2) + ',' + (p[1] * 50).toFixed(2)).join(' ')}" fill="url(#wmxw)"/></svg>`;
  const marks = mark(f('wheel'), 1, 'wheel') + mark(st.s, 2) + mark(st.b, 3) + mark(st.g, 4) + mark(st.u, 5);
  return { first: true, stage: stage(`${pic('load', alt)}${vid('lab-gsb-load')}${wedge}${marks}`), legend: legend([[1, 'Tyre contact area'], [2, 'Surface'], [3, 'Base course'], [4, 'GSB'], [5, 'Subgrade']]) };
}
function W_FILTER() {
  const P = J('lab-gsb-filter'), st = P.static, alt = 'Two glass test boxes side by side. On the left a filter layer holds the fine soil particles back while water passes; on the right the fines migrate up into the voids between the stones.';
  const marks = mark(st.a, 1) + mark(st.b, 2) + mark(st.f, 3) + mark(st.s, 4) + mark(st.g, 5);
  return { stage: stage(`${pic('filter', alt)}${vid('lab-gsb-filter')}${marks}`), legend: legend([[1, 'Compatible: fines retained, water moves'], [2, 'Incompatible: fines migrate, voids restrict'], [3, 'Filter layer'], [4, 'Soil'], [5, 'Granular layer']]) };
}
function W_DRAIN() {
  const on = J('lab-gsb-drain').static, off = J('lab-gsb-drainoff').static;
  const view = (name, s, outlet) => `<div class="wmx-view" data-when="outlet:${outlet}">${pic(name, outlet ? 'A cut section with a laterite subgrade, an open granular drainage layer and a base course with a crack: water enters at the crack, moves through the voids and leaves through an edge outlet.' : 'The same section with the edge outlet closed: the water collects in the drainage layer.')}${vid('lab-gsb-' + name)}${mark(s.c, 1)}${mark(s.b, 2)}${mark(s.d, 3)}${mark(s.s, 4)}${outlet ? mark(s.o, 5) : ''}</div>`;
  return { stage: stage(view('drain', on, true) + view('drainoff', off, false)), legend: legend([[1, 'Water enters at a crack'], [2, 'Base course'], [3, 'Drainage-grade granular layer'], [4, 'Subgrade'], [5, 'Edge outlet', 'outlet:true']]) };
}

/* ---------------- the page ---------------- */
let html = fs.readFileSync(PAGE, 'utf8');
function matchEnd(h, i) { let d = 0; const re = /<\/?div\b/g; re.lastIndex = i; let m; while ((m = re.exec(h))) { if (m[0] === '<div') d++; else { d--; if (d === 0) return h.indexOf('>', m.index) + 1; } } throw new Error('unbalanced'); }
function swap(sig, widget) {
  const at = html.indexOf(sig); if (at < 0) throw new Error('widget not found (already applied?): ' + sig);
  const open = html.lastIndexOf('<div class="s3d-box', at), end = matchEnd(html, open); if (html.indexOf('>', open) < at) throw new Error('signature is not inside the box tag: ' + sig);
  let box = html.slice(open, end); const head = box.match(/^<div class="([^"]*)"([^>]*)>/); const attrs = head[2].replace(/\sdata-s3d="[^"]*"/, '');
  const cls = head[1].replace(/\bs3d-nums\b|\bs3d-dots\b/g, '').replace(/\s+/g, ' ').trim() + ' wmx';
  const cap = (box.match(/<figcaption>([\s\S]*?)<\/figcaption>/) || [, ''])[1];
  box = box.replace(head[0], `<div class="${cls}" data-ex${attrs}>`);
  box = box.replace(/<figure class="s3d-fig">[\s\S]*?<\/figure>/, `<figure class="s3d-fig">${widget.stage}${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`);
  box = box.replace(/<ul class="s3d-legend s3d-key" aria-hidden="true"><\/ul>/, `<ul class="s3d-legend s3d-key">${widget.legend}</ul>`);
  if (widget.first) box = DEFS + box;
  html = html.slice(0, open) + box + html.slice(end);
}
swap(`data-s3d="rdwater" data-init='{"set":"load"`, W_LOAD());
swap(`data-s3d="rdwater" data-evbox="gsb_filter_compare"`, W_FILTER());
swap(`data-s3d="rdwater" data-evbox="gsb_drain_outlet"`, W_DRAIN());
if (!html.includes('/assets/application-wmx.css')) html = html.replace(/(<link rel="stylesheet" href="\/assets\/application-wipe\.css" \/>)/, '$1\n<link rel="stylesheet" href="/assets/application-wmx.css" />');
if (!html.includes('/assets/application-wmx.js')) html = html.replace(/(<script src="\/assets\/application-wipe\.js" defer><\/script>)/, '$1\n<script src="/assets/application-wmx.js" defer></script>');
fs.writeFileSync(PAGE, html); console.log('swapped 3 GSB figures; remaining real-time boxes:', (html.match(/data-s3d="/g) || []).length, '; wmx css/js linked:', html.includes('application-wmx.css'), html.includes('application-wmx.js'));
