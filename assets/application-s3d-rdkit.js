/* shared pieces for the road scenes (Wet Mix Macadam and Granular Sub-base pages): painted, seamless cut-face / surface textures for each pavement material, built from faceted stones of mixed sizes in a dust
   matrix (crushed grey basalt for WMM, pale tan-grey sub-base, black asphalt with chips, laterite subgrade, concrete), and block builders that wear them on every face with world-unit UVs, so a cut and a top
   surface are the same material. Generic pictures of generic layers: no thickness, grading or test value is implied. */
import { THREE, rng } from '/assets/application-s3d.js';
import { rbox, cvs, tex, speck } from '/assets/application-s3d-msmasonry.js';
export { rbox, cvs, tex, speck };
const TAU = Math.PI * 2;
export const TILE = 12;                                   /* world units covered by one texture repeat */

/* palettes in sRGB; sizes are [radius px, count] on a 1024 px tile (one repeat = TILE units) */
const PAL = {
  wmm:   { bg: '#2d2e31', pal: [[50, 53, 60], [62, 65, 72], [78, 81, 88], [38, 40, 44], [96, 98, 104], [72, 68, 62], [128, 126, 120]], w: [4, 4, 3, 3, 2, 1.5, .5], sizes: [[58, 9], [38, 36], [24, 130], [13, 520], [7, 2200], [3.5, 6500]], dust: [[120, 118, 112], [88, 88, 90], [150, 146, 138]], dustN: 36000, edge: .62 },
  loose: { bg: '#141517', pal: [[54, 57, 64], [72, 75, 82], [92, 95, 101], [40, 42, 46], [112, 114, 118], [86, 80, 72]], w: [3, 4, 3, 3, 2, 1], sizes: [[58, 10], [38, 40], [24, 110], [13, 260], [7, 700]], dust: [[100, 98, 94]], dustN: 9000, edge: .7 },
  gsb:   { bg: '#5d5950', pal: [[152, 146, 134], [172, 164, 150], [126, 120, 110], [192, 184, 170], [104, 98, 90], [162, 150, 128], [134, 120, 98]], w: [3, 3, 3, 2, 2, 2, 2], sizes: [[56, 8], [36, 34], [22, 130], [12, 520], [6.5, 2200], [3.2, 6500]], dust: [[190, 180, 160], [150, 140, 120], [210, 200, 184]], dustN: 40000, edge: .5 },
  gsbl:  { bg: '#3d3a34', pal: [[152, 146, 134], [172, 164, 150], [126, 120, 110], [104, 98, 90], [134, 120, 98]], w: [3, 3, 3, 2, 2], sizes: [[56, 9], [36, 40], [22, 110], [12, 260], [6.5, 700]], dust: [[150, 140, 120]], dustN: 8000, edge: .65 },
  dbm:   { bg: '#111113', pal: [[40, 40, 43], [56, 56, 60], [30, 30, 33], [76, 76, 80], [96, 94, 90]], w: [4, 3, 4, 2, 1], sizes: [[16, 60], [9, 300], [5, 1400], [2.6, 6000]], dust: [[60, 60, 64], [26, 26, 28]], dustN: 34000, edge: .4 },
  bc:    { bg: '#17181b', pal: [[44, 44, 48], [60, 60, 64], [34, 34, 37], [82, 82, 86]], w: [4, 3, 4, 2], sizes: [[9, 120], [5, 600], [2.8, 3000], [1.6, 9000]], dust: [[70, 70, 74], [30, 30, 32]], dustN: 36000, edge: .3 },
  conc:  { bg: '#8e8f8c', pal: [[120, 120, 118], [160, 158, 150], [96, 98, 100], [180, 176, 166]], w: [3, 3, 3, 2], sizes: [[18, 26], [9, 160], [4.5, 800], [2.2, 3500]], dust: [[170, 170, 166], [120, 120, 116]], dustN: 28000, edge: .35 },
  conc2: { bg: '#a5a6a3', pal: [[140, 140, 138], [176, 174, 166], [118, 120, 122]], w: [3, 3, 3], sizes: [[14, 20], [7, 120], [3.6, 700], [2, 3000]], dust: [[190, 190, 186], [140, 140, 136]], dustN: 28000, edge: .3 },
  wmmc:  { bg: '#2d2e31', pal: [[50, 53, 60], [62, 65, 72], [78, 81, 88], [38, 40, 44], [96, 98, 104], [72, 68, 62]], w: [4, 4, 3, 3, 2, 1.5], sizes: [[58, 24], [44, 70], [32, 150], [20, 220]], dust: [[88, 88, 90]], dustN: 6000, edge: .7 },
  fines: { bg: '#4a4a4d', pal: [[96, 96, 100], [120, 120, 124], [72, 72, 76], [140, 138, 134]], w: [3, 3, 3, 2], sizes: [[5, 60], [3, 400], [1.8, 2200], [1, 9000]], dust: [[130, 130, 128], [90, 90, 92]], dustN: 42000, edge: .35 },
  soil:  { bg: '#8a4d2e', pal: [[160, 96, 62], [120, 64, 38], [176, 118, 82], [96, 52, 32], [196, 150, 110]], w: [3, 3, 2, 3, 1], sizes: [[22, 10], [11, 70], [5, 420], [2.6, 2000]], dust: [[170, 100, 64], [110, 60, 36], [190, 130, 90]], dustN: 36000, edge: .25 },
};

/* a seamless tile of cut face: a matrix of dust, then stones from the largest to the smallest, each a faceted polygon with a lit edge, a shaded edge and a dark gap */
export function aggTex(kind, seed, N = 1024, items = null) {
  const P = PAL[kind], r = rng(seed), c = cvs(N, N), g = c.getContext('2d'), hc = cvs(N, N), hg = hc.getContext('2d');
  g.fillStyle = P.bg; g.fillRect(0, 0, N, N); hg.fillStyle = '#383838'; hg.fillRect(0, 0, N, N);
  const dcols = P.dust.map(d => 'rgba(' + d.join(',') + ',A)'); speck(g, r, N, N, P.dustN, 1.3, dcols, .25, .7); speck(hg, r, N, N, P.dustN * .7, 1.2, ['rgba(255,255,255,A)', 'rgba(0,0,0,A)'], .15, .5);
  const wsum = P.w.reduce((a, b) => a + b, 0), pick = () => { let u = r() * wsum, i = 0; while (i < P.w.length - 1 && u > P.w[i]) { u -= P.w[i]; i++; } return P.pal[i]; };
  const shp = (x, y, rad, k, a) => { const pts = []; for (let j = 0; j < k; j++) { const t = a + j / k * TAU + (r() - .5) * .55, rd = rad * (.62 + r() * .5); pts.push([x + Math.cos(t) * rd * 1.12, y + Math.sin(t) * rd * .86]); } return pts; };
  const path = (ctx, pts) => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); };
  const stone = (x, y, rad, col, k, a, h) => {
    const sh = .82 + r() * .34, rgb = col.map(v => Math.min(255, v * sh | 0)), pts = shp(x, y, rad, k, a);
    path(g, pts); const gd = g.createLinearGradient(x - rad, y - rad, x + rad, y + rad), lo = rgb.map(v => v * .72 | 0), hi = rgb.map(v => Math.min(255, v * 1.28 | 0)); gd.addColorStop(0, 'rgb(' + hi.join(',') + ')'); gd.addColorStop(.55, 'rgb(' + rgb.join(',') + ')'); gd.addColorStop(1, 'rgb(' + lo.join(',') + ')'); g.fillStyle = gd; g.fill();
    if (rad > 8) { g.save(); path(g, pts); g.clip(); const nn = rad * rad / 5 | 0; for (let q = 0; q < nn; q++) { g.fillStyle = r() < .5 ? 'rgba(255,255,255,' + (.05 + r() * .12) + ')' : 'rgba(0,0,0,' + (.08 + r() * .14) + ')'; const sz = .8 + r() * 1.8; g.fillRect(x + (r() * 2 - 1) * rad * 1.1, y + (r() * 2 - 1) * rad, sz, sz); } g.restore(); }
    if (rad > 2.4) {                                              /* a lit facet on the upper left and a shaded one below right, so each stone has planes */
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      g.save(); path(g, pts); g.clip(); g.fillStyle = 'rgba(255,255,255,' + (.07 + r() * .08) + ')'; g.beginPath(); g.moveTo(cx - rad * 1.5, cy - rad * .2); g.lineTo(cx + rad * .2, cy - rad * 1.5); g.lineTo(cx + rad * .5, cy); g.lineTo(cx - rad * .3, cy + rad * .3); g.closePath(); g.fill();
      g.fillStyle = 'rgba(0,0,0,' + (.1 + r() * .12) + ')'; g.beginPath(); g.moveTo(cx + rad * 1.5, cy + rad * .1); g.lineTo(cx - rad * .1, cy + rad * 1.5); g.lineTo(cx - rad * .5, cy + rad * .1); g.lineTo(cx + rad * .3, cy - rad * .3); g.closePath(); g.fill(); g.restore();
    }
    g.strokeStyle = 'rgba(0,0,0,' + P.edge + ')'; g.lineWidth = rad > 5 ? 1.5 : 1; path(g, pts); g.stroke();
    path(hg, pts); hg.fillStyle = 'rgb(' + (150 + (h * 80 | 0)) + ',' + (150 + (h * 80 | 0)) + ',' + (150 + (h * 80 | 0)) + ')'; hg.fill(); hg.strokeStyle = 'rgba(0,0,0,.85)'; hg.lineWidth = rad > 5 ? 2 : 1.2; hg.stroke();
  };
  const place = rad => { const x = r() * N, y = r() * N, rr = rad * (.6 + r() * .6), col = pick(), k = 6 + (r() * 4 | 0), a = r() * TAU, h = r();
    for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) { const px = x + dx, py = y + dy; if (px < -rr * 1.4 || px > N + rr * 1.4 || py < -rr * 1.4 || py > N + rr * 1.4) continue; stone(px, py, rr, col, k, a, h); } };
  if (items) items.slice().sort((p, q) => p - q).forEach(rad => place(rad));         /* stone sizes given by the caller (a grading), the smallest first */
  else P.sizes.slice().reverse().forEach(([rad, n]) => { for (let i = 0; i < n; i++) place(rad); });   /* the smallest first, so the large stones sit on top and read as stones */
  return { map: tex(c), bump: tex(hc, false) };
}
/* the tiles are painted ONCE by scripts/bake-roadtex.js (the painting above takes 200-400 ms each on the main thread) and shipped as images in assets/road-tex/, which the browser decodes off the main thread */
export const TILE_SEED = { wmm: 24, loose: 9, gsb: 17, gsbl: 11, dbm: 31, bc: 38, conc: 45, conc2: 52, fines: 2, soil: 10, wmmc: 1 };
const MC = {};
export function bakedTex(kind) {
  if (MC[kind]) return MC[kind]; const ld = new THREE.TextureLoader(), mk = (u, srgb) => { const t = ld.load(u); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  return (MC[kind] = { map: mk('/assets/road-tex/' + kind + '-c.webp', true), bump: mk('/assets/road-tex/' + kind + '-b.webp', false) });
}
/* scale the UVs of a geometry (all of it, or one material group) so a shared texture can repeat without being cloned */
export function scaleUV(geo, sx, sy, group = -1) { const uv = geo.attributes.uv, ix = geo.index, gr = group < 0 ? [{ start: 0, count: ix ? ix.count : uv.count }] : [geo.groups[group]], seen = new Set(); gr.forEach(g => { for (let i = g.start; i < g.start + g.count; i++) { const v = ix ? ix.getX(i) : i; if (seen.has(v)) continue; seen.add(v); uv.setXY(v, uv.getX(v) * sx, uv.getY(v) * sy); } }); uv.needsUpdate = true; return geo; }
export const aggMat = (kind, seed = 11, o = {}) => { const t = bakedTex(kind); return new THREE.MeshStandardMaterial({ map: t.map, bumpMap: t.bump, bumpScale: o.bump ?? 4, roughness: o.rough ?? (kind === 'dbm' || kind === 'bc' ? .6 : .92), metalness: 0, envMapIntensity: o.env ?? .55 }); };

/* a block wearing one texture on every face (world-unit UVs: one tile = TILE units) */
export function aggBlock(kind, w, h, d, seed = 11, o = {}) {
  const m = new THREE.Mesh(rbox(w, h, d, o.rd ?? .16, 6, 1 / TILE, [o.u ?? 0, o.v ?? 0]), aggMat(kind, seed, o)); m.castShadow = m.receiveShadow = true; m.userData.kind = kind; return m;
}
/* rebuild a block's geometry for a new height without stretching the texture */
export function resizeBlock(m, w, h, d, rd = .16) { const og = m.geometry; m.geometry = rbox(w, h, d, rd, 6, 1 / TILE, [0, 0]); og.dispose(); }
export const reduceM = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
