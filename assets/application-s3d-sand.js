/* shared kit for the M-Sand scenes: crushed-rock grain geometry (angular, flaky, cubical, rounded, fine), palettes, instancing, dishes.
   Grains are generated, not scanned: they show the kind of particle, not a measured sample. */
import { THREE, L, rng } from '/assets/application-s3d.js';
const { TAU, M, mk, clamp } = L;
const V3 = THREE.Vector3;

const KIND = {
  ang: { cuts: 7, off: [.6, .8], det: 1, sx: [1, .86, 1.08], wob: .2 },
  flat: { cuts: 6, off: [.5, .78], det: 1, sx: [1.4, .46, 1.05], wob: .2 },
  cube: { cuts: 9, off: [.66, .78], det: 1, sx: [1, .94, 1], wob: .1 },
  round: { cuts: 0, off: [.7, .8], det: 1, sx: [1, .84, 1.06], wob: .1 },
  fine: { cuts: 4, off: [.64, .8], det: 0, sx: [1, .9, 1], wob: .15 },
  /* natural river grains: sub-rounded (a few worn flats), well-rounded, and a low-poly fine version */
  sub: { cuts: 4, off: [.8, .92], det: 1, sx: [1.08, .8, 1], wob: .16, soft: .8 },
  subf: { cuts: 0, off: [.8, .9], det: 0, sx: [1.06, .84, 1], wob: .14, soft: .9 },
  rnd: { cuts: 0, off: [.8, .9], det: 1, sx: [1.1, .82, 1], wob: .08, soft: .95 },
};
/* palettes: [linear rgb base ranges] */
const PAL = {
  m: r => { const q = r(); if (q < .1) { const b = .3 + r() * .12; return [b, b * .99, b * .96]; } if (q < .22) return [.2 + r() * .04, .15 + r() * .03, .11 + r() * .03]; const b = .075 + r() * .12; return [b * .98, b, b * 1.04]; },
  river: r => { const q = r(); if (q < .15) return [.2 + r() * .06, .14 + r() * .04, .08 + r() * .03]; if (q < .4) { const b = .5 + r() * .1; return [b, b * .88, b * .7]; } return [.34 + r() * .08, .27 + r() * .06, .18 + r() * .05]; },
  granite: r => { const q = r(); const b = .22 + r() * .1; return q < .25 ? [b * 1.7, b * 1.0, b * .85] : q < .5 ? [b * 1.9, b * 1.8, b * 1.65] : [b, b * .95, b * .9]; },
  stone: r => { const b = .09 + r() * .1; return [b * .98, b, b * 1.05]; },
  p: r => { const q = r(); const b = .28 + r() * .1; return q < .2 ? [b * 1.25, b * 1.12, b * .9] : [b, b * .9, b * .74]; },
  dust: r => { const b = .16 + r() * .12; return [b, b, b * 1.04]; },
  washed: r => { const q = r(); const b = .4 + r() * .14; return q < .2 ? [b * .8, b * .72, b * .6] : [b, b * .94, b * .82]; },
  sea: r => { const q = r(); const b = .5 + r() * .1; return q < .18 ? [.62, .4, .36] : q < .3 ? [.12, .1, .09] : [b, b * .95, b * .84]; },
  pit: r => { const q = r(); const b = .26 + r() * .08; return q < .15 ? [.5, .46, .4] : [b * 1.35, b * .62, b * .34]; },
  white: r => { const b = .5 + r() * .1; return [b, b, b]; },
};
const cache = {};
/* blend each face normal with the average of the normals that meet at the same corner: keeps the flat crushed faces but removes the low-poly look */
function softNormals(g, k) {
  const p = g.attributes.position, n = g.attributes.normal, acc = new Map(), key = i => Math.round(p.getX(i) * 400) + ',' + Math.round(p.getY(i) * 400) + ',' + Math.round(p.getZ(i) * 400);
  for (let i = 0; i < p.count; i++) { const kk = key(i); let a = acc.get(kk); if (!a) acc.set(kk, a = [0, 0, 0]); a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i); }
  const v = new V3(); for (let i = 0; i < p.count; i++) { const a = acc.get(key(i)); v.set(a[0], a[1], a[2]).normalize().multiplyScalar(k).add(new V3(n.getX(i), n.getY(i), n.getZ(i)).multiplyScalar(1 - k)).normalize(); n.setXYZ(i, v.x, v.y, v.z); }
}
/* a page can ask for another sand: the scenes still say 'm' and 'ang', and the map turns them into river grains. null = unchanged (M-Sand page) */
const MAPS = { river: { pal: { m: 'river' }, kind: { ang: 'sub', flat: 'sub', cube: 'rnd', fine: 'subf', round: 'rnd' } } };
let MAP = null; export function setSandMap(name) { MAP = MAPS[name] || null; }
export function grainGeos(kind = 'ang', pal = 'm', n = 12) {
  if (MAP && MAP.pal[pal]) { kind = MAP.kind[kind] || kind; pal = MAP.pal[pal]; }
  const key = kind + '|' + pal; if (cache[key]) return cache[key];
  const K = KIND[kind], r = rng(kind.length * 131 + pal.length * 17 + 5), out = [];
  for (let k = 0; k < n; k++) {
    const g = new THREE.IcosahedronGeometry(1, K.det), p = g.attributes.position, s1 = r() * 9, s2 = r() * 9, s3 = r() * 9, v = new V3(), planes = [];
    for (let c = 0; c < K.cuts; c++) planes.push([new V3(r() - .5, r() - .5, r() - .5).normalize(), K.off[0] + r() * (K.off[1] - K.off[0])]);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i); v.multiplyScalar(1 + K.wob * Math.sin(v.x * 3.1 + s1) * Math.cos(v.y * 2.6 + s2) + K.wob * .5 * Math.sin(v.z * 4.3 + s3));
      for (const [nn, off] of planes) { const o = v.dot(nn) - off; if (o > 0) v.addScaledVector(nn, -o); }
      p.setXYZ(i, v.x * K.sx[0], v.y * K.sx[1], v.z * K.sx[2]);
    }
    g.computeVertexNormals(); softNormals(g, K.soft ?? .35); const col = new Float32Array(p.count * 3), base = PAL[pal](r), a1 = r() * 9, a2 = r() * 9, a3 = r() * 9, b1 = r() * 9, b2 = r() * 9;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), n1 = .5 + .5 * Math.sin(x * 6 + a1) * Math.sin(y * 7 + a2) * Math.sin(z * 5 + a3), n2 = Math.sin(x * 11 + b1) * Math.sin(y * 9 + b2) * Math.sin(z * 12 + a1);
      let m = .72 + .5 * n1; const sp = n2 > .62 ? 1.5 : n2 < -.66 ? .6 : 1;
      col[i * 3] = base[0] * m * sp; col[i * 3 + 1] = base[1] * m * sp; col[i * 3 + 2] = base[2] * m * sp;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); out.push(g);
  }
  return (cache[key] = out);
}
/* a smooth, speckled mineral grain: a sphere pushed in by planar cuts (angular) or left nearly whole (rounded), with soft normals and per-vertex mineral colour */
/* value noise for the large mineral shapes: no visible lattice, so the surface reads as stone rather than a pattern */
const hash3 = (x, y, z, s) => { let h = (x * 374761393 + y * 668265263 + z * 2147483647 + s * 1274126177) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967295; };
function vnoise(x, y, z, s) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz), l = (p, q, t) => p + (q - p) * t;
  return l(l(l(hash3(ix, iy, iz, s), hash3(ix + 1, iy, iz, s), u), l(hash3(ix, iy + 1, iz, s), hash3(ix + 1, iy + 1, iz, s), u), v), l(l(hash3(ix, iy, iz + 1, s), hash3(ix + 1, iy, iz + 1, s), u), l(hash3(ix, iy + 1, iz + 1, s), hash3(ix + 1, iy + 1, iz + 1, s), u), v), w);
}
const fbm = (x, y, z, s) => vnoise(x, y, z, s) * .55 + vnoise(x * 2.1, y * 2.1, z * 2.1, s + 1) * .28 + vnoise(x * 4.3, y * 4.3, z * 4.3, s + 2) * .17;
/* a large, smooth, speckled mineral grain or rock: a sphere pushed in by planar cuts (angular) or left nearly whole (rounded), soft normals, per-vertex mineral colour.
   o: { w, h (sphere segments), cuts, rough, wob, sx, tone: 'rock', cracks: thickness } */
export function mineralGrain(kind, seed, o = {}) {
  const r = rng(seed), g = new THREE.SphereGeometry(1, o.w || 200, o.h || 140), p = g.attributes.position, v = new V3();
  const cut = o.cuts ?? { ang: 9, sub: 5, rnd: 0 }[kind], off = { ang: [.62, .8], sub: [.8, .9], rnd: [1, 1] }[kind], wob = o.wob ?? { ang: .16, sub: .13, rnd: .1 }[kind];
  const sx = o.sx || { ang: [1.12, .82, .98], sub: [1.1, .84, 1], rnd: [1.12, .84, 1.02] }[kind], rough = o.rough ?? { ang: .07, sub: .045, rnd: .02 }[kind];
  const planes = []; for (let c = 0; c < cut; c++) planes.push([new V3(r() - .5, r() - .5, r() - .5).normalize(), off[0] + r() * (off[1] - off[0])]);
  const sd = (seed * 7 + 3) | 0, ox = r() * 40, oy = r() * 40, oz = r() * 40;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); v.multiplyScalar(1 + wob * (fbm(v.x * 1.3 + ox, v.y * 1.3 + oy, v.z * 1.3 + oz, sd) - .5) * 2);
    for (const [nn, d] of planes) { const e = v.dot(nn) - d; if (e > 0) v.addScaledVector(nn, -e * (kind === 'sub' ? .85 : 1)); }
    v.multiplyScalar(1 + rough * (fbm(v.x * 3.2 + oy, v.y * 3.2 + oz, v.z * 3.2 + ox, sd + 5) - .5) * 2);
    p.setXYZ(i, v.x * sx[0], v.y * sx[1], v.z * sx[2]);
  }
  g.computeVertexNormals(); const nrm = g.attributes.normal, acc = new Map(), key = i => Math.round(p.getX(i) * 2000) + ',' + Math.round(p.getY(i) * 2000) + ',' + Math.round(p.getZ(i) * 2000);
  for (let i = 0; i < p.count; i++) { const k = key(i); let a = acc.get(k); if (!a) acc.set(k, a = [0, 0, 0]); a[0] += nrm.getX(i); a[1] += nrm.getY(i); a[2] += nrm.getZ(i); }
  for (let i = 0; i < p.count; i++) { const a = acc.get(key(i)); v.set(a[0], a[1], a[2]).normalize(); nrm.setXYZ(i, v.x, v.y, v.z); }
  const col = new Float32Array(p.count * 3), rock = o.tone === 'rock', grey = o.tone === 'grey', base = rock ? [.13, .115, .105] : grey ? [.2 + r() * .02, .2 + r() * .02, .21 + r() * .02] : [.27 + r() * .04, .19 + r() * .03, .115 + r() * .02];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), n1 = fbm(x * 1.6 + ox, y * 1.6, z * 1.6 + oz, sd + 9), f = vnoise(x * 5.5 + oz, y * 5.5, z * 5.5 + ox, sd + 11), f2 = vnoise(x * 9 + ox, y * 9 + oy, z * 9, sd + 13);
    const ss = (e0, e1, q) => { const t = Math.min(1, Math.max(0, (q - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
    let m = .74 + .5 * n1, c = base; const mix = (q, t) => { c = [c[0] + (q[0] - c[0]) * t, c[1] + (q[1] - c[1]) * t, c[2] + (q[2] - c[2]) * t]; };
    mix(rock ? [.3, .275, .25] : grey ? [.44, .44, .45] : [.46, .41, .33], ss(.6, .78, f) * (rock ? .55 : .7)); mix(rock ? [.04, .04, .04] : [.06, .05, .04], (1 - ss(.1, .3, f)) * (rock ? .6 : .55)); mix(rock ? [.28, .14, .11] : grey ? [.3, .24, .22] : [.34, .17, .12], ss(.7, .84, f2) * (grey ? .35 : .6));
    if (o.cracks) { const cr = Math.abs(fbm(x * 1.5 + oy, y * 1.5 + ox, z * 1.5 + oz, sd + 17) - .5); if (cr < o.cracks) { const k = .15 + .85 * (cr / o.cracks); m *= k; } }
    col[i * 3] = c[0] * m; col[i * 3 + 1] = c[1] * m; col[i * 3 + 2] = c[2] * m;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
}
export const grainMat = (o = {}) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: o.rough ?? .86, metalness: 0, envMapIntensity: .65, ...(o.extra || {}) });
export const hotMat = () => new THREE.MeshStandardMaterial({ color: 0xff5e29, roughness: .5, emissive: 0xff5e29, emissiveIntensity: .35 });
/* items: [x,y,z,r,(rotSeed)]. Returns the InstancedMeshes (one per geometry variant). setItem lets a scene move one later. */
export function inst(parent, items, geos, mat, seed = 1, shadow = false, flat = 1) {
  const r = rng(seed), per = geos.map(() => []); items.forEach(it => per[(r() * geos.length) | 0].push(it)); const o = new THREE.Object3D(), ims = [];
  per.forEach((arr, gi) => { if (!arr.length) return; const im = new THREE.InstancedMesh(geos[gi], mat, arr.length); arr.forEach((it, i) => { o.position.set(it[0], it[1], it[2]); const s = it[3]; o.scale.set(s * (.9 + r() * .2), s * flat * (.85 + r() * .25), s * (.9 + r() * .2)); o.rotation.set(r() * 6, r() * 6, r() * 6); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }); const cc = new THREE.Color(); arr.forEach((_, i) => { const b = .85 + r() * .35; cc.setRGB(b * (1 + (r() - .5) * .06), b, b * (1 - (r() - .5) * .05)); im.setColorAt(i, cc); }); im.castShadow = shadow; im.frustumCulled = false; parent.add(im); ims.push(im); });
  return ims;
}
/* grain sizes drawn from sieve-passing curve points: pts = [[dMax_mm, cumulative passing %], ...] ascending; returns a function giving a random diameter (mm) */
export function sizeSampler(pts, r) {
  return () => { const u = r() * 100; let a = [pts[0][0] * .5, 0]; for (const b of pts) { if (u <= b[1]) { const t = (u - a[1]) / Math.max(b[1] - a[1], 1e-6); return Math.exp(Math.log(a[0]) + t * (Math.log(b[0]) - Math.log(a[0]))); } a = b; } return pts[pts.length - 1][0]; };
}
/* a mound of grains on the XZ plane around (0,0): n grains in `layers` shells, radius R, height H. sample() gives radius in scene units */
export function moundItems(n, R, H, sample, r, y0 = 0) {
  const it = []; for (let i = 0; i < n; i++) {
    const rr = R * Math.sqrt(r()) , a = r() * TAU, h = Math.pow(Math.max(0, 1 - Math.pow(rr / R, 2)), .8) * H, s = sample();
    it.push([Math.cos(a) * rr, y0 + h - r() * Math.min(h, s * 2.4) + s * .55, Math.sin(a) * rr, s]);
  } return it;
}
/* filler under a mound so the grains read as a solid heap */
export function moundBase(R, H, color = 0x6d6a66) {
  const pts = []; for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push(new THREE.Vector2(R * (1 - t) * .985, Math.pow(1 - Math.pow(1 - t, 2), .9) * H * .9)); }
  const g = new THREE.LatheGeometry(pts.reverse(), 40); return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: 1, side: THREE.DoubleSide }));
}
export function dish(R, h = 1.2, mat = M.white) {
  const pts = [[0, 0], [R * .9, 0], [R, h * .9], [R * 1.03, h * 1.4], [R * .98, h * 1.45], [R * .95, h * 1.05], [R * .86, h * .35], [0, h * .3]].map(p => new THREE.Vector2(p[0], p[1]));
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), mat); m.castShadow = true; m.receiveShadow = true; return m;
}
export const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export { V3, TAU, rng, L, THREE };
