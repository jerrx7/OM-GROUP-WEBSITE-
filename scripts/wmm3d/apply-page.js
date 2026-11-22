/* OM GROUP - Wet Mix Macadam page: swaps the ten real-time 3D road-works and laboratory widgets for the photoreal Blender stills.
   Run after export-web-assets.js:   node scripts/wmm3d/apply-page.js        (keeps the controls and the text panels of every widget; only the figure changes)
   Only works on a page that still has the original data-s3d boxes (rdpave thick/edge, rdtest, rdlay lay/seg); keep a backup before re-running. */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..'), PAGE = path.join(ROOT, 'applications', 'wet-mix-macadam', 'index.html'), SRC = path.join(ROOT, '_review', 'wmm3d');
const IMG = '/img/applications/wet-mix-macadam/wmx/';
const J = n => JSON.parse(fs.readFileSync(path.join(SRC, n + '.json'), 'utf8'));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function pic(name, alt, lab, eager) {
  const sz = lab ? [900, 1500] : [1000, 1600, 2000], ext = e => sz.map(w => `${IMG}${lab ? 'lab-' : ''}${name}-${w}.${e} ${w}w`).join(', '), big = sz[sz.length - 1];
  const sizes = '(max-width:1000px) 92vw, 62vw';
  return `<picture><source type="image/avif" srcset="${ext('avif')}" sizes="${sizes}" /><img src="${IMG}${lab ? 'lab-' : ''}${name}-${sz[1]}.webp" srcset="${ext('webp')}" sizes="${sizes}" width="${big}" height="${lab ? Math.round(big / 1.6) : big / 2}" alt="${esc(alt)}" loading="lazy" decoding="async" /></picture>`;
}
const ANIM = path.join(SRC, 'anim'), has = f => fs.existsSync(path.join(ANIM, f));
/* a motion loop laid over the still (the still stays underneath until the video plays): scripts/wmm3d/render-anim.sh, render-lab-anim.sh */
function vid(name, o = {}) {
  if (!has(name + '.mp4')) return '';
  const pins = has(name + '.pins.json') ? ` data-pins="${IMG}anim/${name}.pins.json"` : '', fr = o.frames && has(name + '.json') ? ` data-frames="${IMG}anim/${name}.json"` : '';
  return `<video class="wmx-vid" muted loop playsinline preload="none" disableremoteplayback tabindex="-1" aria-hidden="true" data-src="${IMG}anim/${name}.mp4"${pins}${fr}></video>`;
}
const pct = p => `left:${(p[0] * 100).toFixed(2)}%;top:${(p[1] * 100).toFixed(2)}%`;
const mark = (p, n, cls = '', key = '') => (p && p[0] > .015 && p[0] < .985 && p[1] > .02 && p[1] < .98) ? `<span class="wmx-n${cls}"${key ? ` data-pin="${key}"` : ''} style="${pct(p)}" aria-hidden="true">${n}</span>` : '';
const legend = (items, when) => items.map(([n, t]) => `<li${when ? ` data-when="${when}"` : ''}><i>${n}</i><span>${t}</span></li>`).join('');
const poly = (A, vb) => `<polygon points="${A.map(p => (p[0] * vb[0]).toFixed(2) + ',' + (p[1] * vb[1]).toFixed(2)).join(' ')}"`;
const DEFS = `<svg class="wmx-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs><linearGradient id="wmxg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff5e29" stop-opacity=".78"/><stop offset=".55" stop-color="#ff5e29" stop-opacity=".3"/><stop offset="1" stop-color="#ff5e29" stop-opacity="0"/></linearGradient></defs></svg>`;
const stage = (inner, ar) => `<div class="s3d-stage wmx-stage" data-ar="${ar || 'road'}">${inner}</div>`;
const fx = (inner, vb) => `<svg class="wmx-fx" viewBox="0 0 ${vb[0]} ${vb[1]}" preserveAspectRatio="none" aria-hidden="true" focusable="false">${inner}</svg>`;
const VB = [100, 50], VBL = [100, 62.5];

/* ---------------- widgets: each returns { stage, legend } ---------------- */
function layer(name, alt, a, vb) { // one compaction layer: picture, the motion loop and the orange band over the WMM cut face
  const grad = fx(`${poly([a.bl, a.br, a.tr, a.tl], vb)} fill="url(#wmxg)"/>`, vb);
  return `${pic(name, alt)}${vid(name)}${grad}`;
}
function compaction(key, alt, withMarks) {
  const A = J(key + '0'), B = J(key + '1');
  const sl = (A.br[1] - A.bl[1]) / (A.br[0] - A.bl[0]), into = (p, x) => [x, p[1] + (x - p[0]) * sl];
  const m = withMarks ? mark([A.roller[0] - .02, .27], 1, '', 'roller') + mark(A.face, 2) + mark(into(A.gsb, .1), 3) + mark(into(A.sub, .1), 4) : '';
  return `<div class="wmx-pair"><div class="wmx-l wmx-l0">${layer(key + '0', alt + ' Loose.', A, VB)}${m}</div><div class="wmx-l wmx-l1">${layer(key + '1', alt + ' Compacted.', B, VB)}</div></div>`;
}
const W_COMPACT = () => ({
  stage: stage(compaction('med', 'A wet mix macadam layer cut open on granular sub-base and subgrade, with a yellow vibratory roller on top and an orange band showing how far the compactive effort reaches.', true)),
  legend: legend([[1, 'Vibratory roller'], [2, 'WMM layer, cut face: the orange band is how far the compactive effort reaches'], [3, 'GSB below'], [4, 'Subgrade']])
});
function W_THICK() {
  const t = { a: ['thin', 'a thinner'], b: ['med', 'a medium'], c: ['thick', 'a thicker'] };
  const views = Object.entries(t).map(([k, [nm, w]]) => `<div class="wmx-view" data-when="th:${k}">${compaction(nm, `A wet mix macadam layer of ${w} example thickness, cut open, with a yellow vibratory roller on top and an orange band for the compactive effort.`, true)}</div>`).join('');
  return { stage: stage(views), legend: legend([[1, 'Vibratory roller'], [2, 'WMM layer: example thickness, not a specification value'], [3, 'GSB below'], [4, 'Subgrade']]) };
}
function W_SHAPE() {
  const D = J('lab-shape'), keys = [['cub', 'Cubical'], ['fla', 'Flaky'], ['elo', 'Elongated'], ['irr', 'Irregular']], col = ['#ff5e29', '#2f7fd1', '#2fa75b'];
  const lines = k => D[k].ax.map((a, i) => `<line data-k="${k}" data-a="${i}" x1="${(a[0][0] * VBL[0]).toFixed(2)}" y1="${(a[0][1] * VBL[1]).toFixed(2)}" x2="${(a[1][0] * VBL[0]).toFixed(2)}" y2="${(a[1][1] * VBL[1]).toFixed(2)}" stroke="${col[i]}" stroke-width=".2" stroke-opacity=".6" stroke-linecap="round"/><circle data-k="${k}" data-a="${i}" data-e="0" cx="${(a[0][0] * VBL[0]).toFixed(2)}" cy="${(a[0][1] * VBL[1]).toFixed(2)}" r=".34" fill="${col[i]}" fill-opacity=".7"/><circle data-k="${k}" data-a="${i}" data-e="1" cx="${(a[1][0] * VBL[0]).toFixed(2)}" cy="${(a[1][1] * VBL[1]).toFixed(2)}" r=".34" fill="${col[i]}" fill-opacity=".7"/>`).join('');
  const alt = 'Four stones on stands, cubical, flaky, elongated and irregular, each with coloured bars for its length, width and thickness.';
  const view = (when, ks, zoom) => `<div class="wmx-view" data-when="view:${when}"><div class="wmx-zoom" style="${zoom || ''}">${pic('shape', alt, true)}${vid('lab-shape', { frames: 1 })}${fx(ks.map(lines).join(''), VBL)}</div></div>`;
  let v = view('all', keys.map(k => k[0])).replace(/<\/div><\/div>$/,'</div>' + keys.map(([k], i) => mark([D[k].c[0], D[k].c[1] - .17], i + 1)).join('') + '</div>');
  keys.forEach(([k]) => { const c = D[k].c; v += view(k, [k], `transform-origin:${(c[0] * 100).toFixed(1)}% ${(c[1] * 100).toFixed(1)}%;transform:translate(${((.5 - c[0]) * 100).toFixed(1)}%,${((.5 - c[1]) * 100).toFixed(1)}%) scale(2.1)`); });
  const marks = keys.map(([k, nm], i) => `<li data-when="view:all"><i>${i + 1}</i><span>${nm}</span></li>`).join('') + `<li><span class="wmx-bar" style="--c:#ff5e29"></span><span>Length</span></li><li><span class="wmx-bar" style="--c:#2f7fd1"></span><span>Width</span></li><li><span class="wmx-bar" style="--c:#2fa75b"></span><span>Thickness</span></li>`;
  return { stage: stage(v, 'lab'), legend: marks, ar: 'lab' };
}
function W_LAB(name, alt) { return { stage: stage(`<div class="wmx-view">${pic(name, alt, true)}${vid('lab-' + name)}</div>`, 'lab'), legend: '' }; }
function W_PI() {
  const alt = 'A brass 425 micron sieve on its pan with fine soil on the mesh, and a frosted glass plate with a ball of soil, a spatula and a thread of soil rolled until it crumbles.';
  const z = (x, y, k) => `transform-origin:${x}% ${y}%;transform:translate(${(50 - x).toFixed(1)}%,${(50 - y).toFixed(1)}%) scale(${k})`;
  const v = (w, zz) => `<div class="wmx-view" data-when="view:${w}"><div class="wmx-zoom" style="${zz || ''}">${pic('pi', alt, true)}${vid('lab-pi')}</div></div>`;
  return { stage: stage(v('all') + v('sieve', z(24, 40, 2.1)) + v('thread', z(78, 52, 2.0)), 'lab'), legend: '' };
}
function W_LAY(views, labels) {
  const ALT = { transport: 'A covered tipper approaches a tracked paver on a road strip cut open to show subgrade, GSB and the wet mix macadam layer, with a roller waiting behind.', spread: 'A tipper tips aggregate into the hopper of a tracked paver, which lays a loose wet mix macadam mat; a roller waits behind.', roll: 'A yellow vibratory roller compacts the loose wet mix macadam mat; the compacted layer behind it is thinner and denser.', check: 'A finished, compacted wet mix macadam layer with a straight-edge across it, a levelling staff and a tripod level, with traffic cones along the edge.' };
  const NAMES = { tipper: 'Tipper', paver: 'Tracked paver', roller: 'Vibratory roller', mat: 'Loose mat', hopper: 'Paver hopper', compacted: 'Compacted layer', loose: 'Loose layer', straight: 'Straight-edge', staff: 'Levelling staff', level: 'Tripod level' };
  let v = '', lg = '';
  views.forEach(vw => {
    const A = J(vw), ks = labels[vw]; let m = '', items = [];
    ks.forEach((k, i) => { m += mark(A[k], i + 1, '', k); items.push([i + 1, NAMES[k]]); });
    v += `<div class="wmx-view" data-when="view:${vw}">${pic(vw, ALT[vw])}${vid(vw)}${m}</div>`; lg += legend(items, 'view:' + vw);
  });
  return { stage: stage(v), legend: lg };
}
function W_SEG() {
  const A0 = J('seg0'), A1 = J('seg1'), vb = VB, alt = 'A uniform wet mix macadam layer beside one where the coarse stones have separated into a pocket and a pocket of fines has formed, shown as spread and after rolling.';
  const pol = (A, p) => [0, 1, 2, 3, 4, 5].map(i => A[p + i]);
  const one = (A, roll) => `<div class="wmx-view" data-when="roll:${roll}">${pic('seg' + roll, alt)}${fx(`<g class="wmx-dim wmx-dimS">${poly(pol(A, 'S'), vb)} fill="#f4f1ea" fill-opacity=".62"/></g><g class="wmx-dim wmx-dimU">${poly(pol(A, 'U'), vb)} fill="#f4f1ea" fill-opacity=".62"/></g>`, vb)}${mark(A.uni, 1)}${mark(A.coarse, 2)}${mark(A.fines, 3)}</div>`;
  return { stage: stage(one(A0, 0) + one(A1, 1)), legend: legend([[1, 'Uniform grading: well distributed'], [2, 'Coarse pocket'], [3, 'Pocket of fines']]) };
}
function W_EDGE() {
  const A = J('edge'), alt = 'The same roller pass beside a confined edge, held by a shoulder of granular material built up with the layer, and beside an unconfined edge where the layer material spills outward.';
  return { stage: stage(`<div class="wmx-view">${pic('edge', alt)}${vid('edge')}${mark([.2, .3], 1, '', 'confined')}${mark(A.shoulder, 2)}${mark([.7, .37], 3, '', 'unconfined')}${mark([.58, .6], 4)}</div>`), legend: legend([[1, 'Confined edge: the roller works against a shoulder'], [2, 'Shoulder built with the layer'], [3, 'Unconfined edge'], [4, 'Material spilling outward']]) };
}

/* ---------------- the page ---------------- */
let html = fs.readFileSync(PAGE, 'utf8');
function matchEnd(h, i) { // index just after the </div> that closes the <div> opening at i
  let d = 0; const re = /<\/?div\b/g; re.lastIndex = i; let m;
  while ((m = re.exec(h))) { if (m[0] === '<div') d++; else { d--; if (d === 0) return h.indexOf('>', m.index) + 1; } }
  throw new Error('unbalanced');
}
function swap(initMatch, widget, o = {}) {
  const at = html.indexOf(initMatch); if (at < 0) throw new Error('widget not found: ' + initMatch);
  const open = html.lastIndexOf('<div class="s3d-box', at), end = matchEnd(html, open); let box = html.slice(open, end);
  const head = box.match(/^<div class="([^"]*)"([^>]*)>/); let attrs = head[2].replace(/\sdata-s3d="[^"]*"/, '');
  const cls = head[1].replace(/\bs3d-nums\b|\bs3d-dots\b/g, '').replace(/\s+/g, ' ').trim() + ' wmx';
  const cap = (box.match(/<figcaption>([\s\S]*?)<\/figcaption>/) || [, ''])[1];
  box = box.replace(head[0], `<div class="${cls}" data-ex${attrs}${widget.ar ? ' data-ar="lab"' : ''}>`);
  box = box.replace(/<figure class="s3d-fig">[\s\S]*?<\/figure>/, `<figure class="s3d-fig">${widget.stage}${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`);
  if (o.dropPlay) box = box.replace(/<button type="button" data-toggle="play"[^>]*>[^<]*<\/button>/, '').replace(/<div class="s3d-seg" role="group" aria-label="Controls"><\/div>/, '');
  box = box.replace(/<ul class="s3d-legend s3d-key" aria-hidden="true"><\/ul>/, `<ul class="s3d-legend s3d-key">${widget.legend}</ul>`);
  if (!widget.legend) box = box.replace(/<p class="s3d-lbl" style="margin-top:20px">In the picture<\/p><ul class="s3d-legend s3d-key"><\/ul>/, '');
  if (o.first) box = DEFS + box;
  html = html.slice(0, open) + box + html.slice(end);
}
if (/data-s3d="rdpave" data-init='\{"set":"thick","th":"b","comp":0,"play":true\}'/.test(html) === false) throw new Error('page has no original widgets (already applied?)');
swap(`data-s3d="rdpave" data-init='{"set":"thick","th":"b","comp":0,"play":true}'`, W_COMPACT(), { first: true });
swap(`data-s3d="rdtest" data-evbox="wmm_shape_select"`, W_SHAPE(), { dropPlay: true });
swap(`data-s3d="rdtest" data-init='{"set":"la","play":true}'`, W_LAB('la', 'A Los Angeles abrasion machine: a steel drum with a window and an internal shelf, turning on a blue frame with a motor, carrying a charge of steel balls and aggregate.'), { dropPlay: true });
swap(`data-s3d="rdtest" data-init='{"set":"impact","play":true}'`, W_LAB('impact', 'An aggregate impact tester: a heavy base, a steel cup holding aggregate, two guide columns and a hammer raised between them, beside a sample tray and a balance.'), { dropPlay: true });
swap(`data-s3d="rdtest" data-init='{"set":"pi","view":"all","play":true}'`, W_PI(), { dropPlay: true });
swap(`data-s3d="rdpave" data-evbox="wmm_thickness_select"`, W_THICK(), { dropPlay: true });
swap(`data-s3d="rdlay" data-evbox="wmm_lay_stage" data-init='{"set":"lay","view":"transport","play":true}'`, W_LAY(['transport', 'spread'], { transport: ['tipper', 'paver', 'roller', 'mat'], spread: ['tipper', 'hopper', 'mat', 'roller'] }), { dropPlay: true });
swap(`data-s3d="rdlay" data-init='{"set":"seg","view":"both","roll":0}'`, W_SEG());
swap(`data-s3d="rdlay" data-evbox="wmm_lay_stage" data-init='{"set":"lay","view":"roll","play":true}'`, W_LAY(['roll', 'check', 'spread'], { roll: ['roller', 'compacted', 'loose'], check: ['straight', 'staff', 'level', 'roller'], spread: ['tipper', 'hopper', 'mat', 'roller'] }), { dropPlay: true });
swap(`data-s3d="rdpave" data-init='{"set":"edge","play":true}'`, W_EDGE(), { dropPlay: true });
fs.writeFileSync(PAGE, html);
console.log('swapped 10 widgets; remaining real-time boxes:', (html.match(/data-s3d="/g) || []).length);
