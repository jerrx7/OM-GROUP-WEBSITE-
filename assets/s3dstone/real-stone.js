/* OM GROUP · photographic stones for the 3D scenes.
   Geometry: fractured, angular stones (a welded, smooth-shaded icosphere pushed back onto random cleavage planes, then fine surface relief), so the
   edges are crisp but the faces are not the flat-shaded polygons the first stones had.
   Surface: the stones are wrapped in patches cut from OM GROUP's own stone photographs (scripts/s3dstone/build-stone-atlas.js -> stone-atlas.webp),
   projected from three sides (triplanar, so there are no UV seams and the grain is the real grain), with the photo's grain also driving a fine bump
   (screen-space derivatives) and a soft contact darkening toward the floor. Same material for crushed stone (atlas cells 0-3) and boulders (cells 4-7). */
import * as THREE from '/assets/vendor/three/three.module.min.js';
import { toCreasedNormals } from '/assets/vendor/three/BufferGeometryUtils.js';

const V3 = THREE.Vector3;
const rngf = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const cache = {};

function fractured(seed, kind) {
  const r = rngf(seed), boulder = kind === 'boulder';
  const src = new THREE.IcosahedronGeometry(1, boulder ? 4 : kind === 'low' ? 2 : 3), P = src.attributes.position, n = P.count;
  const orig = new Float32Array(P.array), s1 = r() * 9, s2 = r() * 9, s3 = r() * 9, f1 = r() * 9, f2 = r() * 9, f3 = r() * 9;
  const sx = boulder ? .92 + r() * .3 : .9 + r() * .4, sy = (boulder ? .72 : .66) + r() * .22, sz = .85 + r() * .3;
  const planes = []; const np = boulder ? 9 + ((r() * 4) | 0) : 11 + ((r() * 4) | 0);
  for (let k = 0; k < np; k++) planes.push([new V3(r() - .5, r() - .5, r() - .5).normalize(), (boulder ? .6 : .64) + r() * (boulder ? .26 : .2)]);
  const v = new V3(), out = new Float32Array(n * 3); let mean = 0;
  for (let i = 0; i < n; i++) {
    v.set(orig[i * 3], orig[i * 3 + 1], orig[i * 3 + 2]);
    v.multiplyScalar(1 + .13 * Math.sin(v.x * 3.1 + s1) * Math.cos(v.y * 2.6 + s2) + .07 * Math.sin(v.z * 4.3 + s3) * Math.sin(v.x * 5.1 + s1));
    v.set(v.x * sx, v.y * sy, v.z * sz);
    for (const [nn, off] of planes) { const o = v.dot(nn) - off; if (o > 0) v.addScaledVector(nn, -o); }
    // fine relief: small chips and grain steps, strongest on the larger stones
    const rel = Math.sin(v.x * 11 + f1) * Math.sin(v.y * 9.3 + f2) * Math.sin(v.z * 10.1 + f3) * (boulder ? .035 : .02) + Math.sin(v.x * 27 + f2) * Math.sin(v.z * 23 + f1) * .006;
    v.multiplyScalar(1 + rel);
    out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z; mean += v.length();
  }
  mean /= n;
  // weld duplicate vertices (the icosphere is un-indexed) so the normals can be smooth across the faces
  const map = new Map(), idx = [], pos = [], key = i => Math.round(orig[i * 3] * 1e4) + ',' + Math.round(orig[i * 3 + 1] * 1e4) + ',' + Math.round(orig[i * 3 + 2] * 1e4);
  const re = new Int32Array(n);
  for (let i = 0; i < n; i++) { const k = key(i); let j = map.get(k); if (j === undefined) { j = pos.length / 3; map.set(k, j); pos.push(out[i * 3] / mean, out[i * 3 + 1] / mean, out[i * 3 + 2] / mean); } re[i] = j; }
  for (let i = 0; i < n; i++) idx.push(re[i]);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const cell = boulder ? 4 + (seed % 2) : (seed % 2) * 2;   /* atlas cells 0 and 2 (fine granular grain) for crushed stone, 4 and 5 (the grey-brown boulder) for boulders; the swirled / veined cells stretch badly on small stones */ g.setAttribute('aCell', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3).fill(cell), 1));
  src.dispose(); return g;
}

/* a quarried, angular rock: a sphere cut by a handful of large planes, so the faces are flat and the edges are sharp (creased normals), with a little relief */
function angular(seed, hard) {
  const r = rngf(seed), src = new THREE.IcosahedronGeometry(1, 3), P = src.attributes.position, n = P.count, v = new V3(), out = new Float32Array(n * 3);
  const sx = .95 + r() * .35, sy = .66 + r() * .2, sz = .8 + r() * .3, planes = [], np = (hard ? 17 : 12) + ((r() * 4) | 0), f = [r() * 9, r() * 9, r() * 9]; let mean = 0;
  for (let k = 0; k < np; k++) planes.push([new V3(r() - .5, (r() - .5) * .8 + (k < 2 ? .9 : 0), r() - .5).normalize(), hard ? .5 + r() * .22 : .56 + r() * .2]);
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(P, i); v.set(v.x * sx, v.y * sy, v.z * sz);
    for (const [nn, off] of planes) { const o = v.dot(nn) - off; if (o > 0) v.addScaledVector(nn, -o); }
    v.multiplyScalar(1 + Math.sin(v.x * 9 + f[0]) * Math.sin(v.y * 8 + f[1]) * Math.sin(v.z * 9 + f[2]) * (hard ? .02 : .012));
    out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z; mean += v.length();
  }
  mean /= n; for (let i = 0; i < out.length; i++) out[i] /= mean;
  let g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3)); g.setAttribute('aCell', new THREE.Float32BufferAttribute(new Float32Array(n).fill(4 + (seed % 2)), 1));
  g = toCreasedNormals(g, hard ? .3 : .42); src.dispose(); return g;
}

/* a set of stone shapes: kind 'crush' (8 shapes, ~1300 faces), 'low' (8 shapes, ~320 faces, for hundreds of particles) or 'boulder' (6 shapes, ~5000 faces) */
export function realStones(kind = 'crush') {
  if (cache[kind]) return cache[kind]; const out = [];
  if (kind === 'quarry') { for (let i = 0; i < 8; i++) out.push(angular(4000 + i * 61, true)); return (cache[kind] = out); }
  if (kind === 'rock') { for (let i = 0; i < 6; i++) out.push(angular(3000 + i * 53)); return (cache[kind] = out); }
  for (let i = 0; i < (kind === 'boulder' ? 6 : 8); i++) out.push(fractured(1000 + i * 37 + (kind === 'boulder' ? 500 : kind === 'low' ? 250 : 0), kind));
  return (cache[kind] = out);
}

const MATS = {}; let TEX = null;
/* tint: brightness multiplier; own: a private material (for a part that fades on its own); otherwise one shared material per tint */
/* realStoneMaterial(tint) or realStoneMaterial({ tint, own, bump, floor, gain }): bump = relief strength per world unit (scale it with the particle size),
   floor = contact darkening toward y = 0 (0 = none), gain = overall brightness */
export function realStoneMaterial(o = 1, own0 = false, bump0) {
  if (typeof o !== 'object') o = { tint: o, own: own0, bump: bump0 };
  const tint = o.tint ?? 1, own = !!o.own, bump = o.bump ?? .22, floor = o.floor ?? .42, gain = o.gain ?? .74, contrast = o.contrast ?? 1, scale = o.scale ?? 1.6, detail = o.detail ?? 0, soft = o.soft ?? 0, grain = o.grain ?? 0, pores = o.pores ?? 0;
  const ck = 't' + tint + 'b' + bump + 'f' + floor + 'g' + gain + 'c' + contrast + 's' + scale + 'd' + detail + 'o' + soft + 'n' + grain + 'p' + pores; if (!own && MATS[ck]) return MATS[ck];
  if (!TEX) { TEX = new THREE.TextureLoader().load('/assets/s3dstone/stone-atlas.webp'); TEX.colorSpace = THREE.SRGBColorSpace; TEX.anisotropy = 8; TEX.minFilter = THREE.LinearMipmapLinearFilter; TEX.generateMipmaps = true; }
  const tex = TEX;
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color().setScalar(tint), roughness: .86, metalness: 0, envMapIntensity: .8 });
  const U = { uAtlas: { value: tex }, uScaleCrush: { value: .5 }, uScaleBoulder: { value: scale }, uBump: { value: bump }, uGain: { value: gain }, uFloorK: { value: floor }, uFloor: { value: 7 }, uContrast: { value: contrast }, uDetail: { value: detail }, uSoft: { value: soft }, uGrain: { value: grain }, uPores: { value: pores }, uPoreWet: { value: 0 }, uPoreY: { value: 1e4 } };
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aCell;\nvarying vec3 vOP;\nvarying vec3 vON;\nvarying float vCell;\nvarying float vWY;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP = position; vON = normal; vCell = aCell;\nvec4 rsw = vec4(position, 1.0);\n#ifdef USE_INSTANCING\nrsw = instanceMatrix * rsw;\n#endif\nvWY = (modelMatrix * rsw).y;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D uAtlas; uniform float uScaleCrush, uScaleBoulder, uBump, uGain, uFloor, uFloorK, uContrast, uDetail, uSoft, uGrain, uPores, uPoreWet, uPoreY;
float rsHash(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float rsVN(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f); return mix(mix(mix(rsHash(i), rsHash(i + vec3(1,0,0)), f.x), mix(rsHash(i + vec3(0,1,0)), rsHash(i + vec3(1,1,0)), f.x), f.y), mix(mix(rsHash(i + vec3(0,0,1)), rsHash(i + vec3(1,0,1)), f.x), mix(rsHash(i + vec3(0,1,1)), rsHash(i + vec3(1,1,1)), f.x), f.y), f.z); }
float rsPores(vec3 p){
  float m = 0.;
  for (int s = 0; s < 2; s++) {
    float f = s == 0 ? 1. : 2.7; vec3 q = p * f + float(s) * 7.3, i = floor(q), fr = fract(q);
    for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec3 g = vec3(float(x), float(y), float(z)), c = i + g; if (rsHash(c + 3.1) < (s == 0 ? .3 : .45)) continue;
      vec3 o = vec3(rsHash(c + 11.7), rsHash(c + 23.9), rsHash(c + 37.3)); float d = length(g + o - fr), r = (s == 0 ? .3 : .17) * (.45 + rsHash(c + 51.1));
      m = max(m, 1. - smoothstep(r * .5, r, d));
    }
  }
  return m;
}
varying vec3 vOP; varying vec3 vON; varying float vCell; varying float vWY;
vec2 rsMir(vec2 u) { return abs(fract(u * .5) * 2. - 1.); }
vec4 rsTri(vec3 p, vec3 n, float cell) {
  float sc = cell < 3.5 ? uScaleCrush : uScaleBoulder;
  vec3 w = pow(abs(n), vec3(5.)); w /= (w.x + w.y + w.z + 1e-5);
  vec2 org = vec2(mod(cell, 4.), floor(cell / 4.)), pad = vec2(.004);
  vec3 cx = texture2D(uAtlas, (org + pad + rsMir(p.zy * sc) * (1. - 2. * pad)) / vec2(4., 2.), uSoft).rgb;
  vec3 cy = texture2D(uAtlas, (org + pad + rsMir(p.xz * sc + .37) * (1. - 2. * pad)) / vec2(4., 2.), uSoft).rgb;
  vec3 cz = texture2D(uAtlas, (org + pad + rsMir(p.xy * sc + .71) * (1. - 2. * pad)) / vec2(4., 2.), uSoft).rgb;
  vec3 c = cx * w.x + cy * w.y + cz * w.z;
  return vec4(c, dot(c, vec3(.3, .59, .11)));
}`)
      .replace('#include <map_fragment>', `vec4 rsT = rsTri(vOP, normalize(vON), vCell);
float triH = rsT.a;
if (uGrain > 0.) { vec3 gp = vOP * 20.; float g = rsVN(gp) * .5 + rsVN(gp * 2.3) * .3 + rsVN(gp * 5.1) * .2; rsT.rgb *= 1. + (g - .5) * 1.1 * uGrain; triH += (g - .5) * 1.4 * uGrain; }
if (uDetail > 0.) { vec4 rsD = rsTri(vOP * 4.3 + vec3(3.3, 1.7, 5.1), normalize(vON), vCell); rsT.rgb *= mix(vec3(1.), rsD.rgb / vec3(.48), uDetail); triH = rsT.a * (1. - .5 * uDetail) + rsD.a * .5 * uDetail; }
float rsPM = 0.;
if (uPores > 0.) { rsPM = rsPores(vOP * uPores); triH -= rsPM * .9; rsT.rgb *= 1. - rsPM * .78; }
float wetA = uPoreWet * (1. - smoothstep(uPoreY - .9, uPoreY + .9, vWY));
diffuseColor.rgb *= mix(vec3(.5), rsT.rgb, uContrast) * uGain * mix(1. - uFloorK, 1., smoothstep(0., uFloor, vWY));
diffuseColor.rgb *= 1. - wetA * .45;
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.015, .04, .055), rsPM * wetA * .75);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, .07, clamp(wetA * (.4 + rsPM), 0., 1.));`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{
  vec2 dh = vec2(dFdx(triH), dFdy(triH));
  vec3 sigX = dFdx(-vViewPosition), sigY = dFdy(-vViewPosition);
  vec3 r1 = cross(sigY, normal), r2 = cross(normal, sigX);
  float det = dot(sigX, r1) * faceDirection;
  vec3 grad = sign(det) * (dh.x * r1 + dh.y * r2);
  normal = normalize(abs(det) * normal - uBump * grad);
}`);
    /* features that are off for this material are cut out of the shader: the pore search (27 hash lookups, twice) and the second texture layer were compiled into every stone before, which made the shader slow to link */
    let f = sh.fragmentShader;
    const cutLine = (src, start) => { const i = src.indexOf(start); if (i < 0) return src; const j = src.indexOf(String.fromCharCode(10), i); return src.slice(0, i) + src.slice(j + 1); };
    const cutFn = (src, start, end) => { const i = src.indexOf(start); if (i < 0) return src; const j = src.indexOf(end, i); return src.slice(0, i) + src.slice(j + end.length); };
    if (!(pores > 0)) { f = cutFn(f, 'float rsPores(vec3 p){', String.fromCharCode(10) + '}' + String.fromCharCode(10)); f = cutLine(f, 'if (uPores > 0.)'); }
    if (!(detail > 0)) f = cutLine(f, 'if (uDetail > 0.)');
    if (!(grain > 0)) f = cutLine(f, 'if (uGrain > 0.)');
    sh.fragmentShader = f;
  };
  m.customProgramCacheKey = () => 'realstone-v6' + (pores > 0 ? 'p' : '') + (detail > 0 ? 'd' : '') + (grain > 0 ? 'g' : '');
  m.userData.uniforms = U;
  if (!own) MATS[ck] = m;
  return m;
}
