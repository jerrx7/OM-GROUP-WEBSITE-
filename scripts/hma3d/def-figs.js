/* OM GROUP - Hot Mix Asphalt page: markup for the eight defect cut-aways (picture + orange annotation layer + label).
   figHtml(key) is used by scripts/hma3d/apply-defect-figs.js (swaps the figures in the live page) and by scripts/hma/parts/04-site.js (generator).
   Needs scripts/hma3d/defs.json from export-defect-assets.js (anchors, 0-1 of the cropped picture). */
const path = require('path'), fs = require('fs');
const D = JSON.parse(fs.readFileSync(path.join(__dirname, 'defs.json'), 'utf8'));
const VW = 1000, VH = +(1000 * D.h / D.w).toFixed(1);
const IMG = '/img/applications/hot-mix-asphalt/hma-def-';
const LABEL = { rut: 'Wheel-path depressions', fat: 'Interconnected cracks, from the bottom up', the: 'Temperature-driven tension, a transverse crack', rav: 'Stones lost from the surface', ble: 'Binder-rich, glossy surface film', str: 'Binder film loses adhesion to the stone, with water', seg: null, pot: 'Material displaced, water enters' };
const ALT = {
  rut: 'A cut-away block of pavement, asphalt over a granular base over subgrade, with two smooth depressions pressed into the asphalt along the wheel paths.',
  fat: 'A cut-away block of pavement whose asphalt surface is broken into a network of interconnected cracks, with cracks rising from the bottom of the layer in the cut face.',
  the: 'A cut-away block of pavement with one jagged crack running across the asphalt, wide at the surface and narrowing as it goes down through the layer.',
  rav: 'A cut-away block of pavement with a rough asphalt surface: pits where stones have come out, and loose stones lying on and lifting off the surface.',
  ble: 'A cut-away block of pavement with a smooth, black, glossy asphalt surface where excess binder has risen over the stones.',
  str: 'A cut-away block of pavement showing pale, uncoated stones low in the asphalt layer, with water collected at the layer boundary beneath them.',
  seg: 'A cut-away block of asphalt with large, open-textured stones on the left half and fine, dense material on the right half.',
  pot: 'A cut-away block of pavement with a pothole: the asphalt is broken away, the base is scooped out and water has collected in the hole.'
};
const P = (k, n) => { const a = D.items[k][n]; if (!a) throw new Error('anchor ' + k + ':' + n); return [+(a[0] * VW).toFixed(1), +(a[1] * VH).toFixed(1)]; };
const poly = (pts, cls = '') => `<polyline class="${cls}" points="${pts.map(p => p.join(',')).join(' ')}"/>`;
function arrow(a, b, cls = '') {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, h = 15, w = 8;
  const bx = b[0] - ux * h, by = b[1] - uy * h;
  return `<path class="${cls}" d="M${a[0]} ${a[1]}L${b[0]} ${b[1]}M${(bx - uy * w).toFixed(1)} ${(by + ux * w).toFixed(1)}L${b[0]} ${b[1]}L${(bx + uy * w).toFixed(1)} ${(by - ux * w).toFixed(1)}"/>`;
}
const names = (k, re) => Object.keys(D.items[k]).filter(n => re.test(n)).sort();
function overlay(k) {
  let o = '';
  if (k === 'rut') { o += poly(names(k, /^edge/).map(n => P(k, n)), 'o-line'); o += arrow(P(k, 'r1s'), P(k, 'r1e'), 'o-line') + arrow(P(k, 'r2s'), P(k, 'r2e'), 'o-line'); }
  if (k === 'fat') for (let c = 0; c < 4; c++) o += poly(names(k, new RegExp('^c' + c + '_')).map(n => P(k, n)), 'o-line o-thin');
  if (k === 'the') { o += poly(names(k, /^k\d/).map(n => P(k, n)), 'o-line'); o += arrow(P(k, 'al_s'), P(k, 'al_e'), 'o-line') + arrow(P(k, 'ar_s'), P(k, 'ar_e'), 'o-line'); }
  if (k === 'rav') o += poly(names(k, /^edge/).map(n => P(k, n)), 'o-line o-dash');
  if (k === 'str') { const ex = P(k, 'ex'), ez = P(k, 'ez'), c0 = P(k, 'e0'), rxp = Math.abs(ex[0] - c0[0]), ryp = Math.abs(c0[1] - ez[1]); for (let i = 0; i < 4; i++) { const c = P(k, 'e' + i); o += `<ellipse class="o-line o-dash" cx="${c[0]}" cy="${c[1]}" rx="${rxp.toFixed(1)}" ry="${ryp.toFixed(1)}"/>`; } }
  if (k === 'seg') o += `<line class="o-line o-dash" x1="${P(k, 'd0')[0]}" y1="${P(k, 'd0')[1]}" x2="${P(k, 'd1')[0]}" y2="${P(k, 'd1')[1]}"/>`;
  if (k === 'pot') o += arrow(P(k, 'as'), P(k, 'ae'), 'o-line o-blue');
  return o ? `<svg class="hma-do" viewBox="0 0 ${VW} ${VH}" aria-hidden="true" focusable="false">${o}</svg>` : '';
}
function figHtml(k) {
  const src = e => [720, 1200, 1880].map(w => `${IMG}${k}-${w}.${e} ${w}w`).join(', ');
  const sizes = '(max-width:899px) 92vw, 560px';
  let lab = '';
  if (k === 'seg') { const l = D.items.seg.l, r = D.items.seg.r; lab = '<p class="hma-dl hma-dl--two"><span style="left:' + (l[0] * 100).toFixed(1) + '%">Coarse-rich</span><span style="left:' + (r[0] * 100).toFixed(1) + '%">Fine-rich</span></p>'; }
  const title = LABEL[k] ? `<p class="hma-dl">${LABEL[k]}</p>` : lab;
  return `<div class="hma-def-fig">${title}<div class="hma-df"><picture><source type="image/avif" srcset="${src('avif')}" sizes="${sizes}" /><img src="${IMG}${k}-1200.webp" srcset="${src('webp')}" sizes="${sizes}" width="${D.w}" height="${D.h}" alt="${ALT[k]}" loading="lazy" decoding="async" /></picture>${overlay(k)}</div></div>`;
}
module.exports = { figHtml, KEYS: D.keys };
