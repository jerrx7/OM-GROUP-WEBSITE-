/* Swaps the three flat widget SVGs (.rmd-ret, .rmd-scc, .rmd-therm) on the Ready Mix Concrete page for the Blender stills + overlay (.rx3).
   Reads _review/rmc3d/layout.json (normalised polygons / anchors from build-rmc.py). Run once on a page that still has the old SVGs. */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..'), PAGE = path.join(ROOT, 'applications', 'ready-mix-concrete', 'index.html');
const L = JSON.parse(fs.readFileSync(path.join(ROOT, '_review', 'rmc3d', 'layout.json'), 'utf8'));
let s = fs.readFileSync(PAGE, 'utf8');
const W = 2080, H = 990, f0 = n => n.toFixed(0);
const P = (sc, k, i = 0) => { const a = L[sc].anc[k][i]; return [a[0] * W, a[1] * H]; };
const Q = (sc, k) => L[sc].poly[k].map(a => [a[0] * W, a[1] * H]);
const pts = a => a.map(p => `${f0(p[0])},${f0(p[1])}`).join(' ');
const poly = (sc, k, cls) => `<polygon class="${cls}" points="${pts(Q(sc, k))}"/>`;
const line = (a, b, cls) => `<path class="${cls}" d="M${f0(a[0])} ${f0(a[1])}L${f0(b[0])} ${f0(b[1])}"/>`;
const arrow = (a, b, cls, hl = 40, hw = 22) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d, nx = -uy, ny = ux;
  const bx = b[0] - ux * hl, by = b[1] - uy * hl;
  const head = `M${f0(bx + nx * hw)} ${f0(by + ny * hw)}L${f0(b[0])} ${f0(b[1])}L${f0(bx - nx * hw)} ${f0(by - ny * hw)}`;
  return `<path class="${cls} wh" d="M${f0(a[0])} ${f0(a[1])}L${f0(b[0] - ux * 4)} ${f0(b[1] - uy * 4)}${head}"/><path class="${cls}" d="M${f0(a[0])} ${f0(a[1])}L${f0(b[0] - ux * 4)} ${f0(b[1] - uy * 4)}${head}"/>`;
};
const smooth = (a, cls) => { let d = `M${f0(a[0][0])} ${f0(a[0][1])}`; for (let i = 0; i < a.length - 1; i++) { const p0 = a[Math.max(0, i - 1)], p1 = a[i], p2 = a[i + 1], p3 = a[Math.min(a.length - 1, i + 2)]; d += `C${f0(p1[0] + (p2[0] - p0[0]) / 6)} ${f0(p1[1] + (p2[1] - p0[1]) / 6)} ${f0(p2[0] - (p3[0] - p1[0]) / 6)} ${f0(p2[1] - (p3[1] - p1[1]) / 6)} ${f0(p2[0])} ${f0(p2[1])}`; } return `<path class="${cls}" d="${d}"/>`; };
const ring = (p, r, cls) => `<circle class="${cls}" cx="${f0(p[0])}" cy="${f0(p[1])}" r="${r}"/>`;
const pill = (sc, k, text, cls = '', dx = 0, dy = 0, i = 0) => { const a = L[sc].anc[k][i]; return `<span class="rx-lb ${cls}" style="left:${(a[0] * 100 + dx).toFixed(1)}%;top:${(a[1] * 100 + dy).toFixed(1)}%">${text}</span>`; };
const pic = img => `<picture><source type="image/avif" srcset="/img/applications/ready-mix-concrete/rx3-${img}-1040.avif 1040w, /img/applications/ready-mix-concrete/rx3-${img}-2080.avif 2080w" sizes="(max-width:820px) 92vw, 780px"><img src="/img/applications/ready-mix-concrete/rx3-${img}-1040.webp" srcset="/img/applications/ready-mix-concrete/rx3-${img}-1040.webp 1040w, /img/applications/ready-mix-concrete/rx3-${img}-2080.webp 2080w" sizes="(max-width:820px) 92vw, 780px" width="2080" height="990" alt="" loading="lazy" decoding="async"></picture>`;

const build = (kind, f) => {
  let img, ov = '', lb = '', defs = '';
  if (kind === 'ret') {
    img = 'wall'; const sc = 'wall';
    ov += poly(sc, 'stem', 'hl ov ov-stem') + poly(sc, 'base', 'hl ov ov-found') + poly(sc, 'back', 'hl ov ov-back') + poly(sc, 'drain', 'hl ov ov-drain') + poly(sc, 'winS', 'hl ov ov-reinf') + poly(sc, 'winB', 'hl ov ov-reinf');
    ov += line(Q(sc, 'j1')[0], Q(sc, 'j1')[1], 'jt ov ov-joint') + line(Q(sc, 'j2')[0], Q(sc, 'j2')[1], 'jt ov ov-joint');
    [-.67, .08, .83].forEach(t => { const lerp = i => { const a = P(sc, 'la', i), b = P(sc, 'lb', i); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }; ov += `<g class="ov ov-load">${arrow(lerp(0), lerp(1), 'ar ar-dk')}</g>`; });
    ['ha', 'hb'].forEach(k => { ov += `<g class="ov ov-load">${arrow(P(sc, k, 0), P(sc, k, 1), 'ar ar-dk')}</g>`; });
    ov += `<g class="ov ov-water">${arrow(P(sc, 'wt', 0), P(sc, 'wt', 1), 'ar ar-bl')}</g>`;
    lb = pill(sc, 'stem', 'stem') + (() => { const q = L[sc].poly.base; const x = q[0][0] + .13 * (q[1][0] - q[0][0]) + .5 * (q[3][0] - q[0][0]), y = q[0][1] + .13 * (q[1][1] - q[0][1]) + .5 * (q[3][1] - q[0][1]); return `<span class="rx-lb" style="left:${(x * 100).toFixed(1)}%;top:${(y * 100).toFixed(1)}%">base</span>`; })() + pill(sc, 'backfill', 'backfill');
  } else if (kind === 'scc') {
    img = 'scc'; const sc = 'scc';
    ov += smooth(L.scc.anc.fl1.map(a => [a[0] * W, a[1] * H]), 'fl fl1') + smooth(L.scc.anc.fl2.map(a => [a[0] * W, a[1] * H]), 'fl fl2');
    L.scc.anc.bars.forEach(a => { ov += ring([a[0] * W, a[1] * H], 30, 'rg ov ov-pass'); });
    L.scc.anc.stones.forEach(a => { ov += ring([a[0] * W, a[1] * H], 52, 'rg ov ov-seg'); });
    lb = pill(sc, 'flow', 'flow direction →');
  } else {
    img = 'mass'; const sc = 'mass'; const face = Q(sc, 'face');
    defs = `<defs><radialGradient id="rx-heat-${f}" cx="50%" cy="50%" r="62%"><stop offset="0" stop-color="#ff5e29" stop-opacity=".62"/><stop offset=".55" stop-color="#f5a27f" stop-opacity=".34"/><stop offset="1" stop-color="#f0ece6" stop-opacity="0"/></radialGradient><clipPath id="rx-face-${f}"><polygon points="${pts(face)}"/></clipPath></defs>`;
    const xs = face.map(p => p[0]), ys = face.map(p => p[1]); const bx = Math.min(...xs), by = Math.min(...ys), bw = Math.max(...xs) - bx, bh = Math.max(...ys) - by;
    ov += `${defs}<g clip-path="url(#rx-face-${f})"><rect class="heat" x="${f0(bx)}" y="${f0(by)}" width="${f0(bw)}" height="${f0(bh)}" fill="url(#rx-heat-${f})"/></g>`;
    ov += `<g class="ov ov-heat">${arrow(P(sc, 'core'), P(sc, 'cool'), 'ar ar-or', 44, 24)}</g>`;
    const pp = L.mass.anc.pipes.map(a => [a[0] * W, a[1] * H]);
    ov += `<g class="ov ov-ctrl">${line(pp[0], pp[3], 'pp')}${line(pp[4], pp[7], 'pp')}${pp.map(p => ring(p, 36, 'rg')).join('')}</g>`;
    ov += `<g class="ov ov-mon">${L.mass.anc.probes.map(a => ring([a[0] * W, a[1] * H], 40, 'rg')).join('')}</g>`;
    ov += `<g class="ov ov-seq">${line(Q(sc, 'l1')[0], Q(sc, 'l1')[1], 'ly')}${line(Q(sc, 'l2')[0], Q(sc, 'l2')[1], 'ly')}</g>`;
    lb = pill(sc, 'core', 'warmer core', '', 0, 3) + pill(sc, 'cool', 'cooler face', '', 0, 0) + pill(sc, 'lbl_pipes', 'cooling arrangement, where specified', 'ov ov-ctrl', 0, 17) + pill(sc, 'lbl_sens', 'sensors', 'ov ov-mon', 4, 4);
  }
  return { img, ov, lb };
};
let n = 0;
s = s.replace(/<svg class="rmd-(ret|scc|therm)" data-f="(\w+)" viewBox="0 0 520 (?:190|210)" role="img" aria-label="([^"]*)" focusable="false">[\s\S]*?<\/svg>/g, (m, kind, f, al) => {
  n++; const k = kind === 'therm' ? 'mass' : kind; const { img, ov, lb } = build(kind === 'therm' ? 'mass' : kind, f);
  return `<div class="rx3" data-k="${k}" data-f="${f}" role="img" aria-label="${al}">${pic(img)}<svg class="rx-o" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">${ov}</svg>${lb}</div>`;
});
console.log('replaced', n); fs.writeFileSync(PAGE, s);
