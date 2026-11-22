/* scene: M-Sand grains (M-Sand page, "What is M-Sand"). 1 unit = 1 mm. Three views: a poured heap of crushed-rock fine aggregate beside a steel rule, two particle shapes,
   and the 4.75 mm IS sieve (a woven steel mesh in a brass frame, a few slightly coarser grains left on it, the fines falling through into a pan).
   How it is made: the heap is poured at a natural angle of repose (about 34 degrees) with the coarser grains rolled toward its foot; its surface is a
   grain shader (hundreds of thousands of tiny faceted crystals: dark, grey, pale quartz / feldspar, tan and rust-stained, each with its own facet, crisp edges and dust), and
   on it sit a few thousand real grains modelled as fractured, flat-faced particles that cast shadows on one another. Grains are generated, not scanned:
   they show what the material looks like, they are not a measured sample and show no grading. */
import { THREE, studio, rng } from '/assets/application-s3d.js';
import { toCreasedNormals } from '/assets/vendor/three/BufferGeometryUtils.js';
import { dish } from '/assets/application-s3d-sand.js';
const V3 = THREE.Vector3, Q = THREE.Quaternion, TAU = Math.PI * 2;
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ───────── mineral colour of a grain: dark, grey, pale grey, quartz / feldspar white, tan, rust (linear rgb) ───────── */
export const mineral = r => {
  const h = r(), v = r(), k = (b, a, c) => b.map(x => x * (a + v * c));
  return h < .17 ? k([.05, .052, .056], .6, 1.1) : h < .5 ? k([.12, .12, .126], .65, 1.2) : h < .76 ? k([.25, .245, .24], .7, .9) : h < .89 ? k([.42, .41, .39], .75, .6) : h < .955 ? k([.26, .2, .14], .7, 1) : k([.22, .13, .1], .7, 1);
};

/* the sands of the Applications pages: grain form (round = worn, rounded and sub-rounded grains), mineral tint (null = the grey crushed-rock default),
   grain-size cells and how much dust coats the grains. Pass the figure's state; `sand` picks the entry. */
const SAND_DEF = {
  river:    { round: true,  TT: [2.5, 1.85, 1.05], csf: .26, csm: .64, dust: .12, gs: 1 },
  washed:   { round: true,  TT: [3.2, 2.75, 1.95], csf: .25, csm: .62, dust: .06, gs: 1 },
  concrete: { round: false, TT: [1.75, 1.45, 1.08], csf: .23, csm: .58, dust: .2, gs: 1 },
  plaster:  { round: false, TT: [2.1, 1.7, 1.18], csf: .12, csm: .3, dust: .36, gs: .55 },
};
export const sandOf = st => { const k = st && st.sand, d = SAND_DEF[k]; return d ? { k, ...d } : { k: '', round: false, TT: null, csf: .24, csm: .6, dust: .22, gs: 1 }; };

/* ───────── fractured grain geometry: a welded sphere cut by planes (crisp, flat faces), normalised to a mean radius of 1 ───────── */
const KINDS = {
  ang:   { det: 3, sx: 1.12, sy: .82, sz: .98, cuts: 16, off: [.52, .74], wob: .07 },
  sub:   { det: 3, sx: 1.12, sy: .8, sz: 1, cuts: 5, off: [.78, .9], wob: .1 },
  round: { det: 2, sx: 1.1, sy: .86, sz: 1, cuts: 0, off: [.8, .9], wob: .11 },
  tiny:  { det: 0, sx: 1.1, sy: .85, sz: 1, cuts: 4, off: [.6, .8], wob: .1 },
  small: { det: 1, sx: 1.1, sy: .85, sz: 1, cuts: 6, off: [.58, .78], wob: .08 },
  flaky: { det: 3, sx: 1.75, sy: .34, sz: 1.2, cuts: 14, off: [.6, .84], wob: .05 },
  cubic: { det: 3, sx: 1, sy: .95, sz: 1, cuts: 0, off: [.74, .8], wob: .03, box: true },
};
export function crushed(seed, kind) {
  const K = KINDS[kind], r = rng(seed), g0 = new THREE.IcosahedronGeometry(1, K.det), p = g0.attributes.position, v = new V3(), planes = [], s1 = r() * 9, s2 = r() * 9, s3 = r() * 9;
  if (K.box) { const ax = [new V3(1, 0, 0), new V3(-1, 0, 0), new V3(0, 1, 0), new V3(0, -1, 0), new V3(0, 0, 1), new V3(0, 0, -1)]; ax.forEach(a => planes.push([a.clone().add(new V3(r() - .5, r() - .5, r() - .5).multiplyScalar(.2)).normalize(), .58 + r() * .1])); for (let c = 0; c < 8; c++) planes.push([new V3(r() - .5, r() - .5, r() - .5).normalize(), .74 + r() * .08]); }
  else for (let c = 0; c < K.cuts; c++) planes.push([new V3(r() - .5, r() - .5, r() - .5).normalize(), K.off[0] + r() * (K.off[1] - K.off[0])]);
  let mean = 0; const out = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); v.multiplyScalar(1 + K.wob * (Math.sin(v.x * 3.1 + s1) * Math.cos(v.y * 2.6 + s2) + .5 * Math.sin(v.z * 4.3 + s3)));
    v.set(v.x * K.sx, v.y * K.sy, v.z * K.sz);
    for (const [nn, off] of planes) { const o = v.dot(nn) - off * (nn.x * nn.x * K.sx * K.sx + nn.y * nn.y * K.sy * K.sy + nn.z * nn.z * K.sz * K.sz) ** .5; if (o > 0) v.addScaledVector(nn, -o); }
    out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z; mean += v.length();
  }
  mean /= p.count; for (let i = 0; i < out.length; i++) out[i] /= mean;
  let g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3)); g = toCreasedNormals(g, .5); g0.dispose();
  const seen = new Map(), uq = [], P = g.attributes.position; for (let i = 0; i < P.count; i++) { const k = Math.round(P.getX(i) * 500) + ',' + Math.round(P.getY(i) * 500) + ',' + Math.round(P.getZ(i) * 500); if (!seen.has(k)) { seen.set(k, 1); uq.push(P.getX(i), P.getY(i), P.getZ(i)); } }
  g.userData.uq = uq; return g;
}
/* the way a loose grain lies: a random turn that leaves it resting on a flat face, with its centre of gravity over the three lowest corners */
export function restQuat(geo, r) {
  const u = geo.userData.uq, q = new Q(), v = new V3(); let best = null;
  for (let t = 0; t < 90; t++) {
    q.set(r() - .5, r() - .5, r() - .5, r() - .5).normalize(); const L = []; for (let i = 0; i < u.length; i += 3) { v.set(u[i], u[i + 1], u[i + 2]).applyQuaternion(q); L.push([v.y, v.x, v.z]); }
    L.sort((a, b) => a[0] - b[0]); const [a, b, c] = L, flat = c[0] - a[0];
    const sg = (p1, p2) => (0 - p2[1]) * (p1[2] - p2[2]) - (p1[1] - p2[1]) * (0 - p2[2]), d1 = sg(a, b), d2 = sg(b, c), d3 = sg(c, a), inside = !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
    if (inside && (!best || flat < best.flat)) best = { q: q.clone(), flat, minY: a[0] };
  }
  return best || { q: new Q(), minY: -.8 };
}

/* ───────── grain surface shaders ───────── */
export const GLSL_HASH = `
float sdH(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 sdH2(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float sdh3(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float sdn3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
  return mix(mix(mix(sdh3(i), sdh3(i + vec3(1,0,0)), f.x), mix(sdh3(i + vec3(0,1,0)), sdh3(i + vec3(1,1,0)), f.x), f.y), mix(mix(sdh3(i + vec3(0,0,1)), sdh3(i + vec3(1,0,1)), f.x), mix(sdh3(i + vec3(0,1,1)), sdh3(i + vec3(1,1,1)), f.x), f.y), f.z); }
`;
const GLSL_HEAP = `
vec3 sdPal(float h, float v){
  if (h < .17) return vec3(.05, .052, .056) * (.6 + v * 1.1);
  if (h < .5) return vec3(.12, .12, .126) * (.65 + v * 1.2);
  if (h < .76) return vec3(.25, .245, .24) * (.7 + v * .9);
  if (h < .89) return vec3(.42, .41, .39) * (.75 + v * .6);
  if (h < .955) return vec3(.26, .2, .14) * (.7 + v);
  return vec3(.22, .13, .1) * (.7 + v);
}
void sdCells(vec2 p, float cs, float seed, out vec3 col, out vec2 tilt, out float edge, out float rough, out float pick){
  vec2 g = p / cs + seed, i = floor(g), f = fract(g); float d1 = 9., d2 = 9.; vec2 c1 = vec2(0.), r1 = vec2(0.);
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 o = vec2(float(x), float(y)), c = i + o, h = sdH2(c), r = o + .12 + h * .76 - f; float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; c1 = c; r1 = r; } else if (d < d2) d2 = d;
  }
  edge = smoothstep(0., .2, sqrt(d2) - sqrt(d1));
  float h0 = sdH(c1 + 3.7), h1 = sdH(c1 + 9.1); pick = sdH(c1 + 17.3);
  col = sdPal(h0, h1); vec2 rr = sdH2(c1 + 31.7) - .5; tilt = rr * 1.5 - r1 * .5;
  rough = h1 > .93 ? .3 : mix(.92, .55, smoothstep(.2, .5, dot(col, vec3(.33))));
  if (h1 > .93) col *= 1.5;
}
`;
const HEAP_MAP = `
vec3 sdNW = normalize(vWN); vec2 sdP = vWP.xz;
vec3 cF, cM; vec2 tF, tM; float eF, eM, rF, rM, pF, pM;
sdCells(sdP, CSF, 11.3, cF, tF, eF, rF, pF);
sdCells(sdP + 7.7, CSM, 3.7, cM, tM, eM, rM, pM);
float sdPx = length(fwidth(sdP)) + 1e-5, aaF = smoothstep(.4, 1.5, CSF / sdPx), aaM = smoothstep(.4, 1.5, CSM / sdPx);
cF = mix(vec3(.19, .185, .18), cF, aaF); tF *= aaF; eF = mix(1., eF, aaF); cM = mix(vec3(.19, .185, .18), cM, aaM); tM *= aaM; eM = mix(1., eM, aaM);
float sdUseM = step(pM, .5) * step(.04, eM);
vec3 sdCol = mix(cF * mix(.66, 1., eF), cM * mix(.58, 1., eM), sdUseM) * .8;
vec2 sdTilt = mix(tF, tM, sdUseM); float sdRough = mix(rF, rM, sdUseM);
float sdLo = sdn3(vec3(sdP * .16, 1.3)); sdCol *= .78 + .42 * sdLo; sdCol = mix(sdCol, DUSTCOL, DUST);
sdCol *= mix(.5, 1., smoothstep(.0, 1.4, vLY));
float sdRim = smoothstep(.84, 1., vRad); if (sdRim > 0. && sdH(floor(sdP / (CSF * 1.1)) + 5.3) < sdRim * 1.15) discard;
sdCol *= TINTV;
diffuseColor.rgb = sdCol;
`;
export function heapMat(csf = .24, csm = .6, dust = .22, tint = [1, 1, 1], uni = false) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .9, metalness: 0, envMapIntensity: .5 });
  if (uni) { m.userData.uDust = { value: dust }; m.userData.uDustCol = { value: new THREE.Vector3(.34, .27, .18) }; }   /* the dust coat can then be changed after the first frame (washing) */
  m.onBeforeCompile = sh => {
    if (uni) { sh.uniforms.uDust = m.userData.uDust; sh.uniforms.uDustCol = m.userData.uDustCol; }
    const hm = HEAP_MAP.split('CSF').join(csf.toFixed(4)).split('CSM').join(csm.toFixed(4)).split('DUSTCOL').join(uni ? 'uDustCol' : 'vec3(.3, .29, .275)').split('DUST').join(uni ? 'uDust' : dust.toFixed(3)).split('TINTV').join('vec3(' + tint.map(v => v.toFixed(3)).join(',') + ')');
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aRad; varying float vRad; varying float vLY; varying vec3 vWP; varying vec3 vWN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRad = aRad; vLY = position.y; vWP = (modelMatrix * vec4(position, 1.)).xyz; vWN = normalize(mat3(modelMatrix) * normal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vRad; varying float vLY; varying vec3 vWP; varying vec3 vWN;\n' + (uni ? 'uniform float uDust; uniform vec3 uDustCol;\n' : '') + GLSL_HASH + GLSL_HEAP)
      .replace('#include <map_fragment>', hm)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = sdRough;')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = normalize((viewMatrix * vec4(normalize(sdNW + vec3(sdTilt.x, 0., sdTilt.y) * .9), 0.)).xyz);');
  };
  m.customProgramCacheKey = () => 'msand-heap-v4-' + csf + '-' + csm + '-' + (uni ? 'u' : dust) + '-' + tint.join(','); return m;
}
const GRAIN_FRAG = `
vec3 sgp = vOP * 5.2 + vSeed;
float s1 = sdn3(sgp), s2 = sdn3(sgp * 2.7 + 3.1), s3 = sdn3(sgp * 6.3 + 7.7), sdHt = s1 * .3 + s2 * .4 + s3 * .3;
diffuseColor.rgb *= .62 + .85 * sdHt;
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.9, 1.85, 1.75) + .03, smoothstep(.66, .74, s2) * .7);
diffuseColor.rgb *= 1. - smoothstep(.64, .72, s3) * .5;
`;
export function grainMat(o = {}) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: o.rough ?? .72, metalness: 0, envMapIntensity: o.env ?? .55 });
  m.onBeforeCompile = sh => {
    sh.uniforms.uBump = { value: o.bump ?? .16 };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP; varying vec3 vSeed; varying float vSc;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP = position; vSeed = vec3(0.); vSc = 1.;\n#ifdef USE_INSTANCING\nvSeed = fract(instanceMatrix[3].xyz * .37) * 20.; vSc = length(instanceMatrix[0].xyz);\n#endif');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP; varying vec3 vSeed; varying float vSc; uniform float uBump;\n' + GLSL_HASH)
      .replace('#include <map_fragment>', '#include <map_fragment>\n' + GRAIN_FRAG)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{ vec2 dh = vec2(dFdx(sdHt), dFdy(sdHt)); vec3 sigX = dFdx(-vViewPosition), sigY = dFdy(-vViewPosition), r1 = cross(sigY, normal), r2 = cross(normal, sigX); float det = dot(sigX, r1) * faceDirection;
  vec3 grad = sign(det) * (dh.x * r1 + dh.y * r2); normal = normalize(abs(det) * normal - uBump * vSc * grad); }
vec3 nwG = normalize((vec4(normal, 0.) * viewMatrix).xyz); diffuseColor.rgb *= .6 + .4 * smoothstep(-.6, .6, nwG.y);`);
  };
  m.customProgramCacheKey = () => 'msand-grain-v1-' + (o.bump ?? .16); return m;
}

/* ───────── a poured heap: surface + grains. returns {group, hAt, items} ───────── */
export function buildHeap(o) {
  const { R, nC, nM, nF, nH, seed, y0 = 0, maxD = 4.75, gs = 1, tint = null, TH = Math.tan(36 * Math.PI / 180) } = o, r = rng(seed), group = new THREE.Group(); group.position.y = y0;
  const Rth = th => R * (1 + .07 * Math.sin(3 * th + 1.1) + .045 * Math.sin(5 * th + .4) + .03 * Math.sin(8 * th + 2.2)), Hm = R * .68, lump = (x, z) => .35 * Math.sin(x * .55 + 1.3) * Math.sin(z * .47 + .2) + .2 * Math.sin(x * 1.3 + z * .9);
  const hAt = (x, z) => { const th = Math.atan2(z, x), rr = Math.hypot(x, z), Rr = Rth(th); if (rr >= Rr) return 0; let h = Hm * Math.tanh((Rr - rr) * TH / Hm); h += lump(x, z) * Math.min(1, (Rr - rr) / 4); return Math.max(0, h); };
  /* surface: a polar grid, ragged at its foot (the shader eats the rim) */
  const NR = 90, NS = 160, pos = new Float32Array((NR + 1) * (NS + 1) * 3), rad = new Float32Array((NR + 1) * (NS + 1)), idx = [];
  for (let i = 0; i <= NR; i++) for (let j = 0; j <= NS; j++) { const th = j / NS * TAU, rr = (i / NR) * Rth(th) * 1.02, k = i * (NS + 1) + j; pos[k * 3] = Math.cos(th) * rr; pos[k * 3 + 1] = hAt(Math.cos(th) * rr, Math.sin(th) * rr) + .02; pos[k * 3 + 2] = Math.sin(th) * rr; rad[k] = i / NR; }
  for (let i = 0; i < NR; i++) for (let j = 0; j < NS; j++) { const a = i * (NS + 1) + j, b = a + 1, c = a + NS + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('aRad', new THREE.BufferAttribute(rad, 1)); sg.setIndex(idx); sg.computeVertexNormals();
  const surf = new THREE.Mesh(sg, o.csf ? heapMat(o.csf, o.csm, o.dust, o.tint || [1, 1, 1], o.uni) : heapMat()); surf.receiveShadow = true; surf.castShadow = true; group.add(surf);
  /* grains: coarse (cast shadows), fine (low-poly), and a few that rolled off the foot. sizes follow a typical crushed-fine-aggregate spread, never above 4.75 mm */
  const sizeAt = (rr, lo, hi) => { const cl = [[lo, Math.min(hi, 1.18), .66, -1], [Math.max(lo, 1.18), Math.min(hi, 2.36), .8, 0], [Math.max(lo, 2.36), hi, .2, 1]].filter(c => c[0] < c[1] - 1e-6), w = cl.map(c => c[2] * (1 + c[3] * .6 * rr)), tot = w.reduce((a, b) => a + b, 0); let u = r() * tot, k = 0; while (k < cl.length - 1 && u > w[k]) { u -= w[k]; k++; } const a = cl[k]; return Math.exp(Math.log(a[0]) + r() * (Math.log(a[1]) - Math.log(a[0]))); };
  const mk = (n, lo, hi, kind, ring) => { const items = []; for (let i = 0; i < n; i++) { const th = r() * TAU, f = Math.sqrt(r()), Rr = Rth(th); const rr = ring ? Rr * (.82 + r() * .6) : f * Rr * .97; const x = Math.cos(th) * rr, z = Math.sin(th) * rr, d = sizeAt(rr / R, lo, hi), s = d / 2.3 * gs; const y = ring ? s * .28 : hAt(x, z) + s * .22; items.push({ x, y, z, s, kind, c: (c => tint ? [c[0] * tint[0], c[1] * tint[1], c[2] * tint[2]] : c)(mineral(r)), flat: .86 + r() * .2, jx: .92 + r() * .16, jz: .92 + r() * .16, q: new Q().setFromEuler(new THREE.Euler(r() * 6, r() * 6, r() * 6)) }); } return items; };
  return { group, hAt, R, mat: surf.material, items: { coarse: mk(nC, 1.18, maxD, 'ang'), mid: mk(nM, .55, 1.18, 'small'), fine: mk(nF, .26, .55, 'tiny'), halo: mk(nH, .3, Math.min(maxD, 1.8), 'small', true) } };
}
/* instanced grains: one InstancedMesh per shape variant */
export function plant(parent, items, geos, mat, seed, cast, rotate = true) {
  const r = rng(seed), per = geos.map(() => []); items.forEach(it => { it.gi = (r() * geos.length) | 0; per[it.gi].push(it); }); const o = new THREE.Object3D(), out = [], col = new THREE.Color();
  per.forEach((arr, gi) => { if (!arr.length) return; const im = new THREE.InstancedMesh(geos[gi], mat, arr.length); arr.forEach((it, i) => { o.position.set(it.x, it.y, it.z); if (it.q) o.quaternion.copy(it.q); else o.rotation.set(r() * 6, r() * 6, r() * 6); const s = it.s; o.scale.set(s * (it.jx || .92 + r() * .16), s * (it.flat || 1), s * (it.jz || .92 + r() * .16)); o.updateMatrix(); im.setMatrixAt(i, o.matrix); col.setRGB(it.c[0], it.c[1], it.c[2]); im.setColorAt(i, col); }); im.castShadow = cast; im.receiveShadow = true; im.frustumCulled = false; parent.add(im); out.push(im); });
  return out;
}
/* grains lying on a flat face */
export function lieOn(geos, r, x, z, s, baseY, kindFlat) {
  const gi = (r() * geos.length) | 0, rq = restQuat(geos[gi], r), yaw = new Q().setFromAxisAngle(new V3(0, 1, 0), r() * TAU), q = yaw.multiply(rq.q), sc = kindFlat || 1;
  return { x, y: baseY - rq.minY * s, z, s, q, gi, c: mineral(r), flat: 1 };
}

export default function build({ state } = {}) {
  const SO = sandOf(state), river = SO.round, TT = SO.TT, T = c => TT ? [c[0] * TT[0], c[1] * TT[1], c[2] * TT[2]] : c;   /* river sand: worn, rounded grains in warm quartz and feldspar tones; concrete sand: crushed grains in a warmer grey */
  const scene = new THREE.Scene(), { key } = studio(scene, { ext: 52, key: 2.5, shadow: .2, map: 3072, ground: false });
  key.shadow.bias = -.00008; key.shadow.normalBias = .02; key.shadow.camera.near = 34; key.shadow.camera.far = 175; key.shadow.camera.updateProjectionMatrix();
  const gM = new THREE.Group(), gS = new THREE.Group(), gV = new THREE.Group(); scene.add(gM, gS, gV);
  const gAng = [0, 1, 2, 3, 4, 5].map(i => crushed(100 + i * 17, 'ang')), gSmall = [0, 1, 2, 3].map(i => crushed(200 + i * 13, 'small')), gTiny = [0, 1, 2].map(i => crushed(500 + i * 11, 'tiny')), gFlaky = [0, 1, 2, 3, 4].map(i => crushed(300 + i * 19, 'flaky')), gCubic = [0, 1, 2, 3, 4].map(i => crushed(400 + i * 23, 'cubic'));
  const gC = river ? [0, 1, 2].map(i => crushed(900 + i * 17, 'sub')).concat([0, 1, 2].map(i => crushed(700 + i * 19, 'round'))) : gAng, gMd = river ? [0, 1, 2, 3].map(i => crushed(800 + i * 7, 'round')) : gSmall, HO = TT ? { tint: TT, csf: SO.csf, csm: SO.csm, dust: SO.dust } : {};
  const lie = (...a) => { const o = lieOn(...a); o.c = T(o.c); return o; };
  const mat = grainMat(river ? { bump: .05, rough: .6 } : {}), hotM = grainMat(); hotM.color.set(0xff6a30); hotM.roughness = .5; hotM.emissive.set(0xff5e29); hotM.emissiveIntensity = .16;

  /* bench: a pale, finely speckled laminate */
  const bcv = document.createElement('canvas'); bcv.width = bcv.height = 512; { const g = bcv.getContext('2d'), rr = rng(5); g.fillStyle = '#d4d1ca'; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 14000; i++) { const v = 188 + rr() * 50 | 0; g.fillStyle = 'rgba(' + v + ',' + v + ',' + (v - 5) + ',.55)'; g.fillRect(rr() * 512, rr() * 512, 1.2 + rr() * 1.4, 1.2 + rr() * 1.4); } }
  const bt = new THREE.CanvasTexture(bcv); bt.wrapS = bt.wrapT = THREE.RepeatWrapping; bt.repeat.set(10, 7); bt.colorSpace = THREE.SRGBColorSpace; bt.anisotropy = 8;
  const bench = new THREE.Mesh(new THREE.BoxGeometry(260, 3, 180), new THREE.MeshStandardMaterial({ map: bt, roughness: .62, metalness: 0, envMapIntensity: .7 })); bench.position.set(4, -1.5, 30); bench.receiveShadow = true; scene.add(bench);

  /* ───────── 1. macro: a heap, a steel rule, the 4.75 mm gauge ───────── */
  const heap = buildHeap({ R: 15.5, nC: 760, nM: 2600, nF: 15000, nH: 1100, seed: 11, ...HO }); gM.add(heap.group);
  plant(heap.group, heap.items.coarse, gC, mat, 21, true); plant(heap.group, heap.items.mid, gMd, mat, 24, true); plant(heap.group, heap.items.fine, gTiny, mat, 22, false); plant(heap.group, heap.items.halo, gMd, mat, 23, true);
  /* a few picked out in orange (the highlight button): larger grains on the camera side, spread apart */
  const front = heap.items.coarse.filter(it => it.s > .6 && it.z > -2 && Math.hypot(it.x, it.z) > 3 && Math.hypot(it.x, it.z) < heap.R * .9).sort((a, b) => b.s - a.s), hot = [];
  for (const it of front) { if (hot.length >= 16) break; if (hot.every(h => Math.hypot(h.x - it.x, h.z - it.z) > 3.4)) hot.push(it); }
  const hotItems = hot.slice(), hotG = new THREE.Group(); heap.group.add(hotG); hotG.visible = false;
  { const o = new THREE.Object3D(); hotItems.forEach(it => { const im = new THREE.InstancedMesh(gC[it.gi], hotM, 1); o.position.set(it.x, it.y, it.z); o.quaternion.copy(it.q); o.scale.set(it.s * it.jx * 1.06, it.s * it.flat * 1.06, it.s * it.jz * 1.06); o.updateMatrix(); im.setMatrixAt(0, o.matrix); im.frustumCulled = false; hotG.add(im); }); }
  /* steel rule in millimetres */
  { const W = 104, H = 15, PPM = 19, cv = document.createElement('canvas'); cv.width = Math.round(W * PPM); cv.height = Math.round(H * PPM); const g = cv.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, cv.height); gr.addColorStop(0, '#d3d5d8'); gr.addColorStop(.5, '#b9bcc0'); gr.addColorStop(1, '#a9acb0'); g.fillStyle = gr; g.fillRect(0, 0, cv.width, cv.height);
    const rr = rng(7); for (let i = 0; i < 260; i++) { g.fillStyle = 'rgba(' + (rr() < .5 ? '255,255,255' : '60,62,66') + ',' + (.04 + rr() * .07) + ')'; g.fillRect(0, rr() * cv.height, cv.width, .6 + rr() * 1.4); }
    g.fillStyle = '#181a1d'; g.font = '600 ' + Math.round(PPM * 2.6) + 'px Arial, sans-serif'; g.textAlign = 'center';
    for (let m = 0; m <= W; m++) { const x = m * PPM, big = m % 10 === 0, mid = m % 5 === 0, len = big ? H * .42 : mid ? H * .3 : H * .2; g.fillRect(x - (big ? 1.3 : .8), 0, big ? 2.6 : 1.6, len * PPM); if (big && m > 0 && m < W) g.fillText(String(m / 10), x, len * PPM + PPM * 3.4); }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const steel = new THREE.MeshStandardMaterial({ color: 0x9ea1a6, metalness: .75, roughness: .38 }), top = new THREE.MeshStandardMaterial({ map: t, metalness: .35, roughness: .42, envMapIntensity: .9 });
    const rule = new THREE.Mesh(new THREE.BoxGeometry(W, 1, H), [steel, steel, top, steel, steel, steel]); rule.position.set(-1, .5, 29); rule.receiveShadow = true; rule.castShadow = true; gM.add(rule); }
  /* the 4.75 mm gauge: an orange wire ring, inner diameter 4.75 mm, with three grains that fit through it */
  const ringC = new V3(25, 0, 7.5), ring = new THREE.Mesh(new THREE.TorusGeometry(2.375 + .14, .14, 10, 56), new THREE.MeshStandardMaterial({ color: 0xff5e29, roughness: .38, metalness: .1, emissive: 0xff5e29, emissiveIntensity: .25 })); ring.rotation.x = Math.PI / 2; ring.position.set(ringC.x, .14, ringC.z); ring.castShadow = true; gM.add(ring);
  { const r = rng(41), it = [lie(gC, r, ringC.x, ringC.z, 1.1, 0), lie(gC, r, ringC.x - 5.2, ringC.z + 3.6, 1.55, 0), lie(gC, r, ringC.x + 4.6, ringC.z - 3.4, .62, 0)]; plant(gM, it, gC, mat, 42, true); }

  /* ───────── 2. particle shape: flaky grains on the left, cubical on the right (enlarged) ───────── */
  { const r = rng(51), put = (list, geos, x0, ds, n) => { const placed = []; let tries = 0; while (placed.length < n && tries++ < 800) { const s = ds[0] + r() * (ds[1] - ds[0]), x = x0 + (r() - .5) * 13, z = (r() - .5) * 15; if (placed.every(p => Math.hypot(p.x - x, p.z - z) > (p.s + s) * 1.05)) placed.push(lie(geos, r, x, z, s, 0)); } list.push(...placed); };
    const A = [], B = []; put(A, gFlaky, -10.5, [2, 2.8], 9); put(B, gCubic, 10.5, [1.9, 2.6], 11);
    plant(gS, A, gFlaky, mat, 52, true); plant(gS, B, gCubic, mat, 53, true); }

  /* ───────── 3. the 4.75 mm sieve ───────── */
  const N = 11, P = 6.35, WD = 1.6, A = WD / 2, LEN = N * P, steel = new THREE.MeshStandardMaterial({ color: 0x9a9da3, metalness: .9, roughness: .44, envMapIntensity: .85 });
  const wire = (dir, i) => { const c = new THREE.Curve(); c.getPoint = (t, tg = new V3()) => { const s = (t - .5) * LEN, y = (dir ? 1 : -1) * A * Math.cos(Math.PI * (s / P + i + 5 + (dir ? 0 : 0))); return dir ? tg.set(s, y, (i - 5) * P) : tg.set((i - 5) * P, y, s); }; const g = new THREE.TubeGeometry(c, 100, A, 12, false); const m = new THREE.Mesh(g, steel); m.castShadow = m.receiveShadow = true; return m; };
  for (let i = 0; i < N; i++) { gV.add(wire(1, i)); gV.add(wire(0, i)); }
  const brass = new THREE.MeshStandardMaterial({ color: 0xc8a96c, metalness: .8, roughness: .3, envMapIntensity: 1.1 }), half = LEN / 2 + 1;
  [[0, half + 2.6, LEN + 11, 5.2], [0, -half - 2.6, LEN + 11, 5.2]].forEach(([x, z, w, d]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 4.5, d), brass); m.position.set(x, .6, z); m.castShadow = m.receiveShadow = true; gV.add(m); });
  [[half + 2.6], [-half - 2.6]].forEach(([x]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(5.2, 4.5, LEN + 2), brass); m.position.set(x, .6, 0); m.castShadow = m.receiveShadow = true; gV.add(m); });
  const panM = new THREE.MeshStandardMaterial({ color: 0xe9e7e2, roughness: .3, metalness: .05, envMapIntensity: .9 }), pan = new THREE.Mesh(new THREE.CylinderGeometry(58, 58, 3, 96), panM); pan.position.y = -43.5; pan.receiveShadow = true; gV.add(pan); const rim = new THREE.Mesh(new THREE.TorusGeometry(58, 1.3, 12, 96), panM); rim.rotation.x = Math.PI / 2; rim.position.y = -42; gV.add(rim);
  const heap2 = buildHeap({ R: 26, nC: 420, nM: 1300, nF: 3200, nH: 500, seed: 61, y0: -42, maxD: 2.36, ...HO }); gV.add(heap2.group); plant(heap2.group, heap2.items.coarse, gC, mat, 71, true); plant(heap2.group, heap2.items.mid, gMd, mat, 74, false); plant(heap2.group, heap2.items.fine, gTiny, mat, 72, false); plant(heap2.group, heap2.items.halo, gMd, mat, 73, false);
  /* a few grains a little coarser than the opening, resting on the knuckles of the weave; fines caught on the wires */
  { const r = rng(81), items = [], used = []; for (let k = 0; k < 9; k++) { let ix, iz, tries = 0; do { ix = (r() * (N - 1)) | 0; iz = (r() * (N - 1)) | 0; } while ((used.some(u => Math.abs(u[0] - ix) < 2 && Math.abs(u[1] - iz) < 2) || (Math.abs(ix - 4) < 2 && Math.abs(iz - 7) < 2)) && tries++ < 60); used.push([ix, iz]); const s = 2.35 + r() * .5; items.push(lie(gC, r, (ix - 5 + .5) * P + (r() - .5) * .8, (iz - 5 + .5) * P + (r() - .5) * .8, s, 2 * A)); }
    plant(gV, items, gC, mat, 82, true);
    const fines = []; for (let k = 0; k < 190; k++) { const wi = (r() * N) | 0, s = .3 + r() * .55, along = (r() - .5) * (LEN - 8), over = Math.cos(Math.PI * (along / P + wi + 5)) * A + A; if (r() < .5) fines.push({ x: along, y: over + s * .35, z: (wi - 5) * P + (r() - .5) * .9, s, c: T(mineral(r)), flat: 1 }); else fines.push({ x: (wi - 5) * P + (r() - .5) * .9, y: A - Math.cos(Math.PI * (along / P + wi + 5)) * A + s * .35, z: along, s, c: T(mineral(r)), flat: 1 }); }
    plant(gV, fines, gMd, mat, 83, false); }
  /* the fine grains that pass */
  const NF = 260, fall = [], rf = rng(91), fm = new THREE.InstancedMesh(gMd[0], mat, NF), fc = new THREE.Color(); fm.frustumCulled = false; fm.castShadow = true; gV.add(fm);
  for (let i = 0; i < NF; i++) { const ix = (rf() * (N - 1)) | 0, iz = (rf() * (N - 1)) | 0, s = .4 + rf() * .9, lim = Math.max(0, 2.375 - s * 1.2); fall.push({ x: (ix - 5 + .5) * P + (rf() * 2 - 1) * lim, z: (iz - 5 + .5) * P + (rf() * 2 - 1) * lim, ph: rf(), s, sp: .2 + rf() * .1, rot: rf() * 6 }); const cc = mineral(rf); fc.setRGB(cc[0], cc[1], cc[2]); fm.setColorAt(i, fc); }
  /* the 4.75 mm opening, outlined in orange: a square frame lying exactly in one opening */
  const og = new THREE.Group(), om = new THREE.MeshStandardMaterial({ color: 0xff5e29, roughness: .4, emissive: 0xff5e29, emissiveIntensity: .45 }), OX = -.5 * P, OZ = 2.5 * P, ow = 4.75;
  [[0, -ow / 2, ow + .5, .3], [0, ow / 2, ow + .5, .3]].forEach(([x, z, w, d]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, .25, d), om); m.position.set(OX + x, 1.9, OZ + z); og.add(m); });
  [[-ow / 2], [ow / 2]].forEach(([x]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(.3, .25, ow), om); m.position.set(OX + x, 1.9, OZ); og.add(m); }); gV.add(og);
  const o = new THREE.Object3D(), bottom = -42 + 6;

  /* ───────── views, markers ───────── */
  const hasHot = hotItems.length ? hotItems[0] : { x: 0, y: 4, z: 3 };
  const bigC = heap.items.coarse.filter(it => it.z > 1 && it.x > 1 && it.x < 9 && Math.hypot(it.x, it.z) > 4 && Math.hypot(it.x, it.z) < 12).sort((a, b) => b.s - a.s)[0] || { x: 0, y: 5, z: 4, s: 1 };
  const views = { macro: { az: -10, el: 33, dist: 66, t: [4, 2, 10.5] }, shape: { az: -8, el: 46, dist: 58, t: [0, 1, 0] }, sieve: { az: -24, el: 31, dist: 126, t: [0, -19, 2] } };
  if (innerWidth < 720) { views.macro.dist *= 1.3; views.shape.dist *= 1.15; }   /* a narrow frame needs the camera further back */
  const L_ = (id, text, side, anchor, vs, tone, extra) => ({ id, text, side, anchor, tone, show: st => vs.includes(st.view) && (!extra || extra(st)) });
  const labels = [
    L_('grains', river ? 'Rounded and sub-rounded grains, worn smooth by the river' : 'Angular, crushed-rock grains with flat, fractured faces', 'r', new V3(bigC.x, bigC.y + bigC.s * .9, bigC.z), ['macro']),
    L_('fines', river ? 'Finer grains and natural fines fill the gaps between the larger grains' : 'Fine grains and rock dust fill the gaps between the larger grains', 'l', new V3(-9.5, heap.hAt(-9.5, 5) + .9, 5), ['macro']),
    L_('ring', '4.75 mm: the IS sieve opening, shown to scale.', 'r', new V3(ringC.x, .9, ringC.z), ['macro'], 'hot'),
    L_('rule', 'A steel rule in millimetres gives the scale', 'r', new V3(21, 1.2, 29), ['macro']),
    L_('hot', 'A few separate crushed particles picked out in orange', 'r', new V3(hasHot.x, hasHot.y + hasHot.s, hasHot.z), ['macro'], 'hot', st => !!st.hl),
    L_('flat', 'Flaky grains: thin in one direction, lying flat', 'r', new V3(-10.5, 1.6, 0), ['shape']),
    L_('cube', 'Cubical grains: much the same size in all three directions', 'l', new V3(10.5, 3, 0), ['shape']),
    L_('stay', 'A few grains slightly larger than 4.75 mm stay on the mesh', 'r', new V3(2, 5.5, -10), ['sieve']),
    L_('open', 'One 4.75 mm square opening, outlined in orange', 'r', new V3(OX, 2.2, OZ), ['sieve'], 'hot'),
    L_('pass', 'Fine grains fall through the openings', 'r', new V3(16, -14, 12), ['sieve'], 'hot'),
    L_('pan', 'The sand that has passed collects in the pan', 'l', new V3(-12, -35, 6), ['sieve']),
  ];
  const upd = (t, dt, st) => {
    const v = st.view || 'macro'; gM.visible = v === 'macro'; gS.visible = v === 'shape'; gV.visible = v === 'sieve'; bench.visible = v !== 'sieve'; hotG.visible = !!st.hl && gM.visible;
    if (!gV.visible) return false;
    fall.forEach((f, i) => { const k = reduce() ? f.ph : (t * f.sp + f.ph) % 1, e = k * k * .55 + k * .45, y = 12 - e * (12 - bottom + 4); o.position.set(f.x, y, f.z); const sc = y < bottom + 3 ? Math.max(.001, (y - bottom) / 3) * f.s : f.s; o.scale.set(sc, sc, sc); o.rotation.set(f.rot + k * 5, f.rot, k * 3); o.updateMatrix(); fm.setMatrixAt(i, o.matrix); }); fm.instanceMatrix.needsUpdate = true;
    return !reduce();
  };
  return { scene, views, fov: 30, labels, limits: { az: [-70, 70], el: [8, 66], dist: [10, 220] }, update: upd };
}
