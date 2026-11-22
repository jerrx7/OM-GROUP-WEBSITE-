/* OM GROUP — laboratory test stations: seven procedural PBR models rendered by ONE shared three.js renderer.
   Each card owns a 2D canvas; the shared WebGL canvas is drawn into it on demand (no WebGL context per card).
   Note: nothing here is an OM GROUP result, photograph or measurement. */
import * as THREE from '/assets/vendor/three/three.module.min.js';

const V3 = THREE.Vector3, V2 = THREE.Vector2;
const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sm = k => { k = clamp(k); return k * k * (3 - 2 * k); };
const eio = k => { k = clamp(k); return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ───────── materials ───────── */
function canvasTex(w, h, draw, srgb) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t;
}
const brushed = canvasTex(256, 256, (x, w, h) => {
  x.fillStyle = '#8a8a8a'; x.fillRect(0, 0, w, h); const r = mulberry32(3);
  for (let i = 0; i < 900; i++) { const v = 110 + r() * 90 | 0; x.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',.35)'; x.fillRect(0, r() * h, w, .6 + r() * 1.2); }
});
const gridTex = (n) => canvasTex(128, 128, (x, w, h) => { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); x.strokeStyle = '#fff'; x.lineWidth = 9; for (let i = 0; i <= 2; i++) { x.beginPath(); x.moveTo(i * w / 2, 0); x.lineTo(i * w / 2, h); x.moveTo(0, i * h / 2); x.lineTo(w, i * h / 2); x.stroke(); } });
const M = {
  steel: new THREE.MeshPhysicalMaterial({ color: 0xd4d7db, metalness: 1, roughness: .3, roughnessMap: brushed, anisotropy: .5, envMapIntensity: 1.15, side: THREE.DoubleSide }),
  steelS: new THREE.MeshPhysicalMaterial({ color: 0xd4d7db, metalness: 1, roughness: .3, roughnessMap: brushed, anisotropy: .5, envMapIntensity: 1.15 }),
  ball: new THREE.MeshStandardMaterial({ color: 0x9da1a6, metalness: 1, roughness: .26, envMapIntensity: .8 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xf0f2f4, metalness: 1, roughness: .08, envMapIntensity: 1.4 }),
  dark: new THREE.MeshPhysicalMaterial({ color: 0x2a2c30, metalness: .72, roughness: .42, roughnessMap: brushed, envMapIntensity: 1 }),
  black: new THREE.MeshStandardMaterial({ color: 0x1b1c1f, metalness: .35, roughness: .5, envMapIntensity: .9 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x131314, metalness: 0, roughness: .92 }),
  orange: new THREE.MeshPhysicalMaterial({ color: 0xff5e29, metalness: .1, roughness: .34, clearcoat: .7, clearcoatRoughness: .22 }),
  panel: new THREE.MeshStandardMaterial({ color: 0x3a3d42, metalness: .6, roughness: .38 }),
  white: new THREE.MeshPhysicalMaterial({ color: 0xe9ebee, metalness: .15, roughness: .36, clearcoat: .4, clearcoatRoughness: .3 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: .03, transparent: true, opacity: .14, envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide }),
  water: new THREE.MeshPhysicalMaterial({ color: 0x6fc0e6, metalness: 0, roughness: .06, transparent: true, opacity: .55, envMapIntensity: 1.2, depthWrite: false }),
  stone: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .86, metalness: 0, envMapIntensity: .7 }),
  mesh: new THREE.MeshStandardMaterial({ color: 0xcfd3d8, metalness: 1, roughness: .38, alphaMap: gridTex(), alphaTest: .35, side: THREE.DoubleSide, transparent: false }),
  led: new THREE.MeshStandardMaterial({ color: 0x0c2a26, emissive: 0x2fe6b0, emissiveIntensity: .55, roughness: .3 }),
  green: new THREE.MeshStandardMaterial({ color: 0x2c9a52, emissive: 0x2c9a52, emissiveIntensity: .5, roughness: .4 }),
  red: new THREE.MeshStandardMaterial({ color: 0xd63a2f, emissive: 0xd63a2f, emissiveIntensity: .45, roughness: .4 }),
};
M.mesh.alphaMap.repeat.set(14, 14);

/* ───────── geometry helpers ───────── */
function rrPath(p, x, y, w, h, r) {
  p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.quadraticCurveTo(x + w, y, x + w, y + r); p.lineTo(x + w, y + h - r); p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  p.lineTo(x + r, y + h); p.quadraticCurveTo(x, y + h, x, y + h - r); p.lineTo(x, y + r); p.quadraticCurveTo(x, y, x + r, y);
}
function rbox(w, h, d, r = .04, bev = .014) {
  const s = new THREE.Shape(); const ww = w - 2 * bev, hh = h - 2 * bev; rrPath(s, -ww / 2, -hh / 2, ww, hh, Math.max(.002, Math.min(r, ww / 2, hh / 2) - bev));
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(.002, d - 2 * bev), bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 6 });
  g.translate(0, 0, -(d - 2 * bev) / 2); return g;
}
const mk = (geo, mat, o = {}) => { const m = new THREE.Mesh(geo, mat); m.castShadow = o.cast !== false && !mat.transparent; m.receiveShadow = o.rec !== false; return m; };
const put = (p, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { m.position.set(x, y, z); m.rotation.set(rx, ry, rz); p.add(m); return m; };
const cyl = (rt, rb, h, mat, seg = 48) => mk(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
const lathe = (pts, mat, seg = 56) => mk(new THREE.LatheGeometry(pts.map(p => new V2(p[0], p[1])), seg), mat);
const box = (w, h, d, mat) => mk(rbox(w, h, d, Math.min(w, h, d) * .22, Math.min(.014, Math.min(w, h, d) * .3)), mat);
function helix(r, h, turns, tube, mat) {
  class H extends THREE.Curve { getPoint(t, o = new V3()) { const a = t * turns * TAU; return o.set(Math.cos(a) * r, t * h, Math.sin(a) * r); } }
  return mk(new THREE.TubeGeometry(new H(), 90, tube, 8, false), mat);
}
function frustum(wb, db, wt, dt, h) {
  const b = [[-wb / 2, 0, -db / 2], [wb / 2, 0, -db / 2], [wb / 2, 0, db / 2], [-wb / 2, 0, db / 2]], t = [[-wt / 2, h, -dt / 2], [wt / 2, h, -dt / 2], [wt / 2, h, dt / 2], [-wt / 2, h, dt / 2]];
  const pos = []; const quad = (a, b2, c, d) => { pos.push(...a, ...b2, ...c, ...a, ...c, ...d); };
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; quad(b[i], b[j], t[j], t[i]); }
  quad(b[0], b[3], b[2], b[1]);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g;
}

/* ───────── crushed stone (faceted, granite-speckled like the product photographs) ───────── */
const STONES = (() => {
  const out = [], r = mulberry32(2024);
  for (let n = 0; n < 9; n++) {
    const g = new THREE.IcosahedronGeometry(1, 2); const p = g.attributes.position;
    const s1 = r() * 9, s2 = r() * 9, s3 = r() * 9;
    const planes = []; for (let k = 0; k < 7; k++) planes.push([new V3(r() - .5, r() - .5, r() - .5).normalize(), .62 + r() * .22]);
    const v = new V3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i); const d = 1 + .18 * Math.sin(v.x * 3.1 + s1) * Math.cos(v.y * 2.6 + s2) + .1 * Math.sin(v.z * 4.3 + s3) * Math.sin(v.x * 5.1 + s1);
      v.multiplyScalar(d);
      for (const [nn, off] of planes) { const o = v.dot(nn) - off; if (o > 0) v.addScaledVector(nn, -o); }
      p.setXYZ(i, v.x, v.y * .86, v.z * 1.08);
    }
    g.computeVertexNormals();
    const col = new Float32Array(p.count * 3); const vein = new V3(r() - .5, r() - .5, r() - .5).normalize();
    for (let f = 0; f < p.count; f += 3) {
      const cx = (p.getX(f) + p.getX(f + 1) + p.getX(f + 2)) / 3, cy = (p.getY(f) + p.getY(f + 1) + p.getY(f + 2)) / 3, cz = (p.getZ(f) + p.getZ(f + 1) + p.getZ(f + 2)) / 3;
      let b = .08 + r() * .075; const vv = cx * vein.x + cy * vein.y + cz * vein.z; b *= 1 + .5 * Math.max(0, Math.sin(vv * 7 + n));
      if (r() < .1) b = .34 + r() * .3; if (r() < .05) b = .025;
      for (let k = 0; k < 3; k++) { col[(f + k) * 3] = b * .98; col[(f + k) * 3 + 1] = b * .99; col[(f + k) * 3 + 2] = b * 1.03; }
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); out.push(g);
  }
  return out;
})();
function stone(rng, s, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(STONES[(rng() * STONES.length) | 0], M.stone); m.castShadow = true; m.receiveShadow = true;
  m.scale.set(s * sx * (.85 + rng() * .3), s * sy * (.8 + rng() * .35), s * sz * (.85 + rng() * .3)); m.rotation.set(rng() * TAU, rng() * TAU, rng() * TAU); return m;
}
function heap(parent, rng, n, R, y0, size, hump) {
  const arr = [];
  for (let i = 0; i < n; i++) {
    const r = R * Math.sqrt(rng()), a = rng() * TAU, s = size * (.72 + rng() * .56), h = (1 - (r / R) ** 2) * hump + rng() * size * .35;
    const m = stone(rng, s); m.position.set(Math.cos(a) * r, y0 + h + s * .45, Math.sin(a) * r); m.userData.b = m.position.clone(); m.userData.ph = rng() * TAU; parent.add(m); arr.push(m);
  }
  return arr;
}

/* ───────── studio: environment, lights, contact shadow ───────── */
let ENV = null;
function makeEnv(R) {
  const s = new THREE.Scene();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: {}, vertexShader: 'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: 'varying vec3 p;void main(){float h=normalize(p).y;vec3 top=vec3(.95,.93,.89),mid=vec3(.34,.32,.3),bot=vec3(.16,.15,.14);vec3 c=h>0.?mix(mid,top,smoothstep(.0,.8,h)):mix(mid,bot,smoothstep(.0,.5,-h));gl_FragColor=vec4(c,1.);}' }));
  s.add(dome);
  const panel = (w, h, x, y, z, k, col) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col || 0xffffff).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m); };
  panel(14, 9, -10, 13, 12, 6.5); panel(5, 14, 17, 5, 9, 3.4); panel(16, 2.5, 0, 7, -16, 3.6, 0xffeee2); panel(3, 10, -16, 3, -4, 2.2);
  panel(12, 12, 0, 20, 0, 2.6);
  const pm = new THREE.PMREMGenerator(R); const t = pm.fromScene(s, .035).texture; pm.dispose(); return t;
}
const blobTex = canvasTex(128, 128, (x, w, h) => { const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(20,18,16,.55)'); g.addColorStop(.55, 'rgba(20,18,16,.22)'); g.addColorStop(1, 'rgba(20,18,16,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
function stage(R, rig) {
  const scene = new THREE.Scene(); scene.environment = ENV; scene.environmentIntensity = 1;
  const ext = rig.ext || 2.6;
  const key = new THREE.DirectionalLight(0xfff3e6, 1.5); key.position.set(-3.2, 6, 4.4); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: .5, far: 20 }); key.shadow.bias = -.0004; key.shadow.normalBias = .02; scene.add(key);
  const rim = new THREE.DirectionalLight(0xff9068, .3); rim.position.set(4, 3, -5); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xfff6ea, 0xcfc8bc, .3));
  const gnd = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: .24 })); gnd.rotation.x = -Math.PI / 2; gnd.receiveShadow = true; scene.add(gnd);
  const bw = rig.blob || [3, 2]; const blob = new THREE.Mesh(new THREE.PlaneGeometry(bw[0], bw[1]), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, toneMapped: false })); blob.rotation.x = -Math.PI / 2; blob.position.set(rig.blobAt ? rig.blobAt[0] : 0, .002, rig.blobAt ? rig.blobAt[1] : 0); scene.add(blob);
  scene.add(rig.group); return scene;
}
/* camera path: [t, azimuth°, elevation°, distance, tx, ty, tz, fov] */
function camAt(path, t, cam, aspect, amp) {
  let i = 0; while (i < path.length - 2 && t >= path[i + 1][0]) i++;
  const a = path[i], b = path[i + 1], k = sm((t - a[0]) / (b[0] - a[0] || 1));
  const L = j => lerp(a[j], b[j], k);
  const az = L(1) * Math.PI / 180, el = L(2) * Math.PI / 180, d = L(3);
  const tx = L(4), ty = L(5), tz = L(6);
  cam.position.set(tx + Math.sin(az) * Math.cos(el) * d, ty + Math.sin(el) * d, tz + Math.cos(az) * Math.cos(el) * d);
  cam.fov = L(7) * (amp || 1); cam.aspect = aspect; cam.lookAt(tx, ty, tz); cam.updateProjectionMatrix();
}

/* ═════════════ 01 · SIEVE SHAKER ═════════════ */
function labelTex(txt) {
  return canvasTex(512, 96, (x, w, h) => { x.fillStyle = '#eef0f2'; x.fillRect(0, 0, w, h); x.fillStyle = '#ff5e29'; x.fillRect(0, 0, 14, h); x.fillStyle = '#1b1c1f'; x.font = '700 50px Inter, Arial, sans-serif'; x.textBaseline = 'middle'; x.textAlign = 'center'; x.fillText(txt, w / 2 + 6, h / 2 + 2); }, true);
}
function buildSieve() {
  const g = new THREE.Group(), rng = mulberry32(11);
  [[-.98, -.58], [.98, -.58], [-.98, .58], [.98, .58]].forEach(([x, z]) => put(g, cyl(.085, .095, .06, M.rubber, 24), x, .03, z));
  put(g, mk(rbox(2.4, .5, 1.5, .14, .02), M.black), 0, .31, 0);
  put(g, mk(rbox(2.44, .07, 1.54, .04, .02), M.orange), 0, .6, 0);
  put(g, mk(rbox(1.25, .3, .05, .05, .01), M.panel), -.52, .31, .765);
  put(g, cyl(.085, .095, .09, M.steelS, 36), -.82, .31, .82, Math.PI / 2);
  put(g, mk(new THREE.BoxGeometry(.016, .07, .012), M.orange), -.82, .335, .87);
  put(g, cyl(.04, .04, .035, M.green, 24), -.3, .27, .805, Math.PI / 2); put(g, cyl(.04, .04, .035, M.red, 24), -.18, .27, .805, Math.PI / 2);
  put(g, box(.42, .13, .03, M.led), -.44, .39, .795);
  [-.62, .62].forEach(x => put(g, helix(.085, .3, 5, .013, M.steelS), x, .635, 0));
  const stack = new THREE.Group(); stack.position.y = 0; g.add(stack);
  put(stack, cyl(.86, .86, .07, M.steelS, 64), 0, .975, 0);
  put(stack, cyl(.88, .88, .02, M.dark, 64), 0, .94, 0);
  const prof = [[.70, 0], [.735, .025], [.74, .04], [.74, .30], [.758, .315], [.758, .338], [.735, .338], [.716, .32], [.706, .30], [.706, .05]];
  const trayGeo = new THREE.LatheGeometry(prof.map(p => new V2(p[0], p[1])), 72);
  const sizes = ['40 mm', '20 mm', '10 mm', '4.75 mm'], trays = [];
  for (let j = 0; j < 4; j++) {
    const y = 1.01 + (3 - j) * .30; const t = new THREE.Group(); t.position.y = y; stack.add(t);
    t.add(mk(trayGeo, M.steel));
    put(t, mk(new THREE.CircleGeometry(.706, 56), M.mesh, { cast: false }), 0, .05, 0, -Math.PI / 2);
    const lab = mk(new THREE.CylinderGeometry(.745, .745, .15, 28, 1, true, -.52, 1.04), new THREE.MeshStandardMaterial({ map: labelTex(sizes[j]), roughness: .45, metalness: .1, side: THREE.FrontSide }), { cast: false });
    put(t, lab, 0, .17, 0); trays.push(t);
  }
  const top = trays[0]; const st = heap(top, rng, 22, .56, .05, .14, .1);
  const rods = [[-1.02, -.18], [1.02, -.18]];
  rods.forEach(([x, z]) => {
    put(g, cyl(.034, .034, 2.46, M.steelS, 24), x, 1.85, z);
    put(g, cyl(.06, .06, .14, M.dark, 24), x, .66, z);
    put(g, lathe([[.0, 0], [.07, 0], [.085, .05], [.085, .15], [.06, .21], [0, .22]], M.black, 28), x, 3.08, z);
    put(g, cyl(.05, .05, .05, M.orange, 24), x, 3.07, z);
  });
  put(g, box(2.34, .11, .2, M.orange), 0, 2.84, -.18);
  put(g, box(.2, .26, .28, M.black), -1.02, 2.84, -.18); put(g, box(.2, .26, .28, M.black), 1.02, 2.84, -.18);
  const cam = [[0, 30, 21, 9.6, 0, 1.5, 0, 26], [1.3, 24, 25, 8.6, 0, 1.7, 0, 26], [4.6, 18, 36, 6.4, 0, 2.05, 0, 26], [6.6, 26, 26, 8.6, 0, 1.7, 0, 26], [8, 30, 21, 9.6, 0, 1.5, 0, 26]];
  return {
    group: g, L: 8, cam, ext: 2.6, blob: [3.6, 2.6],
    update(t) {
      const e = sm(seg(t, 1.0, 1.9)) * (1 - sm(seg(t, 6.3, 7.2))); const w = t * 46;
      stack.position.set(Math.cos(w) * .011 * e, 0, Math.sin(w) * .011 * e); stack.rotation.z = Math.sin(w * .5) * .0025 * e;
      st.forEach((m, i) => { const u = m.userData; m.position.y = u.b.y + Math.max(0, Math.sin(w * .5 + u.ph)) * .035 * e; m.position.x = u.b.x + Math.sin(w * .37 + u.ph * 2) * .02 * e; m.rotation.y += .01 * e * Math.sin(u.ph + w); });
    }
  };
}

/* ═════════════ 02 · SHAPE GAUGES ═════════════ */
function buildShape() {
  const g = new THREE.Group(), rng = mulberry32(21);
  const base = new THREE.Group(); base.position.set(-.55, 0, 0); g.add(base);
  /* thickness gauge: steel plate with five machined slots, leaning on two rear stays */
  const pw = 1.9, ph = 1.3; const shape = new THREE.Shape(); rrPath(shape, -pw / 2, -ph / 2, pw, ph, .08);
  const widths = [.1, .125, .155, .19, .235], sx = [-.66, -.34, -.0, .36, .76];
  widths.forEach((w, i) => { const h = new THREE.Path(); rrPath(h, sx[i] - w / 2, -ph / 2 + .15, w, ph - .3, w / 2.2); shape.holes.push(h); });
  const plateG = new THREE.ExtrudeGeometry(shape, { depth: .06, bevelEnabled: true, bevelThickness: .01, bevelSize: .01, bevelSegments: 2, curveSegments: 8 }); plateG.translate(0, 0, -.03);
  const plate = new THREE.Group(); plate.position.set(0, .72, .05); plate.rotation.x = -.2; base.add(plate);
  plate.add(mk(plateG, M.steelS));
  [[-pw / 2 + .12, ph / 2 - .12], [pw / 2 - .12, ph / 2 - .12], [-pw / 2 + .12, -ph / 2 + .12], [pw / 2 - .12, -ph / 2 + .12]].forEach(([x, y]) => put(plate, cyl(.034, .034, .02, M.chrome, 20), x, y, .045, Math.PI / 2));
  [-.62, .62].forEach(x => { put(base, box(.12, .1, .78, M.dark), x, .06, -.3); const st = box(.07, .9, .07, M.dark); put(base, st, x, .5, -.38, -.2); put(base, cyl(.05, .05, .1, M.black, 16), x, .05, .08); });
  put(base, box(1.95, .05, .36, M.dark), 0, .025, .1);
  /* length gauge block */
  const lg = new THREE.Group(); lg.position.set(1.3, 0, .12); g.add(lg);
  put(lg, box(.62, .72, .46, M.steelS), 0, .66, 0); put(lg, box(.64, .1, .48, M.orange), 0, 1.03, 0);
  [-.15, .15].forEach(x => { put(lg, cyl(.055, .055, .1, M.chrome, 24), x, .66, .26, Math.PI / 2); put(lg, cyl(.07, .07, .03, M.dark, 24), x, .66, .22, Math.PI / 2); });
  put(lg, box(.5, .09, .06, M.dark), 0, .84, .233); put(lg, box(.09, .3, .36, M.dark), -.2, .15, 0); put(lg, box(.09, .3, .36, M.dark), .2, .15, 0);
  const stones = []; for (let i = 0; i < 6; i++) { const m = stone(rng, .075 + rng() * .06); m.position.set(-1.0 + rng() * 2.6, .07, .85 + rng() * .5); g.add(m); }
  const flake = stone(rng, .26, .2, .72, 1.0); flake.rotation.set(0, 0, 0); g.add(flake);
  const thick = stone(rng, .15, 1.05, 1.1, 1.0); g.add(thick); thick.scale.multiplyScalar(1.12);
  const p0 = new V3(-1.35, .12, 1.05), t0 = new V3(-1.7, .12, .95);
  const cam = [[0, 30, 17, 6.8, .3, .62, 0, 26], [1.0, 28, 19, 6.5, -.1, .65, .1, 26], [3.6, 12, 14, 4.3, -.55, .82, .2, 26], [5.0, 10, 14, 4.2, -1.0, .8, .2, 26], [6.9, 12, 15, 4.5, -.8, .8, .2, 26], [8.6, 30, 17, 6.8, .3, .62, 0, 26]];
  flake.position.copy(p0); thick.position.copy(t0); flake.userData.s0 = flake.scale.clone();
  return {
    group: g, L: 8.6, cam, ext: 3, blob: [4.6, 2.4], blobAt: [.1, .25],
    update(t) {
      /* flake: lifts, lines up with the 3rd slot, slides through, drops behind, then a fresh one is ready */
      const slotX = -.55 + sx[2], s0 = flake.userData.s0;
      const A = eio(seg(t, 1.0, 2.0)), B = eio(seg(t, 2.0, 3.0)), C = eio(seg(t, 3.0, 3.6));
      let x = lerp(p0.x, slotX, A), y = lerp(p0.y, .8, A) + Math.sin(A * Math.PI) * .32, z = lerp(p0.z, 1.0, A);
      z = lerp(z, -.5, B); y = lerp(y, .12, C); x = x + 0;
      if (t >= 6.5) { x = p0.x; y = p0.y; z = p0.z; }
      flake.position.set(x, y, z); flake.rotation.set(0, 0, 0);
      const fs = (t < 6.0) ? 1 : t < 6.5 ? 1 - sm(seg(t, 6.0, 6.5)) : t < 7.6 ? 0 : sm(seg(t, 7.6, 8.4)); flake.scale.copy(s0).multiplyScalar(Math.max(.001, fs));
      /* thick stone: lifts to the narrow slot, is stopped by the plate, withdraws */
      const d = eio(seg(t, 3.7, 4.9)), e = eio(seg(t, 4.9, 5.25)), w = eio(seg(t, 5.9, 6.8));
      const nx = -.55 + sx[0];
      let tx = lerp(t0.x, nx, d), ty = lerp(.14, .8, d) + Math.sin(d * Math.PI) * .28, tz = lerp(t0.z, .9, d);
      tz = lerp(tz, .3, e);
      tx = lerp(tx, t0.x, w); ty = lerp(ty, .14, w); tz = lerp(tz, t0.z, w);
      thick.position.set(tx, ty, tz); thick.rotation.set(0, 0, Math.sin(seg(t, 5.25, 5.9) * 16) * .1 * (1 - seg(t, 5.25, 5.9)));
    }
  };
}

/* ═════════════ 03 · CRUSHING TEST ═════════════ */
function buildCrush() {
  const g = new THREE.Group(), rng = mulberry32(31);
  put(g, mk(rbox(2.5, .16, 1.5, .08, .02), M.dark), 0, .08, 0);
  [-.62, .62].forEach(x => [-.5, .5].forEach(z => put(g, cyl(.06, .07, .05, M.rubber, 20), x * 1.5, .025, z * 1.2)));
  [-.92, .92].forEach(x => { put(g, cyl(.095, .095, 2.1, M.steelS, 36), x, 1.2, 0); put(g, cyl(.14, .14, .08, M.dark, 36), x, .2, 0); put(g, cyl(.14, .14, .08, M.dark, 36), x, 2.22, 0); });
  put(g, mk(rbox(2.5, .34, 1.0, .1, .02), M.dark), 0, 2.4, 0);
  put(g, box(2.2, .06, .9, M.orange), 0, 2.585, 0);
  put(g, cyl(.34, .38, .5, M.black, 40), 0, 2.85, 0); put(g, cyl(.36, .36, .05, M.orange, 40), 0, 3.12, 0);
  put(g, cyl(.52, .56, .1, M.panel, 48), 0, .21, 0);
  const mould = mk(new THREE.CylinderGeometry(.44, .44, .7, 60, 1, true, 1.35, TAU - 1.7), M.steel); mould.position.y = .64; g.add(mould);
  put(g, lathe([[.0, 0], [.5, 0], [.5, .06], [.44, .09], [.0, .09]], M.steelS, 48), 0, .26, 0);
  put(g, cyl(.47, .47, .05, M.dark, 48), 0, .99, 0);
  const pile = new THREE.Group(); pile.position.y = .3; g.add(pile); const st = heap(pile, rng, 46, .34, .02, .095, .42);
  const ram = new THREE.Group(); g.add(ram);
  const rod = cyl(.12, .12, 1, M.chrome, 36); ram.add(rod);
  const collar = cyl(.2, .2, .14, M.orange, 40); ram.add(collar); const plunger = new THREE.Group(); ram.add(plunger);
  plunger.add(cyl(.385, .385, .13, M.orange, 48)); put(plunger, cyl(.37, .37, .03, M.steelS, 48), 0, -.075, 0);
  const cam = [[0, 32, 26, 8.6, 0, 1.45, 0, 26], [1.0, 28, 28, 8.0, 0, 1.4, 0, 26], [3.4, 22, 20, 4.9, 0, 1.15, 0, 26], [4.6, 22, 20, 4.9, 0, 1.15, 0, 26], [6.6, 28, 26, 8.2, 0, 1.45, 0, 26], [8, 32, 26, 8.6, 0, 1.45, 0, 26]];
  return {
    group: g, L: 8, cam, ext: 3, blob: [3.8, 2.6],
    update(t) {
      const d = eio(seg(t, 1.0, 3.5)) * (1 - eio(seg(t, 4.7, 6.6))); const yP = lerp(1.78, 1.06, d);
      plunger.position.y = yP; const topY = 2.2; rod.scale.y = topY - yP; rod.position.y = (topY + yP) / 2; collar.position.y = 2.1;
      const hold = sm(seg(t, 3.2, 3.6)) * (1 - sm(seg(t, 4.4, 4.7)));
      pile.scale.y = 1 - .09 * hold * eio(seg(t, 1.8, 3.5)) - .0; const jig = Math.sin(t * 38) * .004 * hold;
      st.forEach(m => { m.position.x = m.userData.b.x + jig * (m.userData.ph - 3); });
    }
  };
}

/* ═════════════ 04 · IMPACT TEST ═════════════ */
function buildImpact() {
  const g = new THREE.Group(), rng = mulberry32(41);
  put(g, mk(rbox(2.1, .16, 1.6, .08, .02), M.dark), 0, .08, 0);
  [[-.9, -.65], [.9, -.65], [-.9, .65], [.9, .65]].forEach(([x, z]) => put(g, cyl(.06, .07, .05, M.rubber, 20), x, .025, z));
  put(g, cyl(.62, .66, .2, M.panel, 56), 0, .26, 0); put(g, cyl(.56, .56, .03, M.steelS, 56), 0, .365, 0);
  put(g, box(.26, 2.7, .2, M.dark), 0, 1.5, -.78); put(g, box(.5, .1, .4, M.dark), 0, .21, -.78); put(g, box(.34, .09, .24, M.orange), 0, 2.88, -.78);
  const cup = lathe([[.0, 0], [.3, 0], [.38, .05], [.66, .56], [.7, .6], [.69, .62], [.64, .58], [.36, .11], [.0, .08]], M.steel, 64); put(g, cup, 0, .38, 0);
  const pile = new THREE.Group(); pile.position.y = .38; g.add(pile); const st = heap(pile, rng, 34, .34, .08, .092, .2);
  const ham = new THREE.Group(); g.add(ham);
  put(ham, cyl(.46, .46, .3, M.black, 56), 0, .62, 0); put(ham, cyl(.475, .475, .07, M.orange, 56), 0, .5, 0); put(ham, cyl(.4, .4, .06, M.steelS, 56), 0, .8, 0);
  put(ham, cyl(.085, .085, .9, M.chrome, 28), 0, .02, 0); put(ham, cyl(.34, .34, .3, M.steelS, 56), 0, -.46, 0);
  put(ham, cyl(.345, .345, .035, M.dark, 56), 0, -.52, 0);
  put(ham, box(.18, .16, .86, M.steelS), 0, .62, -.4); put(ham, box(.32, .24, .26, M.orange), 0, .62, -.78);
  const cam = [[0, 30, 22, 8.4, 0, 1.5, -.05, 26], [1.0, 24, 22, 7.6, 0, 1.45, 0, 26], [2.6, 20, 27, 5.6, 0, 1.05, 0, 26], [6.4, 20, 27, 5.6, 0, 1.05, 0, 26], [8, 30, 22, 8.4, 0, 1.5, -.05, 26]];
  return {
    group: g, L: 8, cam, ext: 3, blob: [3.4, 2.6],
    update(t) {
      /* three controlled drops from a raised position, then back to rest. [time, height, ease] */
      const K = [[0, 1.7, 0], [1.0, 1.7, 0], [2.0, 2.1, 1], [2.3, 1.2, 2], [2.8, 1.2, 0], [3.8, 2.1, 1], [4.1, 1.2, 2], [4.6, 1.2, 0], [5.4, 2.1, 1], [5.7, 1.2, 2], [6.3, 1.2, 0], [7.4, 1.7, 1], [8, 1.7, 0]];
      let y = 1.7; for (let i = 0; i < K.length - 1; i++) { const a = K[i], b = K[i + 1]; if (t >= a[0] && t <= b[0]) { const k = seg(t, a[0], b[0]); y = lerp(a[1], b[1], b[2] === 2 ? k * k : b[2] === 1 ? eio(k) : k); break; } }
      let amp = 0; [2.3, 4.1, 5.7].forEach(e => { const d = t - e; if (d > 0 && d < 1.2) { amp = Math.max(amp, Math.exp(-d * 4.5)); y += .05 * Math.exp(-d * 9) * Math.abs(Math.sin(d * 16)); } });
      ham.position.y = y;
      st.forEach(m => { const u = m.userData; m.position.y = u.b.y + amp * .05 * (.55 + .45 * Math.sin(u.ph * 3)) * Math.abs(Math.sin(t * 30 + u.ph)); m.rotation.z += amp * .012 * Math.sin(u.ph); });
    }
  };
}

/* ═════════════ 05 · LOS ANGELES ABRASION DRUM ═════════════ */
function buildDrum() {
  const g = new THREE.Group(), rng = mulberry32(51); const R = .86, LEN = 1.4, CY = 1.28;
  put(g, mk(rbox(3.7, .14, 1.55, .07, .02), M.black), .35, .07, 0);
  [[-1.3, -.6], [2.0, -.6], [-1.3, .6], [2.0, .6]].forEach(([x, z]) => put(g, cyl(.06, .07, .05, M.rubber, 20), x, .025, z));
  [-.5, .5].forEach(x => {
    const s = new THREE.Shape(); s.moveTo(-.82, 0); s.lineTo(.82, 0); s.lineTo(.62, .62); s.lineTo(.34, .72); s.absarc(0, CY - .14, R + .05, -Math.PI * .27, Math.PI * 1.27, true); s.lineTo(-.62, .62); s.lineTo(-.82, 0);
    const sp = new THREE.Shape(); sp.moveTo(-.82, 0); sp.lineTo(.82, 0); sp.lineTo(.5, .64); sp.lineTo(.0, .55); sp.lineTo(-.5, .64); sp.lineTo(-.82, 0);
    const geo = new THREE.ExtrudeGeometry(sp, { depth: .1, bevelEnabled: true, bevelThickness: .015, bevelSize: .015, bevelSegments: 2 }); geo.translate(0, 0, -.05);
    const saddle = mk(geo, M.dark); saddle.rotation.y = Math.PI / 2; saddle.position.set(x, .14, 0); g.add(saddle);
  });
  const drum = new THREE.Group(); drum.position.set(0, CY, 0); g.add(drum);
  const body = mk(new THREE.CylinderGeometry(R, R, LEN, 72, 1, true), M.dark); body.material = M.dark.clone(); body.material.side = THREE.DoubleSide; body.rotation.z = Math.PI / 2; drum.add(body);
  [-LEN / 2, LEN / 2].forEach((x, i) => { const tor = mk(new THREE.TorusGeometry(R + .005, .05, 20, 96), i ? M.dark : M.orange); tor.rotation.y = Math.PI / 2; tor.position.x = x; drum.add(tor); });
  [-.3, .3].forEach(x => { const tor = mk(new THREE.TorusGeometry(R + .004, .018, 12, 96), M.steelS); tor.rotation.y = Math.PI / 2; tor.position.x = x; drum.add(tor); });
  const hatch = box(.5, .03, .32, M.steelS); put(drum, hatch, 0, R + .01, 0); [-.18, .18].forEach(x => [-.1, .1].forEach(z => put(drum, cyl(.016, .016, .02, M.chrome, 12), x, R + .03, z)));
  put(drum, mk(new THREE.CircleGeometry(R - .02, 72), M.panel), LEN / 2 - .01, 0, 0, 0, Math.PI / 2, 0);
  const glass = mk(new THREE.CircleGeometry(R - .02, 72), M.glass, { cast: false }); glass.rotation.y = -Math.PI / 2; glass.position.x = -LEN / 2 + .02; glass.renderOrder = 4; drum.add(glass);
  const bolts = 12; for (let i = 0; i < bolts; i++) { const a = i / bolts * TAU; const b = cyl(.022, .022, .03, M.chrome, 12); b.rotation.z = Math.PI / 2; b.position.set(-LEN / 2 - .02, Math.cos(a) * (R - .02), Math.sin(a) * (R - .02)); drum.add(b); }
  /* shelf: radial steel plate along the drum, collides via three pegs */
  const SH = .28, shelfA = 0;
  const shelf = box(LEN - .06, SH, .035, M.steelS); drum.add(shelf);
  shelf.position.set(0, (R - .03 - SH / 2), 0); const ShelfG = shelf;
  /* motor */
  put(g, cyl(.14, .14, .5, M.steelS, 30), 1.0, CY, 0, 0, 0, Math.PI / 2);
  put(g, box(.5, .6, .8, M.dark), 1.45, .44, 0); put(g, cyl(.5, .5, 1.05, M.dark, 48), 1.62, CY - .05, 0, 0, 0, Math.PI / 2);
  for (let i = 0; i < 9; i++) put(g, mk(new THREE.TorusGeometry(.505, .018, 8, 64), M.steelS), 1.18 + i * .1, CY - .05, 0, 0, Math.PI / 2, 0);
  put(g, cyl(.52, .52, .06, M.orange, 48), 1.12, CY - .05, 0, 0, 0, Math.PI / 2); put(g, cyl(.35, .35, .12, M.black, 40), 2.2, CY - .05, 0, 0, 0, Math.PI / 2);
  put(g, box(.34, .22, .5, M.black), 1.62, CY + .55, 0); put(g, box(.2, .04, .3, M.orange), 1.62, CY + .68, 0);
  /* particles: stones + steel charge balls, simulated in the drum's cross-section (y/z) */
  const parts = []; const Rin = R - .04;
  const N = 40, NB = 7;
  for (let i = 0; i < N + NB; i++) {
    const ball = i >= N; const r = ball ? .085 : .07 + rng() * .045;
    const m = ball ? mk(new THREE.SphereGeometry(r, 24, 16), M.ball) : stone(rng, r * 1.05);
    const x = (rng() - .5) * (LEN - .35); const a = Math.PI * (.3 + rng() * .4) + Math.PI / 2 * 0;
    const p = { m, r, x, y: -Rin + r + rng() * .3, z: (rng() - .5) * 1.0, vy: 0, vz: 0, rx: rng() * TAU, rz: rng() * TAU, ball };
    parts.push(p); g.add(m);
  }
  const state = { th: 0, w: 0 };
  const GR = 7.0;
  function step(dt) {
    const w = state.w; const th = state.th;
    for (const p of parts) { p.vy -= GR * dt; p.y += p.vy * dt; p.z += p.vz * dt; }
    /* shelf pegs (rotating with the drum) */
    const pegs = [Rin - .03, Rin - .12, Rin - .21].map(rr => [rr, .05]);
    for (const p of parts) {
      for (const [rr, pr] of pegs) {
        const px = Math.sin(th) * -rr * 0 + (-Math.sin(th)) * 0; /* placeholder to keep structure clear */
        const ang = th; const py = Math.cos(ang) * rr, pz = Math.sin(ang) * rr; /* shelf radial points */
        const dy = p.y - py, dz = p.z - pz, d = Math.hypot(dy, dz), md = p.r + pr;
        if (d < md && d > 1e-5) { const ny = dy / d, nz = dz / d, pen = md - d; p.y += ny * pen; p.z += nz * pen; const pvy = -pz * w, pvz = py * w; const rvy = p.vy - pvy, rvz = p.vz - pvz, vn = rvy * ny + rvz * nz; if (vn < 0) { p.vy -= (1.2) * vn * ny; p.vz -= (1.2) * vn * nz; } }
      }
    }
    for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
      const a = parts[i], b = parts[j]; const dy = b.y - a.y, dz = b.z - a.z, d2 = dy * dy + dz * dz, md = a.r + b.r; if (d2 < md * md && d2 > 1e-8) { const d = Math.sqrt(d2), ny = dy / d, nz = dz / d, pen = (md - d) * .5; a.y -= ny * pen; a.z -= nz * pen; b.y += ny * pen; b.z += nz * pen; const rv = (b.vy - a.vy) * ny + (b.vz - a.vz) * nz; if (rv < 0) { const j2 = rv * .55; a.vy += j2 * ny; a.vz += j2 * nz; b.vy -= j2 * ny; b.vz -= j2 * nz; } }
    }
    for (const p of parts) {
      const d = Math.hypot(p.y, p.z), lim = Rin - p.r;
      if (d > lim) {
        const ny = p.y / d, nz = p.z / d; p.y = ny * lim; p.z = nz * lim;
        const vn = p.vy * ny + p.vz * nz; if (vn > 0) { p.vy -= (1.25) * vn * ny; p.vz -= (1.25) * vn * nz; }
        const wy = -p.z * w * (Rin / d) * 0 + (-nz * Rin * w), wz = ny * Rin * w; /* wall tangential velocity (rotation about x) */
        const ty = -nz, tz = ny; const vt = p.vy * ty + p.vz * tz, vw = wy * ty + wz * tz; const f = clamp(dt * 9, 0, 1) * (p.ball ? .7 : 1); const dv = (vw - vt) * f; p.vy += ty * dv; p.vz += tz * dv;
      }
    }
  }
  function sync(dt) {
    for (const p of parts) { p.m.position.set(p.x, CY + p.y, p.z); p.rx += p.vz * dt * 2.2 / p.r * .4; p.rz -= p.vy * dt * 2.2 / p.r * .4; if (!p.ball) p.m.rotation.set(p.rx, p.m.rotation.y, p.rz); }
  }
  for (let i = 0; i < 160; i++) step(1 / 120);
  sync(0);
  const cam = [[0, -52, 19, 8.6, .35, 1.25, 0, 26], [1.2, -50, 18, 8.4, .25, 1.25, 0, 26], [3.0, -40, 15, 6.6, -.1, 1.25, 0, 26], [6.0, -40, 15, 6.6, -.1, 1.25, 0, 26], [8.2, -52, 19, 8.6, .35, 1.25, 0, 26], [9.2, -52, 19, 8.6, .35, 1.25, 0, 26]];
  return {
    group: g, L: 9.2, cam, ext: 3.4, blob: [5.2, 2.6], blobAt: [.35, 0],
    update(t, dt) {
      const W0 = 1.55; const w = W0 * sm(seg(t, 1.0, 2.6)) * (1 - sm(seg(t, 6.3, 7.8)));
      state.w = w; state.th += w * dt; drum.rotation.x = state.th;
      /* particles are driven in the drum frame; pegs & walls use th */
      const sub = 3, h = Math.min(dt, 1 / 30) / sub; for (let i = 0; i < sub; i++) step(h);
      sync(dt); ShelfG.rotation.set(0, 0, 0);
    }
  };
}

/* ═════════════ 06 · BALANCE & BATH ═════════════ */
function buildBath() {
  const g = new THREE.Group(), rng = mulberry32(61);
  put(g, mk(rbox(3.9, .1, 1.3, .06, .02), M.dark), 0, .05, 0); [[-1.8, -.5], [1.8, -.5], [-1.8, .5], [1.8, .5]].forEach(([x, z]) => put(g, cyl(.05, .06, .04, M.rubber, 16), x, .02, z));
  /* balance */
  const bal = new THREE.Group(); bal.position.set(-1.35, .1, .05); g.add(bal);
  put(bal, mk(rbox(1.15, .36, .86, .1, .02), M.white), 0, .18, 0); put(bal, box(1.0, .04, .76, M.steelS), 0, .38, 0);
  put(bal, cyl(.3, .3, .03, M.steelS, 48), .0, .415, 0); put(bal, cyl(.31, .31, .012, M.dark, 48), 0, .395, 0);
  put(bal, mk(rbox(.86, .2, .04, .04, .01), M.black), 0, .2, .44);
  const disp = canvasTex(256, 96, (x, w, h) => { x.fillStyle = '#071a17'; x.fillRect(0, 0, w, h); x.fillStyle = '#5ff0c2'; x.font = '700 52px "Courier New", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('0.00 g', w / 2, h / 2 + 2); }, true);
  put(bal, mk(new THREE.PlaneGeometry(.38, .14), new THREE.MeshStandardMaterial({ map: disp, emissiveMap: disp, emissive: 0xffffff, emissiveIntensity: .8, roughness: .3 }), { cast: false }), -.12, .22, .465);
  put(bal, cyl(.04, .04, .03, M.orange, 24), .22, .26, .47, Math.PI / 2); put(bal, cyl(.04, .04, .03, M.steelS, 24), .34, .26, .47, Math.PI / 2); put(bal, cyl(.04, .04, .03, M.steelS, 24), .22, .14, .47, Math.PI / 2);
  /* frame */
  [-.45, 1.75].forEach(x => { put(g, cyl(.045, .045, 2.4, M.steelS, 24), x, 1.3, -.15); put(g, cyl(.09, .09, .06, M.dark, 24), x, .13, -.15); });
  put(g, cyl(.034, .034, 2.3, M.steelS, 20), .65, 2.4, -.15, 0, 0, Math.PI / 2);
  put(g, cyl(.06, .06, .08, M.orange, 24), -.45, 2.54, -.15); put(g, cyl(.06, .06, .08, M.orange, 24), 1.75, 2.54, -.15);
  put(g, box(.2, .22, .2, M.dark), .65, 2.4, -.15); put(g, cyl(.05, .05, .16, M.orange, 24), .65, 2.58, -.15);
  /* tank */
  const tank = new THREE.Group(); tank.position.set(.65, .1, .05); g.add(tank);
  const TW = 1.4, TD = .9, TH = .95;
  put(tank, mk(rbox(TW, .04, TD, .02, .005), M.steelS), 0, .02, 0);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => put(tank, box(.04, TH, .04, M.steelS), sx * TW / 2, TH / 2, sz * TD / 2));
  [0, 1].forEach(i => { put(tank, box(TW, .04, .04, M.steelS), 0, TH - .02, (i ? 1 : -1) * TD / 2); put(tank, box(.04, .04, TD, M.steelS), (i ? 1 : -1) * TW / 2, TH - .02, 0); });
  put(tank, mk(new THREE.BoxGeometry(TW, TH, TD), M.glass, { cast: false }), 0, TH / 2, 0).renderOrder = 5;
  const WH = .74; put(tank, mk(new THREE.BoxGeometry(TW - .04, WH, TD - .04), M.water, { cast: false }), 0, WH / 2 + .03, 0).renderOrder = 3;
  const surf = mk(new THREE.PlaneGeometry(TW - .045, TD - .045, 48, 30).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0xcdeaf6, roughness: .02, metalness: 0, transparent: true, opacity: .45, envMapIntensity: 1.7, depthWrite: false }), { cast: false }); surf.position.y = WH + .03; surf.renderOrder = 6; tank.add(surf);
  const sp = surf.geometry.attributes.position; const base = sp.array.slice();
  /* basket on a wire */
  const bk = new THREE.Group(); tank.add(bk); const bkParts = new THREE.Group(); bk.add(bkParts);
  const bkGeo = new THREE.LatheGeometry([[.0, 0], [.2, 0], [.218, .02], [.218, .3], [.232, .31], [.232, .325], [.21, .325]].map(p => new V2(p[0], p[1])), 40);
  const bkMat = new THREE.MeshStandardMaterial({ color: 0xdadde0, metalness: 1, roughness: .35, alphaMap: gridTex(), alphaTest: .4, side: THREE.DoubleSide }); bkMat.alphaMap = bkMat.alphaMap.clone(); bkMat.alphaMap.repeat.set(26, 5); bkMat.alphaMap.needsUpdate = true;
  bkParts.add(mk(bkGeo, bkMat)); put(bkParts, mk(new THREE.CircleGeometry(.2, 32), bkMat, { cast: false }), 0, .015, 0, -Math.PI / 2);
  put(bkParts, mk(new THREE.TorusGeometry(.225, .012, 8, 48), M.steelS), 0, .32, 0, Math.PI / 2);
  const bail = mk(new THREE.TorusGeometry(.225, .008, 8, 40, Math.PI), M.steelS); bail.position.y = .32; bkParts.add(bail);
  const rock = stone(rng, .13); rock.position.set(0, .15, 0); bkParts.add(rock);
  const wire = cyl(.006, .006, 1, M.chrome, 8); tank.add(wire);
  const bubbles = []; const bm = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0, transparent: true, opacity: .5, envMapIntensity: 2, depthWrite: false });
  for (let i = 0; i < 16; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(.014 + rng() * .014, 10, 8), bm); b.userData = { a: rng() * TAU, r: rng() * .17, o: rng(), s: .12 + rng() * .1 }; tank.add(b); bubbles.push(b); b.visible = false; }
  const cam = [[0, 28, 17, 7.6, .1, 1.2, 0, 26], [1.0, 24, 18, 8.4, .5, 1.3, 0, 26], [3.4, 16, 14, 5.8, .65, .85, .05, 26], [6.0, 16, 14, 5.8, .65, .85, .05, 26], [7.4, 28, 17, 7.6, .1, 1.2, 0, 26], [8.4, 28, 17, 7.6, .1, 1.2, 0, 26]];
  let impactT = -9;
  return {
    group: g, L: 8.4, cam, ext: 3.4, blob: [4.8, 2.4],
    update(t) {
      const down = eio(seg(t, 1.0, 3.4)) * (1 - eio(seg(t, 5.4, 7.2)));
      const yB = lerp(1.35, .22, down); bk.position.set(0, yB, 0);
      const topY = 2.28; wire.scale.y = topY - (yB + .55); wire.position.y = (topY + yB + .55) / 2; if (wire.scale.y < .01) wire.scale.y = .01;
      bkParts.rotation.y = Math.sin(t * 1.3) * .05 * (1 - down * .6);
      /* ripples start when the basket meets the surface (and again as it leaves) */
      const hitY = WH + .03; const dtr = t - 2.2, dtr2 = t - 6.3;
            const rip = (T) => (T > 0 && T < 3.2) ? Math.exp(-T * 1.4) : 0;
      const a1 = rip(dtr), a2 = rip(dtr2) * .5;
      for (let i = 0; i < sp.count; i++) {
        const x = base[i * 3], z = base[i * 3 + 2], r = Math.hypot(x, z); let y = 0;
        if (a1 > 0) y += Math.sin(r * 22 - dtr * 9) * a1 * .018 * Math.exp(-r * 1.4);
        if (a2 > 0) y += Math.sin(r * 22 - dtr2 * 9) * a2 * .018 * Math.exp(-r * 1.4);
        sp.setY(i, y);
      }
      sp.needsUpdate = true; surf.geometry.computeVertexNormals();
      const bub = sm(seg(t, 2.1, 3.0)) * (1 - sm(seg(t, 5.2, 5.9)));
      bubbles.forEach(b => { const u = b.userData; const k = ((t * u.s * 1.3 + u.o) % 1); b.visible = bub > .02 && yB < hitY; b.position.set(Math.cos(u.a + t * .4) * u.r * (1 - k * .5), lerp(.25, WH, k) + 0.03, Math.sin(u.a + t * .4) * u.r * (1 - k * .5)); b.scale.setScalar(bub); });
    }
  };
}

/* ═════════════ 07 · SAMPLE INSPECTION ═════════════ */
function buildSample() {
  const g = new THREE.Group(), rng = mulberry32(71);
  const tray = new THREE.Group(); g.add(tray);
  const TH = .32; tray.add(mk(frustum(2.0, 1.12, 2.5, 1.52, TH), M.steel));
  const rimS = new THREE.Shape(); rrPath(rimS, -1.27, -.77, 2.54, 1.54, .1); const hole = new THREE.Path(); rrPath(hole, -1.2, -.7, 2.4, 1.4, .08); rimS.holes.push(hole);
  const rim = mk(new THREE.ExtrudeGeometry(rimS, { depth: .03, bevelEnabled: true, bevelThickness: .012, bevelSize: .012, bevelSegments: 2, curveSegments: 8 }), M.steelS); rim.rotation.x = -Math.PI / 2; rim.position.y = TH - .005; tray.add(rim);
  const rocks = new THREE.Group(); rocks.position.y = .02; g.add(rocks);
  const hero = new V3(-.45, .2, -.1); const big = stone(rng, .27, 1.1, 1, 1); big.position.copy(hero).setY(.2); rocks.add(big);
  const hero2 = new V3(.72, .2, -.08); const big2 = stone(rng, .24, 1.0, 1.05, 1); big2.position.copy(hero2).setY(.2); rocks.add(big2);
  const hs = heap(rocks, rng, 34, .85, 0, .15, .06); hs.forEach(m => { [hero, hero2].forEach(h => { const dx = m.position.x - h.x, dz = m.position.z - h.z, d = Math.hypot(dx, dz); if (d < .4) { m.position.x = h.x + dx / (d || 1) * .42; m.position.z = h.z + dz / (d || 1) * .42; } }); m.userData.b.copy(m.position); });
  /* magnifier */
  const mag = new THREE.Group(); g.add(mag); const inner = new THREE.Group(); mag.add(inner);
  const LR = .46;
  const ring = mk(new THREE.TorusGeometry(LR, .035, 20, 72), M.dark); inner.add(ring); const ring2 = mk(new THREE.TorusGeometry(LR - .035, .011, 12, 72), M.orange); inner.add(ring2);
  const rt = new THREE.WebGLRenderTarget(512, 512, { samples: 0 }); const lensMat = new THREE.MeshBasicMaterial({ map: rt.texture, toneMapped: true });
  const lens = new THREE.Mesh(new THREE.CircleGeometry(LR - .02, 64), lensMat); lens.position.z = -.002; inner.add(lens);
  const gloss = new THREE.Mesh(new THREE.CircleGeometry(LR - .02, 64), M.glass); gloss.position.z = .004; gloss.renderOrder = 7; inner.add(gloss);
  const ov = canvasTex(256, 256, (x, w, h) => { x.strokeStyle = '#ff5e29'; x.lineWidth = 7; x.lineCap = 'round'; const m = 40, l = 46; [[m, m, 1, 1], [w - m, m, -1, 1], [m, h - m, 1, -1], [w - m, h - m, -1, -1]].forEach(([cx, cy, sx, sy]) => { x.beginPath(); x.moveTo(cx + sx * l, cy); x.lineTo(cx, cy); x.lineTo(cx, cy + sy * l); x.stroke(); }); }, true);
  const ovM = new THREE.MeshBasicMaterial({ map: ov, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }); const ovMesh = new THREE.Mesh(new THREE.CircleGeometry(LR - .04, 48), ovM); ovMesh.position.z = .003; ovMesh.renderOrder = 8; inner.add(ovMesh);
  put(inner, cyl(.045, .06, .95, M.black, 24), LR + .55, 0, 0, 0, 0, Math.PI / 2); put(inner, cyl(.065, .065, .12, M.orange, 24), LR + .06, 0, 0, 0, 0, Math.PI / 2);
  put(inner, cyl(.065, .07, .25, M.steelS, 24), LR + 1.05, 0, 0, 0, 0, Math.PI / 2);
  inner.rotation.z = -.62;
  const rtCam = new THREE.PerspectiveCamera(10, 1, .1, 60);
  const cam = [[0, 22, 31, 6.3, 0, .3, 0, 26], [1.0, 20, 30, 7.2, -.1, .38, 0, 26], [3.3, 14, 24, 4.3, -.25, .5, -.05, 26], [5.6, 14, 24, 4.3, -.25, .5, -.05, 26], [7.4, 22, 31, 6.3, 0, .3, 0, 26], [8.6, 22, 31, 6.3, 0, .3, 0, 26]];
  const workDir = new V3(); let lastCam = null;
  return {
    group: g, L: 8.6, cam, ext: 2.8, blob: [3.9, 2.6],
    update(t, dt, camera) {
      const cp = camera ? camera.position : new V3(2, 3, 4);
      const w = eio(seg(t, 1.0, 3.2)) * (1 - eio(seg(t, 6.0, 7.8)));
      workDir.copy(cp).sub(hero).normalize(); const work = new V3().copy(hero).addScaledVector(workDir, 1.15);
      const restP = new V3().copy(cp).sub(hero2).normalize().multiplyScalar(1.25).add(hero2); mag.position.lerpVectors(restP, work, w); mag.position.y += Math.sin(w * Math.PI) * .12;
      mag.lookAt(cp); mag.position.x += 0;
      ovM.opacity = sm(seg(t, 3.5, 4.4)) * (1 - sm(seg(t, 5.0, 5.8))) * .95;
      lastCam = camera;
    },
    rt, rtCam,
    preRender(R, camera, scene) {
      const dir = new V3().copy(mag.position).sub(camera.position); const dist = dir.length(); dir.normalize();
      const look = new V3().copy(mag.position).addScaledVector(dir, 1.15); rtCam.position.copy(camera.position); rtCam.lookAt(look);
      const half = Math.atan((LR) / dist); rtCam.fov = (half * 2 * 180 / Math.PI) / 2.7; rtCam.aspect = 1; rtCam.updateProjectionMatrix();
      mag.visible = false; const cc = new THREE.Color(); R.getClearColor(cc); const ca = R.getClearAlpha(); R.setClearColor(0xf1ece2, 1);
      R.setRenderTarget(rt); R.render(scene, rtCam); R.setRenderTarget(null); R.setClearColor(cc, ca); mag.visible = true;
    }
  };
}

const BUILD = { sieve: buildSieve, shape: buildShape, crush: buildCrush, impact: buildImpact, abrasion: buildDrum, sg: buildBath, sample: buildSample };

/* ═════════════ runtime ═════════════ */
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(hover: none)').matches;
let R = null, ready = false, lostCtx = false, shared = false; const cards = [];
function initRenderer() {
  const sh = window.__omShared;
  if (sh && sh.R && !sh.R.getContext().isContextLost()) {                   /* the page already has a renderer (the 3D figures): share it */
    R = sh.R; ENV = sh.ENV; shared = true; R.domElement.addEventListener('webglcontextlost', () => { lostCtx = true; cards.forEach(c => c.el.classList.remove('l3-on')); });
    R.domElement.addEventListener('webglcontextrestored', () => { lostCtx = false; cards.forEach(c => { c.dirty = true; c.drawn = false; }); wake(); }); return;
  }
  const cv = document.createElement('canvas');
  R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance', premultipliedAlpha: true });
  R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.02;
  R.debug.checkShaderErrors = false; R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap; R.setClearColor(0x000000, 0);
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); lostCtx = true; cards.forEach(c => c.el.classList.remove('l3-on')); });
  ENV = makeEnv(R);
}
class Card {
  constructor(el, key) { this.el = el; this.key = key; this.cv = el.querySelector('canvas.l3-cv'); this.ctx = this.cv.getContext('2d'); this.t = 0; this.running = false; this.vis = false; this.hover = false; this.dirty = true; this.rig = null; this.scene = null; this.cam = new THREE.PerspectiveCamera(26, 1.25, .1, 80); this.w = 0; this.h = 0; this.fail = false; this.drawn = false; }
  get selected() { return this.el.getAttribute('aria-pressed') === 'true'; }
  build() {
    if (this.rig || this.fail) return;
    try { this.rig = BUILD[this.key](); this.scene = stage(R, this.rig); this.rig.update(0, 0, this.cam); this.dirty = true; } catch (e) { console.warn('lab3d', this.key, e); this.fail = true; }
  }
  size() { const r = { width: this.cv.clientWidth, height: this.cv.clientHeight }; const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2) * (this.q || 1); const w = Math.max(2, Math.round(r.width * dpr)), h = Math.max(2, Math.round(r.height * dpr)); if (w !== this.cv.width || h !== this.cv.height) { this.cv.width = w; this.cv.height = h; this.dirty = true; } this.w = w; this.h = h; }
  render() {
    if (!this.rig) return; const dom = R.domElement; if (dom.width < this.w || dom.height < this.h) R.setSize(Math.max(dom.width, this.w), Math.max(dom.height, this.h), false); R.setViewport(0, 0, this.w, this.h); R.toneMappingExposure = 1.02;   /* one drawing buffer that only grows, shared with the 3D figures */
    camAt(this.rig.cam, this.t, this.cam, this.w / this.h);
    this.rig.update(this.t, this._dt || 0, this.cam);
    camAt(this.rig.cam, this.t, this.cam, this.w / this.h);
    if (this.rig.preRender) this.rig.preRender(R, this.cam, this.scene);
    R.render(this.scene, this.cam);
    this.ctx.clearRect(0, 0, this.w, this.h); this.ctx.drawImage(dom, 0, dom.height - this.h, this.w, this.h, 0, 0, this.w, this.h);
    if (!this.drawn) { this.drawn = true; this.el.classList.add('l3-on'); }
  }
}
let raf = 0, last = 0, slow = 0;
function compileCard(c) {
  if (c.compiling) return; c.compiling = true;
  (async () => { try { await R.compileAsync(c.scene, c.cam); await compileShadows(R, c.scene, c.cam); if (c.rig.rt) { R.setRenderTarget(c.rig.rt); const pr = R.compileAsync(c.scene, c.rig.rtCam); R.setRenderTarget(null); await pr; } } catch (e) { R.setRenderTarget(null); } c.ready = true; c.dirty = true; wake(); })();
}
function wake() { if (!raf && !document.hidden && R && !lostCtx) { last = performance.now(); raf = requestAnimationFrame(loop); } }
function loop(now) {
  raf = 0; const dt = Math.min(.05, (now - last) / 1000); last = now; let busy = false;
  for (const c of cards) {
    if (!c.vis || c.fail) continue;
    if (!c.rig) { c.build(); busy = true; if (!c.rig) continue; }
    if (!c.ready) { compileCard(c); continue; }                 /* its shaders are still compiling: drawing now would link them on the main thread (a 1-3 s freeze) */
    const want = !reduce && (c.selected || (c.hover && !coarse)); c.size();
    if (want) c.running = true;
    if (c.running) {
      const sp = want ? 1 : 2.5; c._dt = dt * sp; c.t += dt * sp; if (c.t >= c.rig.L) { c.t -= c.rig.L; if (!want) { c.t = 0; c.running = false; c.dirty = true; } }
      const a = performance.now(); c.render(); const ms = performance.now() - a; if (ms > 26) slow++; else slow = Math.max(0, slow - .05); if (slow > 25 && !c.q) { cards.forEach(k => k.q = .7); slow = 0; }
      busy = true;
    } else if (c.dirty) { c._dt = 0; c.render(); c.dirty = false; busy = true; }
  }
  if (busy || cards.some(c => c.vis && c.running)) raf = requestAnimationFrame(loop);
}
/* pre-compile the shadow-pass (depth) programs too: renderer.compileAsync only covers the visible materials, so the first frame of every figure still linked its depth shaders one after another on the main thread (~0.2 s each).
   This builds a proxy scene of depth materials matching the real shadow pass (instancing, instance colour, alpha, side) and a shadow-casting light, and compiles it in parallel. */
export async function compileShadows(R, scene, cam) {
  if (!R.shadowMap.enabled) return;
  const proxy = new THREE.Scene(), seen = new Set(), SS = { 0: 1, 1: 0, 2: 2 };
  const lt = new THREE.DirectionalLight(0xffffff, 1); lt.castShadow = true; proxy.add(lt);
  scene.traverse(o => {
    if (!o.isMesh || o.isSkinnedMesh || !o.castShadow || !o.material) return;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
      const side = m.shadowSide != null ? m.shadowSide : SS[m.side], clip = m.clippingPlanes && m.clipShadows ? m.clippingPlanes.length : 0, ia = !!m.alphaMap, at = m.alphaTest || 0, mp = !!(m.map && at > 0), ic = !!(o.isInstancedMesh && o.instanceColor);
      const key = [o.isInstancedMesh ? 1 : 0, ic ? 1 : 0, side, clip, ia ? 1 : 0, at > 0 ? 1 : 0, mp ? 1 : 0].join(); if (seen.has(key)) return; seen.add(key);
      const dm = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }); dm.side = side; if (ia) dm.alphaMap = m.alphaMap; if (at > 0) dm.alphaTest = at; if (mp) dm.map = m.map; if (clip) { dm.clippingPlanes = m.clippingPlanes; dm.clipShadows = true; }
      let px; if (o.isInstancedMesh) { px = new THREE.InstancedMesh(o.geometry, dm, 1); if (ic) px.setColorAt(0, new THREE.Color()); } else px = new THREE.Mesh(o.geometry, dm);
      px.frustumCulled = false; proxy.add(px);
    });
  });
  try { await R.compileAsync(proxy, cam); } catch (e) {}
  proxy.traverse(o => { if (o.material) o.material.dispose(); });
}
/* On Windows (ANGLE / Direct3D) a program is only finished at its first DRAW, even after compileAsync has reported it ready, so a first draw of a whole scene froze the page for 1-2 s. This draws the scene a few
   meshes at a time (those with a material not seen yet), one batch per ~50 ms, so each batch is a short hitch instead of one long one. It draws into a canvas that is not shown yet. Restores visibility afterwards. */
export async function warmProgressive(R, scene, cam, step = 3, gap = 45) {
  const ms = []; scene.traverse(o => { if ((o.isMesh || o.isLine || o.isPoints || o.isSprite) && o.visible) ms.push(o); });
  const was = ms.map(o => o.visible), seen = new Set(), todo = ms.filter(o => { const m = Array.isArray(o.material) ? o.material[0] : o.material; const k = (m ? m.uuid : '') + (o.isInstancedMesh ? 'i' : '') + (o.geometry && o.geometry.attributes && o.geometry.attributes.color ? 'c' : ''); if (seen.has(k)) return false; seen.add(k); return true; });
  try { for (let i = 0; i < todo.length; i += step) { const on = new Set(todo.slice(i, i + step)); ms.forEach(o => { o.visible = on.has(o); }); R.render(scene, cam); await new Promise(r => setTimeout(r, gap)); } } finally { ms.forEach((o, i) => { o.visible = was[i]; }); }
}
let started = false;
export function init(root) {
  if (started) return; started = true;
  /* on a page that also has the 3D figures, wait for their renderer and share it (a second renderer re-compiles every shader, ~3 s) */
  if (!window.__omShared && document.querySelector('.s3d-box[data-s3d]')) { let n = 0; const t = setInterval(() => { if (window.__omShared || ++n > 15) { clearInterval(t); start(root); } }, 200); return; }
  start(root);
}
function start(root) {
  if (ready) return; ready = true;
  try { initRenderer(); } catch (e) { console.warn('lab3d: no WebGL', e); return false; }
  const els = [...root.querySelectorAll('.ap20-st[data-st]')];
  const io = new IntersectionObserver(es => { es.forEach(e => { const c = e.target._l3; c.vis = e.isIntersecting; if (c.vis) { c.dirty = true; } }); wake(); }, { rootMargin: '120px 0px' });
  els.forEach(el => {
    const key = el.getAttribute('data-st'); if (!BUILD[key] || !el.querySelector('canvas.l3-cv')) return;
    const c = new Card(el, key); el._l3 = c; cards.push(c); io.observe(el);
    el.addEventListener('pointerenter', () => { c.hover = true; wake(); }); el.addEventListener('pointerleave', () => { c.hover = false; wake(); });
    el.addEventListener('focus', () => { c.hover = true; wake(); }); el.addEventListener('blur', () => { c.hover = false; wake(); });
    new MutationObserver(() => { c.dirty = true; wake(); }).observe(el, { attributes: true, attributeFilter: ['aria-pressed'] });
  });
  new ResizeObserver(() => { cards.forEach(c => { c.dirty = true; }); wake(); }).observe(root);
  /* warm-up: build each card and compile its shaders off the main thread, one at a time while the page is idle, so the first time a card scrolls into view nothing has to link (that froze the page for ~3 s) */
  (async () => { const idle = () => new Promise(r => (window.requestIdleCallback ? requestIdleCallback(() => r(), { timeout: 600 }) : setTimeout(r, 60))); for (const c of cards) { await idle(); if (c.rig || c.fail) continue; c.build(); if (c.rig) { compileCard(c); while (!c.ready) await new Promise(r => setTimeout(r, 40)); }   /* a card that also draws into a render target (the magnifier lens) uses a second set of programs */ } })();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
  window.__omLab = { cards, THREE, poster(key, w, h, t) { const c = cards.find(k => k.key === key); c.build(); R.setSize(w, h, false); c.w = w; c.h = h; c.t = t || 0; c._dt = 0; camAt(c.rig.cam, c.t, c.cam, w / h); c.rig.update(c.t, 0, c.cam); camAt(c.rig.cam, c.t, c.cam, w / h); if (c.rig.preRender) c.rig.preRender(R, c.cam, c.scene); R.render(c.scene, c.cam); return R.domElement.toDataURL('image/png'); } };
  wake(); return true;
}

/* shared building blocks for the other 3D figures (e.g. the concrete placement scene) */
export { M, STONES, stone, heap, rbox, mk, put, cyl, lathe, box, helix, canvasTex, mulberry32, makeEnv, clamp, sm, eio, seg, lerp, TAU };
