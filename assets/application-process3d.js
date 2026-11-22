/* OM GROUP — general workflow: raw stone to the 40 mm fraction, as a real 3D side-view (three.js, procedural models).
   One deterministic timeline: any moment can be shown, seeked or captured. After the 19 s introduction the plant keeps running
   in a steady state (belts, vibration and rocks are periodic functions of time, so nothing is simulated).
   Note: not a specific plant, no capacities or speeds are implied. */
import * as THREE from '/assets/vendor/three/three.module.min.js';
import { M, STONES, stone, rbox, mk, put, cyl, lathe, box, canvasTex, mulberry32, makeEnv, clamp, sm, eio, seg, lerp, TAU, helix, compileShadows, warmProgressive } from '/assets/application-lab3d.js';

const V3 = THREE.Vector3, V2 = THREE.Vector2, D2R = Math.PI / 180;
/* reference picture space (1774 x 887 px) -> world units. x = 0 at picture centre, y = 0 at the plant ground line (py 735) */
const X = px => (px - 887) / 100, Y = py => (735 - py) / 100;
const PT = (px, py, z = 0) => new V3(X(px), Y(py), z);
export const END = 19;
const START = 1.6;   /* the plant is complete from the first frame, so the run starts just before the first rock reaches the belt (3.4 s) instead of idling */
export const STAGE_AT = [3.0, 6.0, 8.5, 12.0, 16.0];             /* where each timeline stage is seeked to */
export function stageAt(t) { return t < 2 ? 0 : t < 4 ? 1 : t < 6 ? 2 : t < 9 ? 3 : t < 14 ? 4 : t < 17 ? 5 : 0; }

/* ───────── clipping: left-to-right build reveal, and the two cutaway planes ───────── */
const swp = new THREE.Plane(new V3(-1, 0, 0), -9.6);   /* visible x <= c */
const cutC = new THREE.Plane(new V3(0, 0, -1), 6);     /* crusher shell: visible z <= c */
const cutS = new THREE.Plane(new V3(0, 0, -1), 6);     /* screen wall:   visible z <= c */
const planeId = new WeakMap(); let planeN = 0; const clipMats = new Map();
function cm(m, ...planes) {
  const k = m.uuid + ':' + planes.map(p => { if (!planeId.has(p)) planeId.set(p, ++planeN); return planeId.get(p); }).join(',');
  if (!clipMats.has(k)) { const c = m.clone(); c.clippingPlanes = planes; c.clipShadows = true; clipMats.set(k, c); } return clipMats.get(k);
}
function clipTree(o, plane) { o.traverse(n => { if (n.isMesh || n.isInstancedMesh) { const f = m => (m.clippingPlanes && m.clippingPlanes.length) ? m : cm(m, plane); n.material = Array.isArray(n.material) ? n.material.map(f) : f(n.material); } }); return o; }

/* ───────── materials ───────── */
const phys = o => new THREE.MeshPhysicalMaterial(o);
const MT = {
  frame: phys({ color: 0x4a4d53, metalness: .68, roughness: .52, clearcoat: .12 }),
  frameL: phys({ color: 0x55585e, metalness: .7, roughness: .46 }),
  steel: phys({ color: 0xd6d9dc, metalness: .95, roughness: .34, clearcoat: .1 }),
  body: phys({ color: 0xdfe1e3, metalness: .88, roughness: .36, clearcoat: .25, clearcoatRoughness: .35 }),
  conc: new THREE.MeshStandardMaterial({ color: 0xc4c2bd, roughness: .92 }),
  rock: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85, metalness: 0 }),
  grate: new THREE.MeshStandardMaterial({ color: 0x2a2c30, metalness: .6, roughness: .5 }),
};
function beltTex(period) {
  const t = canvasTex(256, 128, (x, w, h) => { x.fillStyle = '#26272a'; x.fillRect(0, 0, w, h); x.fillStyle = '#3b3c40'; x.fillRect(0, 0, 14, h); x.fillStyle = '#17181a'; x.fillRect(14, 0, 4, h); for (let i = 0; i < 1400; i++) { x.fillStyle = 'rgba(255,255,255,' + (Math.random() * .05) + ')'; x.fillRect(Math.random() * w, Math.random() * h, 2, 1); } }, true);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
const LOGO_AR = 787 / 534; // assets/om-group-machine-logo.png (the owner's supplied logo: mark + OM GROUP wordmark, trimmed)
/* The supplied PNG is used as it is: it used to be re-drawn into a 1024 px canvas (an up-scale of 787 px, so already soft), lit like metal (the tone mapping dulled the
   orange) and stuck on as a flat plane that floated off the curved shell. Now: the original file as the texture, premultiplied so no dark fringe appears when it is
   minified, full mipmaps + maximum anisotropy, and an unlit material that is not tone mapped, so the logo shows its own orange. */
let LOGO_TEX = null;
function bleedLogo(img) {   // the file's transparent pixels are black: spread the logo's own orange into them (shape and colour untouched) so no dark fringe appears when it is minified
  const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight; const x = cv.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, cv.width, cv.height), a = d.data; let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < a.length; i += 4) if (a[i + 3] === 255) { r += a[i]; g += a[i + 1]; b += a[i + 2]; n++; }
  if (n) { r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n); for (let i = 0; i < a.length; i += 4) { a[i] = r; a[i + 1] = g; a[i + 2] = b; } x.putImageData(d, 0, 0); }
  return cv;
}
function logoDecal(R) {
  if (LOGO_TEX) return LOGO_TEX;
  const t = LOGO_TEX = new THREE.Texture(); t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
  t.anisotropy = R && R.capabilities ? R.capabilities.getMaxAnisotropy() : 16;
  const img = new Image(); img.decoding = 'async'; img.addEventListener('load', () => { t.image = bleedLogo(img); t.needsUpdate = true; }); img.src = '/assets/om-group-machine-logo.png';
  return t;
}
const logoMat = R => new THREE.MeshBasicMaterial({ map: logoDecal(R), transparent: true, toneMapped: false, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
/* lighter stones (80 faces instead of 320) for the product piles and the small fractions: they are a few pixels wide, but there are hundreds of them,
   and the piles fill up over the first ~25 s: that is what made the end of the sequence slow. Same faceted, granite-speckled look. */
const LOW = (() => {
  const out = [], r = mulberry32(77);
  for (let n = 0; n < 5; n++) {
    const g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position, s1 = r() * 9, s2 = r() * 9, s3 = r() * 9, v = new V3(), planes = [];
    for (let k = 0; k < 6; k++) planes.push([new V3(r() - .5, r() - .5, r() - .5).normalize(), .64 + r() * .2]);
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); v.multiplyScalar(1 + .2 * Math.sin(v.x * 3.1 + s1) * Math.cos(v.y * 2.6 + s2) + .1 * Math.sin(v.z * 4.3 + s3)); for (const [nn, off] of planes) { const o = v.dot(nn) - off; if (o > 0) v.addScaledVector(nn, -o); } p.setXYZ(i, v.x, v.y * .86, v.z * 1.08); }
    g.computeVertexNormals();
    const col = new Float32Array(p.count * 3); for (let f = 0; f < p.count; f += 3) { let b = .09 + r() * .08; if (r() < .12) b = .34 + r() * .3; for (let k = 0; k < 3; k++) { col[(f + k) * 3] = b * .98; col[(f + k) * 3 + 1] = b * .99; col[(f + k) * 3 + 2] = b * 1.03; } }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); out.push(g);
  }
  return out;
})();
const hash = n => { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };

/* ───────── structural helpers ───────── */
function beam(a, b, w, d, mat, z = 0) { const dv = b.clone().sub(a), L = dv.length(), m = mk(new THREE.BoxGeometry(L, w, d), mat); m.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, z); m.rotation.z = Math.atan2(dv.y, dv.x); return m; }
function tower(parent, x, yTop, w = .9, d = .9, z = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
  const c = .11, levels = Math.max(1, Math.round(yTop / 1.35)), ys = []; for (let i = 0; i <= levels; i++) ys.push(yTop * i / levels);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { put(g, mk(rbox(c, yTop, c, .02, .008), MT.frame), sx * w / 2, yTop / 2, sz * d / 2); put(g, mk(rbox(.42, .22, .42, .02, .01), MT.conc), sx * w / 2, .11, sz * d / 2); put(g, mk(new THREE.BoxGeometry(.24, .02, .24), MT.frameL), sx * w / 2, .23, sz * d / 2); });
  ys.forEach((y, i) => { if (i > 0 || true) { [-1, 1].forEach(sz => put(g, mk(new THREE.BoxGeometry(w, .08, .06), MT.frame), 0, y + .04, sz * d / 2)); [-1, 1].forEach(sx => put(g, mk(new THREE.BoxGeometry(.06, .08, d), MT.frame), sx * w / 2, y + .04, 0)); }
    if (i < levels) { const y0 = ys[i] + .04, y1 = ys[i + 1] + .04;[-1, 1].forEach(sz => { g.add(beam(new V3(-w / 2, y0, 0), new V3(w / 2, y1, 0), .06, .05, MT.frame, sz * d / 2)); g.add(beam(new V3(w / 2, y0, 0), new V3(-w / 2, y1, 0), .06, .05, MT.frame, sz * d / 2)); }); } });
  return g;
}
function railing(parent, len, h, step, z, mat = M.orange) {
  const n = Math.floor(len / step) + 1, im = new THREE.InstancedMesh(new THREE.BoxGeometry(.045, h, .045), mat, n), o = new THREE.Object3D(); im.castShadow = true;
  for (let i = 0; i < n; i++) { o.position.set(i * step, h / 2, z); o.updateMatrix(); im.setMatrixAt(i, o.matrix); } parent.add(im);
  [h, h * .52].forEach(y => { const r = mk(new THREE.CylinderGeometry(.022, .022, len, 8), mat); r.rotation.z = Math.PI / 2; r.position.set(len / 2, y, z); parent.add(r); });
  const k = mk(new THREE.BoxGeometry(len, .06, .012), mat); k.position.set(len / 2, .03, z); parent.add(k);
}

/* ───────── conveyor ───────── */
function conveyor(A, B, w, beltM, railSide = 1) {
  const g = new THREE.Group(), d = B.clone().sub(A), L = d.length(), ang = Math.atan2(d.y, d.x); g.position.copy(A); g.rotation.z = ang;
  const top = new THREE.Mesh(new THREE.PlaneGeometry(L, w), beltM); top.rotation.x = -Math.PI / 2; top.position.set(L / 2, .004, 0); top.receiveShadow = true; g.add(top);
  put(g, mk(new THREE.BoxGeometry(L, .06, w), M.rubber), L / 2, -.04, 0);
  [-1, 1].forEach(s => { put(g, mk(rbox(L + .5, .26, .07, .02, .01), MT.frame), L / 2, -.2, s * (w / 2 + .06)); put(g, mk(new THREE.BoxGeometry(L, .05, .03), MT.frameL), L / 2, .02, s * (w / 2 + .01)); });
  const n = Math.floor(L / .5); const idl = new THREE.InstancedMesh(new THREE.CylinderGeometry(.045, .045, w + .02, 14), M.chrome, n), o = new THREE.Object3D();
  for (let i = 0; i < n; i++) { o.position.set(.3 + i * .5, -.1, 0); o.rotation.set(Math.PI / 2, 0, 0); o.updateMatrix(); idl.setMatrixAt(i, o.matrix); } g.add(idl);
  for (let i = 0; i < Math.floor(L / 1.6); i++) put(g, mk(new THREE.CylinderGeometry(.05, .05, w + .06, 14), M.chrome), .6 + i * 1.6, -.42, 0, Math.PI / 2);
  [0, L].forEach(x => { put(g, mk(new THREE.CylinderGeometry(.2, .2, w + .02, 28), M.rubber), x, -.14, 0, Math.PI / 2); put(g, mk(new THREE.CylinderGeometry(.06, .06, w + .4, 12), M.chrome), x, -.14, 0, Math.PI / 2); });
  const rg = new THREE.Group(); rg.position.set(0, .05, railSide * (w / 2 + .3)); g.add(rg); railing(rg, L, .55, .6, 0);
  put(g, mk(new THREE.BoxGeometry(L, .035, .5), MT.grate), L / 2, -.16, railSide * (w / 2 + .34));
  put(g, mk(rbox(.5, .42, w + .5, .04, .01), MT.frame), L + .05, -.22, 0);
  return { g, L, ang, dir: d.clone().normalize(), n: new V3(-Math.sin(ang), Math.cos(ang), 0), A };
}
const onBelt = (cv, s, h, z) => cv.A.clone().addScaledVector(cv.dir, s).addScaledVector(cv.n, h).setZ(z);

/* ───────── the world ───────── */
export function buildWorld(R, o = {}) {
  /* rock sizes follow the fraction this page is about (relative to 40 mm); piles keep a similar volume */
  const SZ = [[6, .075], [10, .09], [12.5, .1], [20, .115], [40, .14], [60, .165]], size = o.size || 40;
  const Mr = (() => { for (let i = 0; i < SZ.length - 1; i++) if (size <= SZ[i + 1][0]) { const [a, ra] = SZ[i], [b, rb] = SZ[i + 1]; return lerp(ra, rb, clamp((size - a) / (b - a))); } return SZ[SZ.length - 1][1]; })();
  const Lr = Mr * 1.58, Fr = Mr * .53, nScale = (r0, r, base, cap) => Math.min(cap, Math.round(base * Math.pow(r0 / r, 2)));
  const scene = new THREE.Scene(); scene.environment = makeEnv(R);
  const key = new THREE.DirectionalLight(0xfff1e0, 2.2); key.position.set(-6, 12, 14); key.target.position.set(0, 2.5, 0); scene.add(key, key.target); key.castShadow = true; key.shadow.mapSize.set(1536, 1536);
  Object.assign(key.shadow.camera, { left: -11, right: 11, top: 8, bottom: -3, near: 1, far: 45 }); key.shadow.bias = -.0005; key.shadow.normalBias = .03;
  const rim = new THREE.DirectionalLight(0xffa070, .3); rim.position.set(8, 5, -6); scene.add(rim); scene.add(new THREE.HemisphereLight(0xfff6ea, 0xd8d2c6, .4));
  const W = { scene, planes: { swp, cutC, cutS } };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(13.8, 10), new THREE.ShadowMaterial({ opacity: .2 })); ground.rotation.x = -Math.PI / 2; ground.position.set(-2.3, 0, 1.5); ground.receiveShadow = true; scene.add(ground); clipTree(ground, swp);
  const plant = new THREE.Group(); scene.add(plant);

  /* —— stockpile of raw rock (instanced, three shapes, natural heap silhouette) —— */
  const rs = mulberry32(5), heapG = new THREE.Group(); plant.add(heapG); const HC = new V3(-7.1, 0, -.35);
  for (let v = 0; v < 3; v++) {
    const n = 90, im = new THREE.InstancedMesh(STONES[(v * 2) % STONES.length], MT.rock, n), o = new THREE.Object3D(); im.castShadow = im.receiveShadow = true;
    for (let i = 0; i < n; i++) {
      let u = (rs() * 2 - 1), vv = (rs() * 2 - 1); while (u * u + vv * vv > 1) { u = rs() * 2 - 1; vv = rs() * 2 - 1; }
      const rxl = 1.65, rxr = 2.25, rz = 1.15, x = HC.x + u * (u < 0 ? rxl : rxr), z = HC.z + vv * rz, r = Math.hypot(u, vv), hh = 2.05 * Math.pow(Math.max(0, 1 - r * r), .8) * (1 + (u > 0 ? -.12 * u : 0));
      const s = .17 + rs() * .17 * (1 - r * .4); o.position.set(x, hh + s * .55, z); o.scale.set(s * (.9 + rs() * .4), s * (.75 + rs() * .3), s * (.9 + rs() * .4)); o.rotation.set(rs() * 6, rs() * 6, rs() * 6); o.updateMatrix(); im.setMatrixAt(i, o.matrix);
      im.setColorAt(i, new THREE.Color().setScalar(.32 + rs() * .5));
    } heapG.add(im);
  }

  /* —— feed conveyor (stockpile to crusher) —— */
  const beltFeed = new THREE.MeshStandardMaterial({ map: beltTex(), roughness: .85 }), beltTr = new THREE.MeshStandardMaterial({ map: beltTex(), roughness: .85 });
  const CF = conveyor(PT(112, 668, .0), PT(562, 266, 0), .62, beltFeed); plant.add(CF.g); CF.g.position.z = .05;
  [[262, 2.95], [345, 3.0], [430, 3.1]].forEach(([px], i) => { const x = X(px), s = (x - CF.A.x) / CF.dir.x, y = CF.A.y + CF.dir.y * s - .45; tower(plant, x, y, .95, 1.0, .05); });
  beltFeed.map.repeat.set(CF.L / .45, 1); beltTr.map.repeat.set(1, 1);

  /* —— VSI crusher (hero machine) —— */
  const xc = X(648), crusher = new THREE.Group(); plant.add(crusher);
  tower(plant, X(565), 2.4, .95, 1.1, 0); tower(plant, X(770), 2.4, .95, 1.1, 0);
  put(crusher, mk(rbox(3.2, .14, 1.5, .03, .01), MT.frame), xc + .0, 2.4, 0);
  const plat = new THREE.Group(); plat.position.set(xc - 1.6, 2.47, .72); crusher.add(plat); railing(plat, 3.2, .45, .5, 0);
  const bodyY0 = 2.47, bodyY1 = 3.79, rB = .785;
  const shellM = cm(MT.body, swp, cutC); shellM.side = THREE.DoubleSide;
  const shell = mk(new THREE.CylinderGeometry(rB, rB, bodyY1 - bodyY0, 72, 1, true), shellM); shell.position.set(xc, (bodyY0 + bodyY1) / 2, 0); crusher.add(shell);
  const banM = cm(M.orange, swp, cutC); [bodyY1 - .05, bodyY0 + .04].forEach((y, i) => put(crusher, mk(new THREE.CylinderGeometry(rB + .04, rB + .04, i ? .08 : .12, 72, 1, true), banM), xc, y, 0));
  const hatchM = cm(MT.frame, swp, cutC), boltM = cm(M.chrome, swp, cutC);
  put(crusher, mk(rbox(.46, .3, .03, .03, .008), hatchM), xc + .0, 2.82, rB + .02); for (let k = 0; k < 4; k++) put(crusher, mk(new THREE.CylinderGeometry(.018, .018, .02, 8), boltM), xc + (k % 2 ? .17 : -.17), 2.82 + (k < 2 ? .1 : -.1), rB + .045, Math.PI / 2);
  for (let k = 0; k < 18; k++) { const a = k / 18 * TAU; if (Math.cos(a) > -.1) put(crusher, mk(new THREE.CylinderGeometry(.02, .02, .02, 8), boltM), xc + Math.sin(a) * (rB + .045), bodyY1 - .05, Math.cos(a) * (rB + .045), Math.cos(a) > 0 ? Math.PI / 2 : 0, 0, 0); }
  const lgM = logoMat(R);
  /* logo sits in the clear band of the shell: top orange band ends at y 3.68, the inspection hatch starts at 2.97 -> ~0.15 of clear space above and below */
  { const aw = .72, ah = aw / LOGO_AR, th = aw / rB; put(crusher, mk(new THREE.CylinderGeometry(rB + .006, rB + .006, ah, 40, 1, true, -th / 2, th), cm(lgM, swp, cutC), { cast: false }), xc, 3.325, 0); }
  const hop = lathe([[rB, 3.79], [rB + .06, 3.95], [.98, 4.35], [1.05, 4.64], [1.1, 4.66], [1.1, 4.7], [1.02, 4.7], [.95, 4.62], [.7, 3.95], [.7, 3.8]], MT.body, 72); hop.position.x = xc; crusher.add(hop);
  put(crusher, mk(new THREE.CylinderGeometry(rB + .075, rB + .075, .07, 72), M.orange), xc, 3.83, 0);
  put(crusher, mk(rbox(2.5, .08, 1.5, .03, .01), MT.frameL), xc, 4.66, 0);
  const top = new THREE.Group(); top.position.set(xc - 1.25, 4.7, .72); crusher.add(top); railing(top, 2.5, .5, .5, 0);
  [-.7, .7].forEach(z => put(crusher, mk(new THREE.BoxGeometry(2.5, .5, .04), MT.frameL), xc, 4.52, z * 1.0));
  const cone = lathe([[rB, bodyY0], [rB, bodyY0 - .1], [.3, 1.5], [.24, 1.35], [.2, 1.35], [.22, 1.5], [.7, bodyY0 - .1]], MT.body, 72); cone.position.x = xc; crusher.add(cone);
  [[X(540)], [X(760)]].forEach(([mx], i) => { const mg = new THREE.Group(); mg.position.set(i ? xc + 1.2 : xc - 1.2, 2.47, 0); crusher.add(mg);
    put(mg, mk(rbox(.62, .78, .78, .08, .012), MT.frame), 0, .42, 0); for (let f = 0; f < 7; f++) put(mg, mk(new THREE.BoxGeometry(.64, .02, .8), MT.frameL), 0, .1 + f * .1, 0);
    put(mg, mk(rbox(.5, .14, .64, .04, .01), M.orange), 0, .86, 0); put(mg, mk(new THREE.CylinderGeometry(.06, .06, .5, 12), M.steelS), i ? -.4 : .4, .45, 0, 0, 0, Math.PI / 2); });
  [-.9, .9].forEach((s, i) => put(crusher, mk(new THREE.CylinderGeometry(.05, .05, .5, 10), M.steelS), xc + s * .78, 3.2, 0, 0, 0, Math.PI / 2));
  /* crushing chamber (seen when the cutaway opens): rotor spins, rock is thrown against the anvil ring */
  const inner = new THREE.Group(); inner.position.set(xc, 0, 0); crusher.add(inner);
  put(inner, mk(new THREE.CylinderGeometry(.74, .74, bodyY1 - bodyY0 - .04, 64, 1, true), new THREE.MeshStandardMaterial({ color: 0x2a2c30, metalness: .5, roughness: .6, side: THREE.BackSide })), 0, (bodyY0 + bodyY1) / 2, 0);
  for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; const b = mk(rbox(.2, .5, .1, .02, .008), new THREE.MeshStandardMaterial({ color: 0x6b6e74, metalness: .85, roughness: .4 })); b.position.set(Math.cos(a) * .66, 3.12, Math.sin(a) * .66); b.rotation.y = -a + Math.PI / 2; inner.add(b); }
  const rotor = new THREE.Group(); rotor.position.set(0, 3.12, 0); inner.add(rotor);
  rotor.add(mk(new THREE.CylinderGeometry(.34, .38, .42, 40), MT.frame)); rotor.add(mk(new THREE.CylinderGeometry(.3, .3, .04, 40), M.orange).translateY(.23));
  for (let k = 0; k < 4; k++) { const a = k / 4 * TAU; const t = mk(rbox(.16, .26, .1, .02, .008), M.orange); t.position.set(Math.cos(a) * .39, 0, Math.sin(a) * .39); t.rotation.y = -a; rotor.add(t); }
  put(inner, mk(new THREE.CylinderGeometry(.08, .08, 1.1, 16), M.chrome), 0, 3.6, 0); put(inner, mk(new THREE.CylinderGeometry(.22, .1, .3, 24, 1, true), MT.frame), 0, 3.5, 0);
  W.rotor = rotor;

  /* —— transfer conveyor (crusher discharge to screen) —— */
  const CT = conveyor(PT(622, 668, 0), PT(938, 410, 0), .56, beltTr); plant.add(CT.g); beltTr.map.repeat.set(CT.L / .45, 1);
  [[740, 0], [845, 0]].forEach(([px]) => { const x = X(px), s = (x - CT.A.x) / CT.dir.x, y = CT.A.y + CT.dir.y * s - .42; tower(plant, x, y, .8, .9, 0); });
  { const lx = X(776); [0, .42].forEach(dx => put(plant, mk(new THREE.BoxGeometry(.035, 2.3, .035), MT.frameL), lx + dx, 1.2 + (dx ? 0 : 0), .62)); for (let k = 0; k < 11; k++) put(plant, mk(new THREE.BoxGeometry(.42, .025, .025), MT.frameL), lx + .21, .35 + k * .2, .62); }

  /* —— vibrating screen (inclined, two decks, sprung) —— */
  const SA = -12.5 * D2R, SO = new V3(.66, 2.5, 0), SL = 3.45;
  const screenBase = new THREE.Group(); plant.add(screenBase);
  const screen = new THREE.Group(); screen.position.copy(SO); screen.rotation.z = SA; screenBase.add(screen);
  const frame = new THREE.Group(); screenBase.add(frame);
  /* the two sprung mounts: a spring stands straight up from the orange plate on its tower to the underside of the screen body. The body is tilted, so the two mounts are not the
     same height: each tower is cut to the height that leaves the same free spring length under its end of the body (the springs used to ride inside the tilted body, leaning
     and floating clear of the plates). */
  const SPR_L = .5, SPR_UY = -.47, SPR_X = [X(990), X(1250)], SPR_Z = [-.4, .4];
  const underAt = (wx, ox, oy, a) => { const c = Math.cos(a), s = Math.sin(a), lx = (wx - ox + SPR_UY * s) / c; return { lx, y: oy + lx * s + SPR_UY * c }; };
  const SPR_BASE = SPR_X.map(x => underAt(x, SO.x, SO.y, SA).y - SPR_L);        /* top of the orange plate at rest */
  SPR_X.forEach((x, i) => { const yT = SPR_BASE[i] - .13; tower(frame, x, yT, .95, 1.05, 0); put(frame, mk(rbox(1.1, .16, 1.2, .03, .01), M.orange), x, yT + .05, 0); });
  const bw = new THREE.Group(); screen.add(bw);
  const sideM = cm(MT.body, swp, cutS); sideM.side = THREE.DoubleSide;
  put(bw, mk(new THREE.BoxGeometry(SL, .06, 1.1), MT.frame), SL / 2, -.44, 0);
  put(bw, mk(rbox(SL, .82, .06, .02, .008), MT.body), SL / 2, 0, -.55);                              /* back wall */
  const front = mk(rbox(SL, .82, .06, .02, .008), sideM); front.position.set(SL / 2, 0, .55); bw.add(front);
  const sOr = cm(M.orange, swp, cutS); [-1, 1].forEach(s => put(bw, mk(new THREE.BoxGeometry(SL + .04, .07, .09), s > 0 ? sOr : M.orange), SL / 2, .45, s * .55));
  const sLg = logoMat(R);
  put(bw, mk(new THREE.PlaneGeometry(.6, .6 / LOGO_AR), cm(sLg, swp, cutS), { cast: false }), 2.04, .0, .585);   /* centred in the open panel (the rib at x 2.04 is left out), clear of the orange rails and ribs */
  const rib = cm(MT.frameL, swp, cutS); for (let k = 0; k < 6; k++) if (k !== 3) put(bw, mk(new THREE.BoxGeometry(.04, .8, .02), rib), .3 + k * .58, 0, .585);
  const rv = cm(M.chrome, swp, cutS); for (let k = 0; k < 24; k++) put(bw, mk(new THREE.SphereGeometry(.014, 6, 4), rv), .12 + k * .14, -.36, .59);
  [-.55, .55].forEach(z => put(bw, mk(new THREE.BoxGeometry(.4, .85, .06), MT.frame), -.12, 0, z * .98));
  put(bw, mk(rbox(.55, .45, 1.14, .03, .01), MT.frame), -.2, .36, 0);                               /* inlet box */
  [-1, 1].forEach(s => put(bw, mk(new THREE.BoxGeometry(.5, .5, .04), MT.frame), -.2, .65, s * .55));
  const deckM = new THREE.MeshStandardMaterial({ color: 0xcfd3d8, metalness: .95, roughness: .38, alphaMap: M.mesh.alphaMap, alphaTest: .35, side: THREE.DoubleSide });
  const deckA = mk(new THREE.PlaneGeometry(SL - .1, 1.04), cm(deckM, swp), { cast: false }); deckA.rotation.x = -Math.PI / 2; deckA.position.set(SL / 2, .14, 0); bw.add(deckA);
  const deckB = mk(new THREE.PlaneGeometry(SL - .1, 1.04), cm(deckM, swp), { cast: false }); deckB.rotation.x = -Math.PI / 2; deckB.position.set(SL / 2, -.2, 0); bw.add(deckB);
  [-.3, .1].forEach(y => put(bw, mk(new THREE.BoxGeometry(SL, .03, .05), MT.frameL), SL / 2, y + .03, .5));
  const driveG = new THREE.Group(); bw.add(driveG); put(driveG, mk(rbox(.6, .3, .5, .05, .01), MT.frame), SL * .5, .66, 0); put(driveG, mk(new THREE.CylinderGeometry(.11, .11, .56, 18), M.orange), SL * .5, .66, 0, Math.PI / 2);
  /* springs between the sprung body and the orange sub-frame */
  const springs = []; SPR_X.forEach((x, i) => SPR_Z.forEach(z => {
    const g = new THREE.Group(); g.position.set(x, SPR_BASE[i], z); screenBase.add(g);
    put(g, mk(new THREE.CylinderGeometry(.17, .17, .05, 24), M.dark), 0, .025, 0);                       /* seat on the plate */
    const hx = helix(.12, SPR_L, 6, .022, M.steelS); hx.position.y = 0; g.add(hx);
    const top = new THREE.Group(); g.add(top); put(top, mk(new THREE.CylinderGeometry(.17, .17, .05, 24), M.dark), 0, -.025, 0);   /* cap on the underside of the body */
    springs.push({ g, hx, top, x, i });
  }));
  W.springUpdate = (ox, oy, a) => springs.forEach(s => { const L = Math.max(.12, underAt(s.x, ox, oy, a).y - SPR_BASE[s.i]); s.hx.scale.y = L / SPR_L; s.top.position.y = L; });
  const hopper = lathe([[1.38, 0], [1.38, -.05], [.2, -.8], [.16, -1.05], [.2, -1.05], [.22, -.8], [1.4, -.04]], MT.body, 56); hopper.position.set(X(1132), Y(588), 0); hopper.scale.set(1, 1, .85); plant.add(hopper);
  put(plant, mk(rbox(.62, .12, .56, .03, .01), M.orange), X(1132), Y(588) + .04, 0);
  W.screenBase = screenBase; W.screen = screen; W.SA = SA; W.SO = SO; W.SL = SL; W.springs = springs;
  const lw = (lx, ly, z, o) => { const c = Math.cos(SA), s = Math.sin(SA); return new V3(SO.x + lx * c - ly * s + (o ? o.x : 0), SO.y + lx * s + ly * c + (o ? o.y : 0), z); };

  /* —— product piles in the three cards: proper heaps ——
     A heap of crushed stone is a cone at its angle of repose (about 40 degrees) with a pointed top and a little spill round its foot, and the stones lie ON that surface,
     packed so no gaps show. They are listed in the order the heap grows: stone i lies on the surface of the same cone scaled by (i / n)^(1/3), so showing the first k stones
     shows the heap after k arrivals: it grows up and outward from a small cone and never turns into a ring with a hole in the middle. */
  const piles = {}, pileDef = [   // key, centre x, base y, base radius, height, stone radius (cap)
    ['L', 7.40, 5.58, .88, .86, Math.min(Lr * .91, .1)],
    ['M', 7.9, 3.50, .56, .64, Math.min(Mr * .8, .075)],
    ['F', 7.46, 1.42, .86, .86, Math.min(Fr * .8, .05)]];
  const SHADOW_TEX = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 32; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 16, 2, 64, 16, 64); gr.addColorStop(0, 'rgba(20,20,22,.34)'); gr.addColorStop(.55, 'rgba(20,20,22,.14)'); gr.addColorStop(1, 'rgba(20,20,22,0)'); g.setTransform(1, 0, 0, .25, 0, 12); g.fillStyle = gr; g.fillRect(0, -40, 128, 160); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  pileDef.forEach(([k, cx, by, R, H, rad], i) => {
    const r = mulberry32(900 + i), zS = .42, Rc = R - rad * .5, Hc = H - rad * .5;
    const n = Math.max(560, Math.min(2000, Math.round(7 * (R * H) / (Math.PI * rad * rad) * 1.9)));   // enough stones, overlapping, that no gap shows through the heap
    const im = new THREE.InstancedMesh(LOW[(i * 2 + 1) % LOW.length], MT.rock, n), o = new THREE.Object3D(); im.castShadow = false; im.receiveShadow = false; im.frustumCulled = false;
    const ph = r() * 6;
    for (let q = 0; q < n; q++) {
      const sc = Math.pow((q + .5) / n, 1 / 3);                         // the size of the heap when this stone arrives
      const spill = r() < .04;
      let u = r(), v = r(); if (u + v > 1) { u = 1 - u; v = 1 - v; }
      // a point inside the (scaled) triangular outline of the heap, as the camera sees it: uniform over the outline, so the whole silhouette is filled and the peak stays pointed
      let x = (-1 + 2 * u + v) * sc * Rc, yy = v * sc * Hc;
      x *= 1 + .05 * Math.sin(yy * 8 + ph);                               // a natural, slightly uneven outline
      const rho = Math.max(0, sc * Rc * (1 - yy / (sc * Hc + 1e-6)));
      let z = zS * Math.sqrt(Math.max(0, rho * rho - x * x)) + r() * .02;   // the stone lies on the front slope of the cone
      if (spill) { x = (r() < .5 ? -1 : 1) * sc * R * (.98 + r() * .14); yy = 0; z = (r() - .2) * R * .25; }
      const f = Math.min(1, yy / (sc * Hc + 1e-6));                       // 0 at the foot, 1 at the top
      const s = rad * (.72 + r() * .55) * (spill ? .8 : .62 + .5 * (1 - f));   // large stones at the foot, small ones towards the peak
      o.position.set(cx + x, by + yy + s * .5, z);
      o.scale.set(s * (.9 + r() * .3), s * (.75 + r() * .3), s * (.9 + r() * .3)); o.rotation.set(r() * 6, r() * 6, r() * 6); o.updateMatrix(); im.setMatrixAt(q, o.matrix);
      im.setColorAt(q, new THREE.Color().setScalar(.36 + r() * .46));
    }
    piles[k] = { im, n }; scene.add(im);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(R * 2.6, R * .5), new THREE.MeshBasicMaterial({ map: SHADOW_TEX, transparent: true, depthWrite: false, toneMapped: false })); sh.position.set(cx, by + .015, -.05); sh.renderOrder = -1; scene.add(sh);
  });
  W.piles = piles;

  /* —— moving rock: one reusable instanced pool per size class (raw, larger, selected 40 mm, finer) —— */
  const PCOL = new THREE.Color(), CAP = 72, pool = {}, po = new THREE.Object3D(), poolG = new THREE.Group(); scene.add(poolG);
  [['R', 0, .28], ['L', 3, Lr], ['M', 5, Mr], ['F', 7, Fr]].forEach(([k, gi, r]) => { const im = new THREE.InstancedMesh(k === 'R' || k === 'L' ? STONES[gi % STONES.length] : LOW[gi % LOW.length], MT.rock, CAP); im.castShadow = k === 'R' || k === 'L'; im.frustumCulled = false; im.count = 0; pool[k] = { im, r, i: 0 }; poolG.add(im); });
  /* output route curves, taken from the reference diagram (pixel coordinates) */
  const curve = (pts) => { const c = new THREE.CatmullRomCurve3(pts.map(p => PT(p[0], p[1], .3)), false, 'catmullrom', .4); const tab = c.getSpacedPoints(80); return u => { const f = clamp(u) * 80, i = Math.min(79, Math.floor(f)); return tab[i].clone().lerp(tab[i + 1], f - i); }; };
  const routeL = curve([[1296, 530], [1320, 470], [1314, 385], [1306, 300], [1326, 218], [1372, 176], [1428, 163], [1478, 160]]);
  const routeM = curve([[1296, 553], [1322, 480], [1318, 410], [1334, 370], [1392, 362], [1440, 362], [1476, 363]]);
  const routeF = curve([[1150, 683], [1152, 712], [1210, 722], [1290, 710], [1312, 648], [1330, 592], [1392, 576], [1476, 574]]);
  W.routes = { L: routeL, M: routeM, F: routeF };
  const GAP = .24, T0 = 3.4, BELT = 3.2, HOP = .42, CH = 1.5, EXT = .5, TRB = 1.9, INL = .42;
  const tail = { L: [2.1, 2.0], M: [.55, .25, 1.5, 1.9], F: [.5, .55, .35, .35, 2.1] };
  const total = c => BELT + HOP + CH + EXT + TRB + INL + tail[c].reduce((a, b) => a + b, 0);
  const clsOf = j => { const h = hash(j + 3); return h < .22 ? 'L' : h < .7 ? 'M' : 'F'; };
  const headF = onBelt(CF, CF.L, .0, 0), tailT = onBelt(CT, .15, .0, 0), headT = onBelt(CT, CT.L, 0, 0);
  const spinS = 14, vibA = t => (.012 * sm(seg(t, 10.8, 11.8)));
  W.vib = t => { const a = vibA(t), w = t * 2 * Math.PI * 4.2; return { x: Math.cos(w) * a * .6, y: Math.sin(w) * a, rz: Math.sin(w) * a * .08, w, a }; };
  /* the shade belongs to the rock (its id j), not to its slot in the instance buffer: slots shift whenever an older rock expires, which made every rock flash a new shade */
  function place(c, p, s, rx, ry, rz, j) { const q = pool[c]; if (q.i >= CAP) return; po.position.copy(p); po.scale.setScalar(s); po.rotation.set(rx, ry, rz); po.updateMatrix(); q.im.setMatrixAt(q.i, po.matrix); q.im.setColorAt(q.i, PCOL.setScalar(.3 + hash(j * 7 + 1) * .42)); q.i++; }
  function rockAt(j, t, st) {
    const age = t - (T0 + j * GAP); if (age < 0) return false; const c = clsOf(j), life = total(c); if (age > life) return false;
    const hz = (hash(j * 3 + 1) - .5), hs = .85 + hash(j * 5 + 2) * .3, spin = hash(j * 11 + 4) * TAU; let a = age, pos = null, cls = 'R';
    const szR = pool.R.r * hs, szC = pool[c].r * hs; let sz = szR;
    const rot = a * 1.4 + spin;
    /* No rock ever jumps or pops: every hand-over between two phases below starts exactly where the previous one ended (they used to switch formulas,
       so a rock teleported up to 0.7 units inside the crusher, at the discharge, at the end of the screen and at the card edge, which read as flicker).
       A rock grows out of the stockpile, and shrinks into its card as it lands on the pile. */
    let sc = sm(seg(age, 0, .3)) * (1 - sm(seg(age, life - .34, life)));
    const thf = x => spin + x * (2 + x * 9), A62 = CH * .62, rrR = Math.max(.04, Math.min(.62, .66 - szR));
    const chEnd = () => { const th = thf(A62) + (CH - A62) * 3.2; return new V3(xc + Math.cos(th) * .4, 2.55, Math.sin(th) * .4); };
    const pTrb = onBelt(CT, .12, szC * .55 + .01, hz * .3), pTrbEnd = onBelt(CT, CT.L, szC * .55 + .01, hz * .3);
    const vb = W.vib(t), hop = Math.abs(Math.sin(t * 17 + j)) * .045 * sm(seg(t, 10.8, 11.8)), zD = hz * .62;
    const deckA = lx => lw(lx, .14 + szC * .7 + hop, zD, { x: vb.x, y: vb.y }), deckB = lx => lw(lx, -.2 + szC * .7 + hop, zD, { x: vb.x, y: vb.y });
    /* a route starts at a fixed point of the drawing, the deck end moves with the vibration: bend the route so it leaves from where the rock really is, and settle onto the drawn route over its first part */
    const routeJoin = (route, p0, u, zEnd) => { const q = route(u), q0 = route(0), w = 1 - sm(seg(u, 0, .14)); return new V3(q.x + (p0.x - q0.x) * w, q.y + (p0.y - q0.y) * w, lerp(p0.z, zEnd, 1 - w)); };
    if (a < BELT) { const u = a / BELT; pos = onBelt(CF, u * CF.L, szR * .55 + .01, hz * .38 + .05); }
    else if ((a -= BELT) < HOP) {
      const u = a / HOP, p0 = onBelt(CF, CF.L, szR * .55 + .01, hz * .38 + .05), p1 = new V3(xc + Math.cos(spin) * .1, 3.85, Math.sin(spin) * .1);
      pos = new V3(lerp(p0.x, p1.x, u), lerp(p0.y, p1.y, u * u), lerp(p0.z, p1.z, u));
    }
    else if ((a -= HOP) < CH) {
      const u = a / CH, th = thf(a);
      if (u < .3) pos = new V3(xc + Math.cos(th) * .1, lerp(3.85, 3.4, u / .3), Math.sin(th) * .1);
      else if (u < .62) { const e = (u - .3) / .32, rr = Math.max(.04, Math.min(lerp(.12, .62, e * e), .66 - szR)); pos = new V3(xc + Math.cos(th) * rr, lerp(3.4, 3.15, e), Math.sin(th) * rr); sc *= 1 - sm(seg(a, A62 - .1, A62)); }
      else {
        /* crushed: the big rock shrinks away and the smaller crushed rock grows out of the same place, continuing the same circle at the same radius */
        cls = c; sz = szC; const e = (u - .62) / .38, rr = Math.max(.04, lerp(rrR, .4, e)), th2 = thf(A62) + (a - A62) * 3.2;
        pos = new V3(xc + Math.cos(th2) * rr, lerp(3.15, 2.55, e * e), Math.sin(th2) * rr); sc *= sm(seg(a, A62, A62 + .1)); st.hit = u < .7 && u >= .62;
      }
      st.cham = true;
    }
    else if ((a -= CH) < EXT) { cls = c; sz = szC; const u = a / EXT, p0 = chEnd(); pos = new V3(lerp(p0.x, pTrb.x, u), lerp(p0.y, pTrb.y, u * u), lerp(p0.z, pTrb.z, u)); }
    else if ((a -= EXT) < TRB) { cls = c; sz = szC; const u = a / TRB; pos = onBelt(CT, .12 + u * (CT.L - .12), szC * .55 + .01, hz * .3); }
    else if ((a -= TRB) < INL) {
      cls = c; sz = szC; const u = a / INL, p1 = deckA(.2);
      pos = new V3(lerp(pTrbEnd.x, p1.x, u), lerp(pTrbEnd.y, p1.y, u * u), lerp(pTrbEnd.z, p1.z, u));
    }
    else {
      cls = c; sz = szC; a -= INL; const z = zD;
      const endA = deckA(SL - .05), endB = deckB(SL - .05);
      if (c === 'L') { const T = tail.L; if (a < T[0]) pos = deckA(lerp(.2, SL - .05, a / T[0])); else { a -= T[0]; pos = routeJoin(routeL, endA, a / T[1], z * .5 + .3); } }
      else if (c === 'M') { const T = tail.M, fx = .9 + hash(j + 9) * .5; if (a < T[0]) pos = deckA(lerp(.2, fx, a / T[0])); else if ((a -= T[0]) < T[1]) { const u = a / T[1], p1 = deckA(fx), p2 = deckB(fx + .1); pos = new V3(lerp(p1.x, p2.x, u), lerp(p1.y, p2.y, u * u), z); } else if ((a -= T[1]) < T[2]) pos = deckB(lerp(fx + .1, SL - .05, a / T[2])); else { a -= T[2]; pos = routeJoin(routeM, endB, a / T[3], z * .5 + .3); } }
      else { const T = tail.F, fx = 1.5 + hash(j + 13) * .9; const hx = X(1132) + (hash(j + 17) - .5) * .5; if (a < T[0]) pos = deckA(lerp(.2, fx, a / T[0])); else if ((a -= T[0]) < T[1]) { const u = a / T[1], p1 = deckA(fx), yb = Y(560); pos = new V3(p1.x, lerp(p1.y, yb, u * u), z); } else if ((a -= T[1]) < T[2]) { const u = a / T[2]; pos = new V3(lerp(deckA(fx).x, hx, u), lerp(Y(560), Y(655), u), z * (1 - u)); } else if ((a -= T[2]) < T[3]) { const u = a / T[3]; pos = new V3(lerp(hx, X(1150), u), lerp(Y(655), Y(683), u * u), 0); } else { a -= T[3]; const u = a / T[4]; pos = routeF(u); pos.z = lerp(0, z * .5 + .3, sm(seg(u, 0, .14))); } }
    }
    place(cls, pos, Math.max(.001, sz * sc), rot * .6, rot, rot * .3, j); return true;
  }
  /* a rock counts towards its pile while it shrinks into the card (the pile grows smoothly instead of jumping by a whole batch of stones) */
  W.arrivals = (t) => { const o = { L: 0, M: 0, F: 0 }; const jmax = Math.min(220, Math.floor((t - T0) / GAP)); for (let j = 0; j <= jmax; j++) { const c = clsOf(j), L = total(c); o[c] += sm(seg(t - (T0 + j * GAP), L - .55, L - .05)); } return o; };
  W.updRocks = (t) => { Object.values(pool).forEach(q => { q.i = 0; }); const jmax = Math.floor((t - T0) / GAP); const st = {}; for (let j = Math.max(0, jmax - 62); j <= jmax; j++) rockAt(j, t, st); Object.values(pool).forEach(q => { q.im.count = q.i; q.im.instanceMatrix.needsUpdate = true; if (q.im.instanceColor) q.im.instanceColor.needsUpdate = true; }); };
  W.pileUpdate = (t) => { const a = W.arrivals(t), caps = { L: 7, M: 18, F: 30 }; ['L', 'M', 'F'].forEach(k => { const lv = clamp(.5 + .5 * clamp(a[k] / caps[k])); piles[k].im.count = Math.max(1, Math.round(piles[k].n * lv)); }); };
  clipTree(poolG, swp); Object.values(piles).forEach(p => clipTree(p.im, swp)); clipTree(plant, swp); clipTree(heapG, swp);
  const beltPos = (t, start) => { const tt = Math.max(0, t - start); return tt < .6 ? tt * tt / 1.2 : tt - .3; };

  /* —— the timeline —— */
  W.state = (t) => {
    swp.constant = 99;                 // the whole plant is there from the very first frame: no blank start, no left-to-right build-in
    key.intensity = 2.2;
    const fd = beltPos(t, 3.1), td = beltPos(t, 7.7);
    beltFeed.map.offset.x = -fd * (CF.L / TB_F(CF)) / .45 * 1.0; beltTr.map.offset.x = -td * (CT.L / TRB) / .45 * 1.0;
    W.rotor.rotation.y = -(t > 5.5 ? (t - 5.5) * 9 + 20 * sm(seg(t, 5.5, 6.5)) : 0);
    const open = (a, b, c, d) => (1 - sm(seg(t, c, d))) * sm(seg(t, a, b));
    cutC.constant = lerp(6, 0, open(6.2, 7.0, 9.0, 9.9)); cutS.constant = lerp(6, 0, open(11.0, 11.8, 16.6, 17.5));
    const vb = W.vib(t); screen.position.set(SO.x + vb.x, SO.y + vb.y, 0); screen.rotation.z = SA + vb.rz; frame.position.set(0, 0, 0);
    W.springUpdate(SO.x + vb.x, SO.y + vb.y, SA + vb.rz);
    W.updRocks(t); W.pileUpdate(t);
  };
  function TB_F() { return BELT; }
  W.planes.beltT = beltTr; return W;
}

/* ═════════════ runtime ═════════════ */
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
export class ProcessFigure {
  constructor(fig) { this.fig = fig; this.cv = fig.querySelector('canvas.pr-cv'); this.t = 0; this.playing = false; this.paused = false; this.vis = false; this.started = false; this.live = false; this.stage = -1; this.dirty = true; this.q = 1; }
  async boot() {
    const R = this.R = new THREE.WebGLRenderer({ canvas: this.cv, antialias: true, alpha: true, powerPreference: 'high-performance' });
    R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.04; R.shadowMap.enabled = true; R.shadowMap.autoUpdate = false; R.shadowMap.type = THREE.PCFSoftShadowMap; R.localClippingEnabled = true; R.setClearColor(0, 0);
    this.world = buildWorld(R, { size: parseFloat(this.fig.dataset.size) || 40 });
    const d = 40, el = 6 * D2R; this.el = el; this.look = new V3(0, Y(443.5), 0); this.cam = new THREE.PerspectiveCamera(2 * Math.atan((8.87 / 2) / d) / D2R, 2, 5, 140); this.camBase = new V3(0, this.look.y + d * Math.sin(el), d * Math.cos(el));
    this.cv.addEventListener('webglcontextlost', e => { e.preventDefault(); this.fig.classList.remove('pr-on'); this.lost = true; });
    // a lost GL context (busy GPU, many tabs) used to leave the figure frozen on its poster for good: bring it back when the browser restores it
    this.cv.addEventListener('webglcontextrestored', () => { this.lost = false; this.raf = 0; this.dirty = true; this.size(); this.draw(this.t); this.fig.classList.add('pr-on'); this.wake(); });
    this.size();
    // warm-up while the canvas is still hidden: draw one frame of every phase (large rocks, screen, steady state) so every shader, buffer and
    // texture is created now, not as a hitch when the larger-fraction rocks first appear
    /* compile every shader of every phase in parallel, off the main thread, and draw the warm-up frames one per animation frame: the synchronous first draws linked the shaders on the main thread (a 1-2 s freeze while the page was loading or scrolling) */
    R.debug.checkShaderErrors = false; for (const t0 of [7, 12, 16, 24, 0]) { this.world.state(t0); try { await R.compileAsync(this.world.scene, this.cam); await compileShadows(R, this.world.scene, this.cam); R.shadowMap.needsUpdate = true; await warmProgressive(R, this.world.scene, this.cam); } catch (e) {} await new Promise(r => requestAnimationFrame(r)); this.draw(t0); }
    this.fig.classList.add('pr-on');
    this.io = new IntersectionObserver(es => { this.vis = es[0].isIntersecting; if (this.vis && !this.started) { this.started = true; if (reduceMotion) { this.t = END; this.draw(END); this.ui(END); } else this.play(START); } this.wake(); }, { threshold: .3 });
    this.io.observe(this.fig); new ResizeObserver(() => { this.size(); this.dirty = true; this.wake(); }).observe(this.fig);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.wake(); });
    return this;
  }
  size() {
    // Sharpness: always render at least 1.75x (desktop) / 1.5x (touch) of the CSS size, up to 2.25x / 2x on high-density screens, so the browser
    // downsamples a crisp image (a 1x canvas stretched on a retina screen is what looked blurry). Adaptive quality `q` only steps down if the GPU can't keep up.
    const w = this.cv.clientWidth || 800, h = this.cv.clientHeight || 400, touch = matchMedia('(hover:none)').matches, d = window.devicePixelRatio || 1;
    let dpr = (touch ? Math.min(Math.max(d, 1.5), 2) : Math.min(Math.max(d, 1.75), 2.25)) * this.q; dpr = Math.min(dpr, Math.sqrt(6.5e6 / (w * h)));
    const W = Math.round(w * dpr), H = Math.round(h * dpr); if (this.R.domElement.width !== W || this.R.domElement.height !== H) this.R.setSize(W, H, false); this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); }
  draw(t, reuseShadow) { this.R.shadowMap.needsUpdate = !reuseShadow; this.world.state(t); this.cam.zoom = 1 / Math.cos(this.el); this.cam.updateProjectionMatrix(); this.cam.position.copy(this.camBase); this.cam.lookAt(this.look.x, this.look.y, 0); this.R.render(this.world.scene, this.cam); }
  ui(t) {
    const f = this.fig, s = stageAt(Math.min(t, END));
    // heading, cards and timeline are on screen all the time (they used to fade out when the run started and back in later)
    const u = f.querySelector('.pr-ui'); if (u) { u.style.setProperty('--prk', 1); u.style.setProperty('--prtl', 1); u.style.setProperty('--prcard', 1); } f.toggleAttribute('data-sel', t >= 15);
    if (s !== this.stage) { this.stage = s; f.setAttribute('data-stage', s); f.dispatchEvent(new CustomEvent('prstage', { detail: s, bubbles: true })); }
  }
  play(from) { this.t = from; this.playing = true; this.live = true; this.paused = false; this.fig.classList.add('pr-run'); this.syncBtn(); this.wake(); }
  jumpStage(n) { this.started = true; if (reduceMotion) { this.t = STAGE_AT[n - 1]; this.draw(this.t); this.ui(this.t); return; } this.play(STAGE_AT[n - 1]); }
  replay() { if (reduceMotion) return; this.play(START); }
  toggle() { this.paused = !this.paused; this.syncBtn(); this.wake(); }
  syncBtn() { const b = this.fig.querySelector('[data-pr=pause]'); if (b) { b.textContent = this.paused ? 'Play' : 'Pause'; b.setAttribute('aria-pressed', this.paused ? 'true' : 'false'); } }
  wake() { if (!this.raf && this.vis && !document.hidden && !this.lost && !reduceMotion) { this.last = performance.now(); this.raf = requestAnimationFrame(n => this.loop(n)); } }
  loop(now) {
    this.raf = 0; let gap = now - this.last; if (!(gap > 0)) gap = 0; const dt = Math.min(.1, gap / 1000); this.last = Math.max(now, this.last || 0); // rAF timestamps can precede performance.now(): never let time run backwards
    if (!this.vis || document.hidden) return; // off screen / background tab: stop drawing (wake() restarts it)
    if (!this.paused && this.live) { this.t += dt; if (this.t >= END && this.playing) { this.playing = false; } this.dirty = true; }
    if (this.dirty) {
      // shadows are re-rendered every other frame (the machine is static, only rocks move): halves the GPU cost
      this.fc = (this.fc || 0) + 1; this.draw(this.t, this.live && !this.paused && this.fc % 2 === 1 && gap < 60); this.ui(Math.min(this.t, END)); this.dirty = false;
      // adaptive resolution: judged on real frame gaps (GPU time is not visible in the draw call itself)
      if (this.live && !this.paused && gap > 1 && this.fc > 45) { this.gapAvg = (this.gapAvg || 16) * .9 + Math.min(gap, 200) * .1; if (this.gapAvg > 38 && this.q > .7) { this.q = Math.max(.7, this.q * .88); this.size(); this.gapAvg = 16; this.fc = 0; } }
    }
    // one steady requestAnimationFrame cadence for the whole run, including the endless steady state. (It used to switch to setTimeout(33) +
    // rAF after the intro, which lands on ~50 ms frames: the "slow and laggy" ending.)
    if (this.live && !this.paused) this.raf = requestAnimationFrame(n => this.loop(n));
  }
  poster(w, h, t) { this.R.setSize(w, h, false); this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); this.draw(t); return this.R.domElement.toDataURL('image/png'); }
}
export async function init(fig) { const p = new ProcessFigure(fig); await p.boot(); fig.__pr = p; window.__pr = p; return p; }
