/* OM GROUP - Hot Mix Asphalt page: markup for the prime coat / tack coat cards and the three "cut face of the mat" cards
   (picture + orange annotation layer + small layer pills).  figHtml(key) is used by scripts/hma3d/apply-layer-figs.js.
   Needs scripts/hma3d/layers.json from export-layer-assets.js. */
const path = require('path'), fs = require('fs');
const D = JSON.parse(fs.readFileSync(path.join(__dirname, 'layers.json'), 'utf8'));
const VW = 1000, VH = +(1000 * D.h / D.w).toFixed(1);
const IMG = '/img/applications/hot-mix-asphalt/hma-lay-';
const TITLE = { prime: 'Prime coat, sprayed', tack: 'Tack coat: thin, uniform' };
const PILLS = { prime: [['pb', 'Prepared granular base'], ['ps', 'Subgrade']], tack: [['pb', 'Base course'], ['po', 'Existing bituminous layer, clean'], ['pn', 'New layer being laid']] };
const ALT = {
  prime: 'A cut-away block of pavement: a prepared granular base over subgrade, its top surface darkened by a thin sprayed bituminous film that fades down into the stone.',
  tack: 'A cut-away block of pavement: a base course, an existing bituminous layer with a thin glossy black tack film on its surface, and a new asphalt layer being laid over it from the right.',
  cf0: 'A cut face of freshly paved asphalt: stones sit loosely in black binder with wide gaps between them and a bulky, uneven surface.',
  cf1: 'A cut face of asphalt after intermediate rolling: the stones have settled closer together and the gaps between them are narrower.',
  cf2: 'A cut face of asphalt after finish rolling: a dense, closed structure of tightly packed stones under a flat, even surface.'
};
const P = (k, n) => { const a = D.items[k][n]; if (!a) throw new Error('anchor ' + k + ':' + n); return [+(a[0] * VW).toFixed(1), +(a[1] * VH).toFixed(1)]; };
function arrow(a, b, cls = '') {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, h = 14, w = 7;
  const bx = b[0] - ux * h, by = b[1] - uy * h;
  return `<path class="${cls}" d="M${a[0]} ${a[1]}L${b[0]} ${b[1]}M${(bx - uy * w).toFixed(1)} ${(by + ux * w).toFixed(1)}L${b[0]} ${b[1]}L${(bx + uy * w).toFixed(1)} ${(by - ux * w).toFixed(1)}"/>`;
}
function overlay(k) {
  let o = '';
  if (k === 'prime') for (let i = 0; i < 5; i++) o += arrow(P(k, `a${i}s`), P(k, `a${i}e`), 'o-line o-dash');
  if (k === 'tack') o += `<polyline class="o-line" points="${Object.keys(D.items[k]).filter(n => /^t\d/.test(n)).sort().map(n => P(k, n).join(',')).join(' ')}"/>`;
  return o ? `<svg class="hma-do" viewBox="0 0 ${VW} ${VH}" aria-hidden="true" focusable="false">${o}</svg>` : '';
}
function figHtml(k) {
  const src = e => [720, 1200, 1880].map(w => `${IMG}${k}-${w}.${e} ${w}w`).join(', ');
  const sizes = '(max-width:899px) 92vw, 460px';
  const title = TITLE[k] ? `<p class="hma-dl">${TITLE[k]}</p>` : '';
  const pills = (PILLS[k] || []).map(([n, t]) => { const a = D.items[k][n]; return `<span class="hma-lp" style="left:${(a[0] * 100 + (n === 'pn' ? 0 : 1.5)).toFixed(1)}%;top:${(a[1] * 100).toFixed(1)}%">${t}</span>`; }).join('');
  return `<div class="hma-def-fig hma-def-fig--cap">${title}<div class="hma-df"><picture><source type="image/avif" srcset="${src('avif')}" sizes="${sizes}" /><img src="${IMG}${k}-1200.webp" srcset="${src('webp')}" sizes="${sizes}" width="${D.w}" height="${D.h}" alt="${ALT[k]}" loading="lazy" decoding="async" /></picture>${overlay(k)}${pills}</div></div>`;
}
module.exports = { figHtml, KEYS: D.keys };
