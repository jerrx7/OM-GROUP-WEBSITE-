/* OM GROUP — large concrete placement: an engineering cross-section built as a real 3D scene (three.js, procedural models),
   played by a deterministic 16-second timeline so any moment can be shown, scrubbed or captured as a poster.
   Note: not a specific project, not to scale. */
import * as THREE from '/assets/vendor/three/three.module.min.js';
import { M, STONES, stone, rbox, mk, put, cyl, lathe, box, canvasTex, mulberry32, makeEnv, clamp, sm, eio, seg, lerp, TAU, compileShadows, warmProgressive } from '/assets/application-lab3d.js';

const V3 = THREE.Vector3, V2 = THREE.Vector2;
/* reference picture space (1774 x 887 px) -> world units: x centred on the picture, y = 0 at the ground line */
const X = px => (px - 887) / 100, Y = py => (398 - py) / 100;
export const END = 16;
export const STEPS = [[0, 5], [5, 10.5], [10.5, 12], [12, 16]];
const D2R = Math.PI / 180;

/* ───────── clipping planes (mask reveals) ───────── */
const cB = new THREE.Plane(new V3(0, -1, 0), -6);      /* soil, walls, base, layer 1: visible y <= c  */
const cRX = new THREE.Plane(new V3(-1, 0, 0), -8);     /* horizontal bars: visible x <= c            */
const cRY = new THREE.Plane(new V3(0, -1, 0), -6);     /* reinforcement cages: visible y <= c        */
const cMix = new THREE.Plane(new V3(1, 0, 0), 5.9);    /* mixer truck: visible x >= -c               */
const cPmp = new THREE.Plane(new V3(-1, 0, 0), 6.4);   /* pump truck: visible x <= c                 */
const clipMats = new Map();
const planeId = new WeakMap(); let planeN = 0;
function cm(mat, plane) { if (!planeId.has(plane)) planeId.set(plane, ++planeN); const k = mat.uuid + ":" + planeId.get(plane); if (!clipMats.has(k)) { const m = mat.clone(); m.clippingPlanes = [plane]; m.clipShadows = true; clipMats.set(k, m); } return clipMats.get(k); }
function clipTree(obj, plane) { obj.traverse(o => { if (o.isMesh) o.material = Array.isArray(o.material) ? o.material.map(m => cm(m, plane)) : cm(o.material, plane); }); return obj; }

/* ───────── textures ───────── */
function speckTex(base, n, seed, size, tone) {
  return canvasTex(size, size, (x, w, h) => {
    x.fillStyle = base; x.fillRect(0, 0, w, h); const r = mulberry32(seed);
    for (let i = 0; i < 14; i++) { x.fillStyle = r() < .5 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.05)'; x.beginPath(); x.arc(r() * w, r() * h, 30 + r() * 90, 0, TAU); x.fill(); }
    for (let i = 0; i < n; i++) { x.fillStyle = r() < .5 ? 'rgba(0,0,0,' + (tone || .1) + ')' : 'rgba(255,255,255,' + (tone || .09) + ')'; const s = .8 + r() * 2.6; x.fillRect(r() * w, r() * h, s, s); }
  }, true);
}
function soilTex(seed) {
  return canvasTex(1024, 512, (x, w, h) => {
    const r = mulberry32(seed), cols = ['#765236', '#684630', '#85603c', '#5c4029', '#8f6b47', '#745437', '#6a4e38'];
    let y = -10; while (y < h) { const bh = 26 + r() * 64; x.fillStyle = cols[(r() * cols.length) | 0]; x.beginPath(); x.moveTo(0, y); for (let i = 0; i <= 24; i++) x.lineTo(i * w / 24, y + Math.sin(i * .9 + y * .05) * 7 + (r() - .5) * 6); x.lineTo(w, y + bh + 20); x.lineTo(0, y + bh + 20); x.fill(); y += bh; }
    for (let i = 0; i < 14000; i++) { x.fillStyle = r() < .5 ? 'rgba(25,12,0,.13)' : 'rgba(255,225,180,.11)'; const s = .8 + r() * 2.8; x.fillRect(r() * w, r() * h, s, s); }
    const pc = ['#4a4038', '#8c8378', '#b0a89a', '#5b4a3a', '#6e6254'];
    for (let i = 0; i < 380; i++) { x.fillStyle = pc[(r() * pc.length) | 0]; x.beginPath(); x.ellipse(r() * w, r() * h, 2 + r() * 7, 1.5 + r() * 5, r() * 3, 0, TAU); x.fill(); }
    for (let i = 0; i < 24; i++) { x.strokeStyle = 'rgba(30,18,6,.35)'; x.lineWidth = 1 + r() * 1.5; x.beginPath(); const sy = r() * h; x.moveTo(0, sy); for (let k = 1; k <= 12; k++) x.lineTo(k * w / 12, sy + (r() - .5) * 14); x.stroke(); }
  }, true);
}
const TX = {
  soilA: soilTex(5), soilB: soilTex(17), soilC: soilTex(29),
  conc: speckTex('#b9b7b1', 9000, 3, 512), concDark: speckTex('#8d8c88', 11000, 8, 512, .14), matrix: speckTex('#7a7977', 16000, 12, 512, .16),
  fresh: canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = '#9c9d9c'; x.fillRect(0, 0, w, h); const r = mulberry32(44);
    for (let i = 0; i < 26; i++) { x.fillStyle = r() < .5 ? 'rgba(40,40,44,.06)' : 'rgba(255,255,255,.07)'; x.beginPath(); x.ellipse(r() * w, r() * h, 20 + r() * 80, 6 + r() * 26, (r() - .5) * .5, 0, TAU); x.fill(); }
    for (let i = 0; i < 6000; i++) { x.fillStyle = r() < .5 ? 'rgba(0,0,0,.07)' : 'rgba(255,255,255,.07)'; x.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
  }, true),
  rib: canvasTex(64, 64, (x, w, h) => { x.fillStyle = '#808080'; x.fillRect(0, 0, w, h); x.fillStyle = '#d0d0d0'; for (let i = 0; i < 8; i++) x.fillRect(0, i * 8, w, 3); }, false),
};
[TX.soilA, TX.soilB, TX.soilC, TX.conc, TX.concDark, TX.matrix, TX.fresh].forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; });
function logoTex(darkBg) {
  const t = canvasTex(512, 160, (x, w, h) => {
    if (darkBg) { x.fillStyle = '#17181b'; x.fillRect(0, 0, w, h); }
    x.fillStyle = '#ff5e29'; x.font = '800 74px Montserrat, Inter, Arial, sans-serif'; x.textBaseline = 'middle'; x.fillText('', 0, 0);
  }, true);
  const img = new Image(); img.src = '/assets/om-group-logo.png';
  const paint = () => { const c = t.image, x = c.getContext('2d'), w = c.width, h = c.height; x.clearRect(0, 0, w, h); if (darkBg) { x.fillStyle = '#17181b'; x.fillRect(0, 0, w, h); } if (img.complete && img.naturalWidth) x.drawImage(img, 18, 14, 132, 132); x.fillStyle = '#ffffff'; x.font = '800 60px "Montserrat","Inter",Arial,sans-serif'; x.textBaseline = 'middle'; x.fillText('OM GROUP', 156, h / 2 + 4); t.needsUpdate = true; };
  paint(); img.addEventListener('load', paint); t.userData.ready = new Promise(r => { if (img.complete) r(); else { img.addEventListener('load', r); img.addEventListener('error', r); } }); return t;
}

/* ───────── small helpers ───────── */
const mat = (o) => new THREE.MeshStandardMaterial(o);
const phys = (o) => new THREE.MeshPhysicalMaterial(o);
function wheel(r, w) {
  const g = new THREE.Group();
  const prof = [[r * .6, -w / 2], [r * .9, -w / 2], [r * .985, -w * .38], [r, -w * .2], [r, w * .2], [r * .985, w * .38], [r * .9, w / 2], [r * .6, w / 2]].map(p => new V2(p[0], p[1]));
  const tyre = mk(new THREE.LatheGeometry(prof, 44), M.rubber); tyre.rotation.x = Math.PI / 2; g.add(tyre);
  const rim = mk(new THREE.CylinderGeometry(r * .62, r * .62, w * .86, 36), M.steelS); rim.rotation.x = Math.PI / 2; g.add(rim);
  put(g, cyl(r * .3, r * .3, w * .95, M.orange, 28), 0, 0, 0, Math.PI / 2);
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; put(g, cyl(r * .045, r * .045, w * .98, M.chrome, 10), Math.cos(a) * r * .46, Math.sin(a) * r * .46, 0, Math.PI / 2); }
  return g;
}
function ribbed(len, r) {
  const n = Math.max(2, Math.round(len / .075)), pts = [];
  for (let i = 0; i <= n; i++) pts.push(new V2(i % 2 ? r * 1.22 : r, i / n * len));
  const g = new THREE.LatheGeometry(pts, 8); g.rotateZ(-Math.PI / 2); return g;
}
function pulsify(m, u) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uPx = u;
    sh.vertexShader = 'varying vec3 vW;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vW=(modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader = 'varying vec3 vW;uniform float uPx;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n float gg=exp(-pow((vW.x-uPx)*1.1,2.));totalEmissiveRadiance+=vec3(1.,.36,.12)*gg*1.15;');
  }; m.customProgramCacheKey = () => 'pulse'; return m;
}

/* ═════════════ the scene ═════════════ */
export function buildWorld(R) {
  const scene = new THREE.Scene(); scene.environment = makeEnv(R);
  const key = new THREE.DirectionalLight(0xfff1e0, 2.1); key.position.set(-7, 11, 13); key.target.position.set(0, -1.5, 0); scene.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -11, right: 11, top: 7, bottom: -7, near: 1, far: 40 }); key.shadow.bias = -.0005; key.shadow.normalBias = .03;
  const rim = new THREE.DirectionalLight(0xff9a70, .35); rim.position.set(9, 4, -6); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xfff6ea, 0xc9b9a4, .35));
  const W = { scene, key, upd: {}, planes: { cB, cRX, cRY, cMix, cPmp } };

  /* —— soil, pads, walls, base, layer 1 (revealed bottom-up by the cB plane) —— */
  const found = new THREE.Group(); scene.add(found);
  const soilMat = (tex, rx, ry) => { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return cm(mat({ map: t, bumpMap: t, bumpScale: 2.2, roughness: .96 }), cB); };
  const soilDark = cm(mat({ color: 0x3f2a18, roughness: 1 }), cB);
  function soilBlock(x0, x1, y0, y1, tex, seed) {
    const w = x1 - x0, h = y1 - y0, g = new THREE.Group();
    const geo = new THREE.PlaneGeometry(w, h, Math.max(4, Math.round(w * 9)), Math.max(4, Math.round(h * 9))), p = geo.attributes.position, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) + cx, y = p.getY(i) + cy; const n = Math.sin(x * 3.1 + seed) * Math.cos(y * 2.7 + seed * 1.3) * .5 + Math.sin(x * 9.7 + y * 7.1 + seed) * .25; p.setZ(i, n * .08); if (p.getY(i) > h / 2 - .001) p.setY(i, p.getY(i) + Math.sin(x * 5 + seed) * .045 + Math.sin(x * 17) * .018); }
    geo.computeVertexNormals(); const f = mk(geo, soilMat(tex, w / 4.2, h / 2.4)); f.position.set(cx, cy, 0); g.add(f);
    put(g, mk(new THREE.BoxGeometry(w, h, 1.8), soilDark), cx, cy, -.9 - .06);
    put(g, mk(new THREE.BoxGeometry(w, .02, 1.8), cm(mat({ map: TX.soilC, roughness: 1 }), cB)), cx, y1 + .01, -.9); return g;
  }
  found.add(soilBlock(-9.4, X(190), -5.4, -.17, TX.soilA, 1.7));
  found.add(soilBlock(X(1560), 9.4, -5.4, -.17, TX.soilB, 4.1));
  found.add(soilBlock(-9.4, 9.4, -5.4, -3.14, TX.soilC, 7.3));
  /* pebbles in the cut faces */
  const pebM = cm(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9 }), cB), rp = mulberry32(88);
  [[-9.3, X(190) - .03, -5.3, -.35, 70], [X(1560) + .03, 9.3, -5.3, -.35, 70], [-9.3, 9.3, -5.3, -3.25, 90]].forEach(([a, b, c, d, n], j) => {
    for (let v = 0; v < 2; v++) {
      const im = new THREE.InstancedMesh(STONES[(j * 2 + v) % STONES.length], pebM, n), o = new THREE.Object3D();
      for (let i = 0; i < n; i++) { const s = .03 + rp() * .075; o.position.set(a + rp() * (b - a), c + rp() * (d - c), .035); o.scale.set(s, s * .8, s * .5); o.rotation.set(rp() * 6, rp() * 6, rp() * 6); o.updateMatrix(); im.setMatrixAt(i, o.matrix); im.setColorAt(i, new THREE.Color().setHSL(.07 + rp() * .03, .2 + rp() * .2, .45 + rp() * .35)); }
      im.castShadow = false; found.add(im);
    }
  });
  const concM = cm(mat({ map: TX.conc, roughness: .9, bumpMap: TX.conc, bumpScale: 1 }), cB);
  TX.conc.repeat.set(1, 1);
  const padL = mk(rbox(X(215) + 9.4, .24, 1.9, .03, .01), concM); padL.position.set((-9.4 + X(215)) / 2, -.12, -.1); found.add(padL);
  const padR = mk(rbox(9.4 - X(1530), .24, 1.9, .03, .01), concM); padR.position.set((9.4 + X(1530)) / 2, -.12, -.1); found.add(padR);
  const wallL = mk(rbox(X(265) - X(215), 3.0, 1.8, .03, .01), cm(mat({ map: TX.concDark, roughness: .9, bumpMap: TX.concDark, bumpScale: 1 }), cB)); wallL.position.set((X(215) + X(265)) / 2, -1.5, -.05); found.add(wallL);
  const wallR = mk(rbox(X(1530) - X(1467), 3.0, 1.8, .03, .01), cm(mat({ map: TX.concDark, roughness: .9, bumpMap: TX.concDark, bumpScale: 1 }), cB)); wallR.position.set((X(1467) + X(1530)) / 2, -1.5, -.05); found.add(wallR);
  const yel = cm(phys({ color: 0xe9a21d, metalness: .35, roughness: .42, clearcoat: .4 }), cB), plate = cm(mat({ color: 0x9a9ca0, metalness: .8, roughness: .45 }), cB);
  [[X(190), X(215)], [X(1530), X(1562)]].forEach(([a, b]) => {
    const cx = (a + b) / 2, w = b - a; put(found, mk(new THREE.BoxGeometry(w - .02, 3.0, .12), plate), cx, -1.62, .26);
    [-1, 1].forEach(s => put(found, mk(rbox(.1, 3.06, .24, .02, .01), yel), cx + s * (w / 2 - .035), -1.62, .3));
    for (let k = 0; k < 6; k++) { put(found, mk(new THREE.CylinderGeometry(.035, .035, .05, 10), cm(M.chrome, cB)), cx, -.35 - k * .5, .42, Math.PI / 2); }
  });
  const baseSlab = mk(rbox(X(1530) - X(215), .17, 1.8, .02, .01), cm(mat({ map: TX.conc, roughness: .9, color: 0xdedbd5 }), cB)); baseSlab.position.set((X(215) + X(1530)) / 2, -3.055, -.05); found.add(baseSlab);
  /* layer 1: coarse aggregate in a cement matrix */
  const L1 = { x0: X(215), x1: X(1530), y0: -2.97, y1: -2.19 }; const l1w = L1.x1 - L1.x0, l1h = L1.y1 - L1.y0;
  const mt = TX.matrix.clone(); mt.needsUpdate = true; mt.repeat.set(l1w / 3, l1h / 3);
  const l1f = mk(new THREE.PlaneGeometry(l1w, l1h, 60, 8), cm(mat({ map: mt, bumpMap: mt, bumpScale: 2, roughness: .92 }), cB)); l1f.position.set((L1.x0 + L1.x1) / 2, (L1.y0 + L1.y1) / 2, .005); found.add(l1f);
  { const p = l1f.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 5.3) * Math.cos(p.getY(i) * 9) * .015); l1f.geometry.computeVertexNormals(); }
  put(found, mk(new THREE.BoxGeometry(l1w, l1h, 1.8), cm(mat({ color: 0x6f6e6b, roughness: 1 }), cB)), (L1.x0 + L1.x1) / 2, (L1.y0 + L1.y1) / 2, -.92);
  const stM = cm(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8 }), cB), r1 = mulberry32(61);
  for (let v = 0; v < 6; v++) {
    const n = 20, im = new THREE.InstancedMesh(STONES[v % STONES.length], stM, n), o = new THREE.Object3D();
    for (let i = 0; i < n; i++) { const s = .13 + r1() * .12; o.position.set(L1.x0 + .3 + r1() * (l1w - .6), L1.y0 + .16 + r1() * (l1h - .3), .0 + r1() * .03); o.scale.set(s * (1.0 + r1() * .5), s * (.8 + r1() * .3), s * .55); o.rotation.set(r1() * .6, r1() * .6, r1() * 6); o.updateMatrix(); im.setMatrixAt(i, o.matrix); im.setColorAt(i, new THREE.Color().setScalar(.8 + r1() * .5)); }
    im.castShadow = true; im.receiveShadow = true; found.add(im);
  }
  /* wet-cast front face of layer 1 top edge */
  put(found, mk(new THREE.BoxGeometry(l1w, .035, 1.8), cm(mat({ color: 0x8e8d89, roughness: .9 }), cB)), (L1.x0 + L1.x1) / 2, L1.y1, -.9);
  W.found = found;

  /* —— reinforcement —— */
  const pulse = { value: -99 };
  const steelBar = pulsify(cm(phys({ color: 0x55575c, metalness: .85, roughness: .38, bumpMap: TX.rib, bumpScale: .4, clearcoat: .15 }), cRX), pulse);
  const rustBar = pulsify(cm(phys({ color: 0x8c3d1a, metalness: .6, roughness: .46, bumpMap: TX.rib, bumpScale: .5 }), cRY), pulse);
  const clipOr = pulsify(cm(phys({ color: 0xff5e29, metalness: .1, roughness: .38, clearcoat: .6 }), cRX), pulse);
  const clipOrY = pulsify(cm(phys({ color: 0xff5e29, metalness: .1, roughness: .38, clearcoat: .6 }), cRY), pulse);
  const rebar = new THREE.Group(); scene.add(rebar); W.rebar = rebar;
  const bx0 = X(250), bx1 = X(1490), BL = bx1 - bx0;
  [Y(543), Y(648)].forEach(y => {
    const geo = ribbed(BL, .036); const b = mk(geo, steelBar); b.position.set(bx0, y, .12); rebar.add(b);
    const b2 = mk(geo, steelBar); b2.position.set(bx0, y, -.55); rebar.add(b2);
    for (let x = bx0 + .35; x < bx1 - .2; x += 1.15) { const t = mk(new THREE.CylinderGeometry(.034, .034, .7, 8), steelBar); t.rotation.x = Math.PI / 2; t.position.set(x, y, -.22); rebar.add(t); }
    for (let x = bx0 + .2; x < bx1 - .1; x += .56) { const c = mk(rbox(.11, .15, .17, .03, .01), clipOr); c.position.set(x, y + (Math.sin(x * 3) > 0 ? 0 : 0), .13); rebar.add(c); }
  });
  const cageX = [X(510), X(860), X(1192)], cTop = Y(320), cBot = Y(690), CH = cTop - cBot;
  const cages = []; cageX.forEach((cx, ci) => {
    const g = new THREE.Group(); g.position.set(cx, 0, 0); rebar.add(g); cages.push(g);
    const rg = ribbed(CH, .026); rg.rotateZ(Math.PI / 2);
    [[-.22, .12], [.22, .12], [-.22, -.3], [.22, -.3], [-.27, .12], [.27, .12]].forEach(([dx, dz], i) => { if (i > 3 && dz < 0) return; const b = mk(rg.clone(), rustBar); b.rotation.set(0, 0, 0); b.position.set(dx, cBot, dz); g.add(b); });
    for (let y = cBot + .22; y < cTop - .05; y += .31) {
      const ln = mk(new THREE.CylinderGeometry(.021, .021, .56, 8), rustBar); ln.rotation.z = Math.PI / 2; ln.position.set(0, y, .12); g.add(ln);
      const lb = mk(new THREE.CylinderGeometry(.021, .021, .56, 8), rustBar); lb.rotation.z = Math.PI / 2; lb.position.set(0, y, -.3); g.add(lb);
      [-.22, .22].forEach(dx => { const lz = mk(new THREE.CylinderGeometry(.02, .02, .42, 8), rustBar); lz.rotation.x = Math.PI / 2; lz.position.set(dx, y, -.09); g.add(lz); });
      if (Math.round((y - cBot) / .31) % 2 === 0) [-.22, .22].forEach(dx => { const c = mk(rbox(.075, .06, .08, .02, .008), clipOrY); c.position.set(dx, y, .15); g.add(c); });
    }
  });
  W.cages = cages; W.pulse = pulse;

  /* —— concrete layer 2: a height field poured in front of the section —— */
  const NX = 240, CX0 = X(265), CX1 = X(1467), YB = -2.2, YT = -1.54, DEP = 1.75;
  const fPos = new Float32Array((NX + 1) * 2 * 3), fUv = new Float32Array((NX + 1) * 2 * 2), fIdx = [];
  const tPos = new Float32Array((NX + 1) * 2 * 3), tUv = new Float32Array((NX + 1) * 2 * 2);
  for (let i = 0; i < NX; i++) { const a = i * 2; fIdx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fPos, 3)); fg.setAttribute('uv', new THREE.BufferAttribute(fUv, 2)); fg.setIndex(fIdx);
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(tPos, 3)); tg.setAttribute('uv', new THREE.BufferAttribute(tUv, 2)); tg.setIndex(fIdx);
  const fnorm = new Float32Array((NX + 1) * 2 * 3); for (let i = 0; i < (NX + 1) * 2; i++) fnorm[i * 3 + 2] = 1; fg.setAttribute('normal', new THREE.BufferAttribute(fnorm, 3));
  const tf = TX.fresh.clone(); tf.needsUpdate = true; tf.repeat.set(1, 1);
  const wet = phys({ color: 0xb6b7b5, roughness: .5, map: tf, bumpMap: tf, bumpScale: 1.4, clearcoat: .3, clearcoatRoughness: .45 });
  const wetTop = phys({ color: 0xc2c3c1, roughness: .3, map: tf, bumpMap: tf, bumpScale: 1.0, clearcoat: .7, clearcoatRoughness: .25, envMapIntensity: 1.1 });
  const lay2f = new THREE.Mesh(fg, wet), lay2t = new THREE.Mesh(tg, wetTop); lay2f.frustumCulled = lay2t.frustumCulled = false; lay2f.receiveShadow = lay2t.receiveShadow = true; lay2t.castShadow = false; scene.add(lay2f, lay2t);
  const S = .17;
  for (let i = 0; i <= NX; i++) { const x = CX0 + (CX1 - CX0) * i / NX; fUv[i * 4] = x * S; fUv[i * 4 + 2] = x * S; fUv[i * 4 + 3] = YT * S; fUv[i * 4 + 1] = YB * S; tUv[i * 4] = x * S; tUv[i * 4 + 1] = 0; tUv[i * 4 + 2] = x * S; tUv[i * 4 + 3] = -DEP * S; }
  const X0 = X(1050);
  W.heightAt = (x, t) => {
    const fillT = seg(t, 8.9, 12.0), Rr = lerp(.25, 12.6, 1 - Math.pow(1 - fillT, 2)), d = Math.abs(x - X0);
    const front = 1 - sm((d - (Rr - 1.1)) / 1.1);
    let h = YB + (YT - YB) * front;
    const st = sm(seg(t, 8.8, 9.3)) * (1 - .72 * sm(seg(t, 12.0, 13.4)));
    h += .27 * st * Math.exp(-Math.pow((x - X0) / .62, 2)) * (front > 0 ? 1 : 0);
    const ripple = Math.max(0, 1 - Math.abs(seg(t, 8.9, 13.5) - .0)) ; /* gentle surface waves while it flows out */
    h += Math.sin(d * 11 - t * 7) * .012 * front * st * Math.exp(-d * .35);
    const vib = sm(seg(t, 12.0, 12.6)) * (1 - sm(seg(t, 13.7, 14.5)));
    h += (Math.sin(x * 15 + t * 61) * .0042 + Math.sin(x * 37 - t * 73) * .002) * vib * front;
    h -= .032 * sm(seg(t, 12.3, 13.8)) * front;
    return Math.max(YB, h);
  };
  W.updLayer2 = (t) => {
    for (let i = 0; i <= NX; i++) {
      const x = CX0 + (CX1 - CX0) * i / NX, h = W.heightAt(x, t);
      fPos.set([x, YB, 0, x, h, 0], i * 6); tPos.set([x, h, 0.001, x, h, -DEP], i * 6);
      fUv[i * 4 + 3] = h * S; tUv[i * 4 + 1] = 0;
    }
    fg.attributes.position.needsUpdate = true; fg.attributes.uv.needsUpdate = true; tg.attributes.position.needsUpdate = true; tg.attributes.uv.needsUpdate = true; tg.computeVertexNormals();
  };

  /* —— mixer truck (left) —— */
  const mixer = new THREE.Group(); scene.add(mixer); W.mixer = mixer; mixer.position.set(X(290), 0, .15);
  const chassisM = M.dark, cabW = phys({ color: 0xf2f1ee, metalness: .2, roughness: .32, clearcoat: .6, clearcoatRoughness: .2 });
  const glassDark = phys({ color: 0x14181c, metalness: .3, roughness: .06, clearcoat: 1, envMapIntensity: 1.5 });
  put(mixer, mk(rbox(4.6, .2, .62, .04, .01), chassisM), -2.35, .5, 0);
  put(mixer, mk(rbox(4.2, .1, .5, .03, .01), M.black), -2.5, .38, 0);
  const cab = new THREE.Group(); mixer.add(cab);
  put(cab, mk(rbox(1.0, .8, .95, .1, .02), cabW), -.52, .98, 0);
  put(cab, mk(rbox(.18, .42, .9, .04, .01), M.dark), -.03, .62, 0);              /* bumper + grille */
  put(cab, mk(rbox(.04, .24, .66, .02, .008), M.black), .0, .78, 0);
  put(cab, mk(rbox(.94, .1, .97, .03, .01), M.orange), -.52, .62, 0);
  const ws = mk(rbox(.04, .42, .78, .04, .01), glassDark); ws.position.set(-.04, 1.18, 0); ws.rotation.z = -.2; cab.add(ws);
  put(cab, mk(rbox(.58, .36, .02, .04, .008), glassDark), -.52, 1.14, .485);
  put(cab, mk(rbox(.2, .3, .02, .03, .008), glassDark), -.1, 1.14, .485);
  put(cab, mk(rbox(.94, .06, 1.0, .02, .008), M.dark), -.52, 1.4, 0);
  put(cab, mk(rbox(.1, .16, .08, .02, .008), M.black), -.02, 1.3, .55); put(cab, mk(new THREE.CylinderGeometry(.012, .012, .2, 8), M.steelS), -.02, 1.3, .52);
  [.35, -.35].forEach(z => put(cab, mk(new THREE.SphereGeometry(.07, 16, 12), phys({ color: 0xfff6d8, emissive: 0xfff0c0, emissiveIntensity: .8, roughness: .1 })), .01, .66, z));
  put(cab, mk(rbox(.5, .035, .02, .01, .005), M.chrome), -.52, .93, .487);
  [-.75, -2.0, -2.5].forEach(x => { const w = wheel(.32, .24); w.position.set(x, .32, .38); mixer.add(w); const w2 = wheel(.32, .24); w2.position.set(x, .32, -.38); mixer.add(w2); });
  [-.75, -2.0, -2.5].forEach(x => put(mixer, mk(rbox(.82, .06, .86, .03, .01), M.black), x, .64, 0));
  const tilt = new THREE.Group(); tilt.position.set(-2.72, 1.02, 0); tilt.rotation.z = -.2; mixer.add(tilt);
  const spin = new THREE.Group(); tilt.add(spin);
  const drumTex = canvasTex(512, 256, (x, w, h) => { x.fillStyle = '#26282c'; x.fillRect(0, 0, w, h); x.strokeStyle = '#ff5e29'; x.lineWidth = 22; for (let k = -2; k < 5; k++) { x.beginPath(); x.moveTo(0, k * 90 + 20); x.lineTo(w, k * 90 + 200); x.stroke(); } x.strokeStyle = 'rgba(255,255,255,.04)'; x.lineWidth = 2; for (let k = 0; k < 40; k++) { x.beginPath(); x.moveTo(k * 13, 0); x.lineTo(k * 13, h); x.stroke(); } }, true);
  const dprof = [[.28, -1.7], [.46, -1.5], [.62, -1.15], [.7, -.55], [.7, .95], [.62, 1.3], [.46, 1.5], [.3, 1.65]].map(p => new V2(p[0], p[1]));
  const dg = new THREE.LatheGeometry(dprof, 56); dg.rotateZ(-Math.PI / 2);
  const dm = phys({ map: drumTex, color: 0xffffff, metalness: .55, roughness: .38, clearcoat: .4, clearcoatRoughness: .3 });
  spin.add(mk(dg, dm));
  const cap = new THREE.LatheGeometry([[.0, -1.72], [.3, -1.72], [.46, -1.5], [.5, -1.42]].map(p => new V2(p[0], p[1])), 40); cap.rotateZ(-Math.PI / 2); spin.add(mk(cap, M.orange));
  [-.55, .9].forEach(s => { const ring = mk(new THREE.TorusGeometry(.705, .035, 12, 56), M.steelS); ring.rotation.y = Math.PI / 2; ring.position.x = s; spin.add(ring); });
  const lg = logoTex(false); lg.userData.name = 'mixLogo';
  const decal = mk(new THREE.PlaneGeometry(.96, .3), new THREE.MeshStandardMaterial({ map: lg, transparent: true, roughness: .5, polygonOffset: true, polygonOffsetFactor: -2 }), { cast: false });
  decal.position.set(.4, .02, .715); tilt.add(decal);
  put(mixer, mk(rbox(.5, .5, .5, .06, .01), M.dark), -4.5, .85, 0);                                     /* rear chute */
  put(mixer, mk(new THREE.CylinderGeometry(.16, .16, 1.1, 20), M.steelS), -1.6, .38, .4, 0, 0, Math.PI / 2);
  for (let k = 0; k < 7; k++) put(mixer, mk(new THREE.BoxGeometry(.03, .5, .03), M.steelS), -1.45 - k * .07, 1.2, -.48);
  /* cab and chassis detail */
  const dline = (x, y, w, h) => put(cab, mk(new THREE.BoxGeometry(w, h, .012), M.black, { cast: false }), x, y, .488);
  dline(-.52, .73, .9, .012); dline(-.52, 1.37, .9, .012); dline(-.07, 1.05, .012, .65); dline(-.95, 1.05, .012, .65); dline(-.52, 1.03, .012, .08);
  put(cab, mk(rbox(.09, .022, .03, .008, .004), M.chrome), -.2, .93, .5);
  put(cab, mk(new THREE.BoxGeometry(.01, .22, .01), M.steelS), .02, 1.28, .5, 0, 0, 0); put(cab, mk(rbox(.09, .22, .07, .02, .006), M.black), .04, 1.2, .58);
  const arch = mk(new THREE.TorusGeometry(.4, .035, 8, 36, Math.PI), M.black); arch.position.set(-.75, .32, .5); mixer.add(arch);
  put(mixer, mk(rbox(.5, .06, .05, .01, .004), M.dark), -.75, .66, .52);
  put(mixer, mk(new THREE.CylinderGeometry(.04, .04, 1.35, 14), M.chrome), -1.12, 1.45, .4); put(mixer, mk(new THREE.CylinderGeometry(.06, .06, .06, 14), M.dark), -1.12, 2.1, .4);
  put(mixer, mk(rbox(.5, .22, .3, .04, .01), M.dark), -1.55, .42, .45);
  [.38, .2].forEach((y, i) => put(mixer, mk(new THREE.SphereGeometry(.028, 10, 8), phys({ color: 0xffa31a, emissive: 0xff8a00, emissiveIntensity: .7 })), -.12 - i * .12, 1.4, .5));
  put(mixer, mk(rbox(.12, .12, .5, .03, .008), M.dark), -.02, .52, 0);
  W.mixSpin = spin; W.mixLogo = lg; clipTree(mixer, cMix);

  /* —— pump truck (right) with the articulated boom —— */
  const pump = new THREE.Group(); scene.add(pump); W.pump = pump;
  const pb = new THREE.Group(); pump.add(pb);
  put(pb, mk(rbox(2.95, .2, .66, .04, .01), M.dark), 7.85, .5, 0);
  put(pb, mk(rbox(2.3, .62, .95, .1, .02), phys({ color: 0x2c2e33, metalness: .5, roughness: .36, clearcoat: .5 })), 7.6, .86, 0);
  put(pb, mk(rbox(2.32, .1, .97, .03, .01), M.orange), 7.6, 1.2, 0);
  put(pb, mk(rbox(.98, .34, .03, .05, .01), phys({ color: 0x17181b, roughness: .4 })), 7.55, .84, .49);
  const pl = logoTex(true); put(pb, mk(new THREE.PlaneGeometry(.96, .3), new THREE.MeshStandardMaterial({ map: pl, roughness: .5 })), 7.55, .84, .507);
  put(pb, mk(rbox(.62, .42, .94, .06, .01), M.orange), 6.82, 1.05, 0); put(pb, mk(rbox(.3, .3, .9, .05, .01), M.dark), 6.62, .98, 0);
  [[6.95], [7.55], [8.15]].forEach(([x]) => { const w = wheel(.3, .26); w.position.set(x, .3, .42); pb.add(w); const w2 = wheel(.3, .26); w2.position.set(x, .3, -.42); pb.add(w2); put(pb, mk(rbox(.78, .07, .9, .03, .01), M.black), x, .64, 0); });
  [[6.52, .62], [8.7, .62]].forEach(([x, z]) => { put(pb, mk(rbox(.14, .12, 1.25, .02, .008), M.dark), x, .45, .45); put(pb, cyl(.07, .07, .5, M.chrome, 20), x, .22, z); put(pb, cyl(.1, .1, .28, M.dark, 20), x, .32, z); put(pb, mk(rbox(.46, .05, .4, .02, .008), M.dark), x, .03, z); });
  put(pb, cyl(.38, .42, .16, M.dark, 40), X(1695), Y(300) - .1, 0); put(pb, cyl(.3, .3, .24, M.orange, 40), X(1695), Y(300) + .05, 0);
  [7.0, 7.6, 8.2].forEach(x => put(pb, mk(new THREE.BoxGeometry(.012, .46, .012), M.black, { cast: false }), x, .86, .49));
  put(pb, mk(rbox(.55, .2, .16, .03, .008), M.dark), 7.05, .55, .56); put(pb, mk(rbox(.5, .035, .02, .01, .004), M.chrome), 7.05, .6, .64);
  [-.35, .35].forEach(z => put(pb, mk(rbox(.05, .14, .12, .01, .004), phys({ color: 0xff2a1a, emissive: 0xff1100, emissiveIntensity: .6, roughness: .3 })), 6.45, .62, z));
  put(pb, cyl(.2, .2, .7, M.orange, 28), 8.5, .84, .3, Math.PI / 2); put(pb, cyl(.22, .22, .06, M.dark, 28), 8.5, .84, .66, Math.PI / 2);
  [-.12, .12].forEach(z => put(pb, mk(new THREE.BoxGeometry(.03, .9, .03), M.steelS), 8.62, .7, .5 + z * .1));
  for (let k = 0; k < 5; k++) put(pb, mk(new THREE.BoxGeometry(.03, .03, .28), M.steelS), 8.62, .38 + k * .17, .52);
  put(pb, mk(rbox(.9, .06, .9, .02, .006), M.black), 6.9, .86, 0); [6.62, 6.78, 6.94, 7.1].forEach(x => put(pb, mk(new THREE.BoxGeometry(.02, .035, .85), M.steelS), x, 1.28, 0));
  clipTree(pb, cPmp);

  /* boom: four sections, joint hubs, pipeline and hydraulic cylinders */
  const PV = new V3(X(1695), Y(300), 0);
  const DEPJ = [new V3(X(1553), Y(172)), new V3(X(1280), Y(98)), new V3(X(1105), Y(93)), new V3(X(1085), Y(124))];
  const pts = [PV, ...DEPJ], LEN = [], AD = []; for (let i = 0; i < 4; i++) { const d = pts[i + 1].clone().sub(pts[i]); LEN.push(d.length()); AD.push(Math.atan2(d.y, d.x)); }
  const AS = [173 * D2R, 8 * D2R, 172 * D2R, 262 * D2R], TM = [[5.0, 5.95], [5.5, 6.65], [6.1, 6.85], [6.5, 7.1]];
  const boomM = phys({ color: 0xff5e29, metalness: .25, roughness: .34, clearcoat: .8, clearcoatRoughness: .2 });
  const boom = new THREE.Group(); scene.add(boom); W.boom = boom;
  const segs = [], thick = [.3, .27, .23, .19], thin = [.27, .23, .19, .15];
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group(), L = LEN[i], h0 = thick[i], h1 = thin[i];
    const sh = new THREE.Shape(); sh.moveTo(0, -h0 / 2); sh.lineTo(L, -h1 / 2); sh.lineTo(L, h1 / 2); sh.lineTo(0, h0 / 2); sh.lineTo(0, -h0 / 2);
    const eg = new THREE.ExtrudeGeometry(sh, { depth: .26, bevelEnabled: true, bevelThickness: .04, bevelSize: .03, bevelSegments: 3 }); eg.translate(0, 0, -.13);
    g.add(mk(eg, boomM));
    put(g, mk(new THREE.BoxGeometry(L * .78, .035, .34), M.dark), L * .5, h0 * .02, .0);
    put(g, mk(new THREE.CylinderGeometry(.05, .05, L * .96, 14), M.black), L * .5, h0 / 2 + .06, -.04, 0, 0, Math.PI / 2);
    for (let k = 1; k < 4; k++) put(g, mk(rbox(.07, .09, .1, .02, .006), M.dark), L * k / 4, h0 / 2 + .06 - k * .004, -.04);
    const hub = mk(new THREE.CylinderGeometry(.17, .17, .4, 32), M.dark); hub.rotation.x = Math.PI / 2; g.add(hub);
    const pin = mk(new THREE.CylinderGeometry(.06, .06, .5, 20), M.chrome); pin.rotation.x = Math.PI / 2; g.add(pin);
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; put(g, mk(new THREE.CylinderGeometry(.018, .018, .43, 8), M.chrome), Math.cos(a) * .12, Math.sin(a) * .12, 0, Math.PI / 2); }
    put(g, mk(rbox(.1, h1 + .1, .3, .02, .008), M.dark), L - .04, 0, 0);
    boom.add(g); segs.push(g);
  }
  const hubEnd = mk(new THREE.CylinderGeometry(.13, .13, .38, 28), M.dark); hubEnd.rotation.x = Math.PI / 2; boom.add(hubEnd);
  function cylinderAssy() { const g = new THREE.Group(); const barrel = mk(new THREE.CylinderGeometry(.075, .075, 1, 18), M.dark), rod = mk(new THREE.CylinderGeometry(.04, .04, 1, 14), M.chrome); const eyeA = mk(new THREE.SphereGeometry(.07, 14, 10), M.steelS), eyeB = mk(new THREE.SphereGeometry(.06, 14, 10), M.steelS); g.add(barrel, rod, eyeA, eyeB); g.userData = { barrel, rod, eyeA, eyeB }; boom.add(g); return g; }
  const CY = [
    { g: cylinderAssy(), a: { seg: -1, p: [8.42, .82] }, b: { seg: 0, p: [.9, .26] } },
    { g: cylinderAssy(), a: { seg: 0, p: [1.45, .27] }, b: { seg: 1, p: [.45, .24] } },
    { g: cylinderAssy(), a: { seg: 1, p: [2.3, .22] }, b: { seg: 2, p: [.4, .21] } },
    { g: cylinderAssy(), a: { seg: 2, p: [1.3, .2] }, b: { seg: 3, p: [.08, .15] } },
  ];
  const ZC = .24;
  W.updBoom = (t) => {
    const a = []; for (let i = 0; i < 4; i++) a.push(lerp(AS[i], AD[i], eio(seg(t, TM[i][0], TM[i][1]))));
    const J = [PV.clone()]; for (let i = 0; i < 4; i++) J.push(new V3(J[i].x + Math.cos(a[i]) * LEN[i], J[i].y + Math.sin(a[i]) * LEN[i], 0));
    segs.forEach((g, i) => { g.position.copy(J[i]); g.rotation.z = a[i]; });
    hubEnd.position.copy(J[4]);
    const world = (ref) => { if (ref.seg < 0) return new V3(ref.p[0], ref.p[1], ZC); const g = segs[ref.seg], c = Math.cos(a[ref.seg]), s = Math.sin(a[ref.seg]); return new V3(g.position.x + ref.p[0] * c - ref.p[1] * s, g.position.y + ref.p[0] * s + ref.p[1] * c, ZC); };
    CY.forEach(c => {
      const A = world(c.a), B = world(c.b), d = B.clone().sub(A), len = d.length(), u = d.clone().normalize(), U = c.g.userData;
      const bl = len * .52, rl = len * .56;
      U.barrel.scale.y = bl; U.barrel.position.copy(A).addScaledVector(u, bl / 2); U.rod.scale.y = rl; U.rod.position.copy(B).addScaledVector(u, -rl / 2);
      const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), u); U.barrel.quaternion.copy(q); U.rod.quaternion.copy(q);
      U.eyeA.position.copy(A); U.eyeB.position.copy(B);
    });
    W.boomTip = J[4];
  };
  W.updBoom(0); clipTree(boom, cPmp);

  /* —— delivery hose and concrete stream —— */
  const hoseM = phys({ color: 0x17181b, metalness: .2, roughness: .55, clearcoat: .3, bumpMap: TX.rib, bumpScale: .6 });
  const hose = new THREE.Mesh(new THREE.BufferGeometry(), hoseM); hose.frustumCulled = false; hose.castShadow = true; scene.add(hose);
  const collarTop = mk(new THREE.CylinderGeometry(.1, .1, .14, 20), M.steelS), collarEnd = new THREE.Group(); collarEnd.add(mk(new THREE.CylinderGeometry(.1, .1, .2, 20), M.steelS), put(new THREE.Group(), mk(new THREE.CylinderGeometry(.115, .115, .05, 20), M.orange), 0, -.07, 0)); scene.add(collarTop, collarEnd);
  const E = new V3(X(1050), Y(436), 0);
  W.updHose = (t) => {
    const tip = W.boomTip, vis = sm(seg(t, 6.6, 7.2)); hose.visible = collarTop.visible = collarEnd.visible = vis > .01;
    const sway = Math.exp(-Math.max(0, t - 7.0) * 1.2) * Math.sin((t - 7.0) * 3.2) * .22 * sm(seg(t, 6.9, 7.1)) + (1 - sm(seg(t, 6.8, 7.6))) * .55;
    const top = tip.clone(); const end = new V3(E.x + sway, E.y + (1 - sm(seg(t, 7.0, 8.0))) * .35 * 0, 0);
    const curve = new THREE.CatmullRomCurve3([top, new V3(top.x - .02, top.y - .3, 0), new V3(lerp(top.x, end.x, .6) - .1, top.y - .75, 0), new V3(end.x + sway * .1 + .0, lerp(top.y, end.y, .4), 0), new V3(end.x, lerp(top.y, end.y, .75), 0), end]);
    hose.geometry.dispose(); hose.geometry = new THREE.TubeGeometry(curve, 70, .075, 10, false);
    const u = hose.geometry.attributes.uv; for (let i = 0; i < u.count; i++) u.setX(i, u.getX(i) * 40);
    collarTop.position.copy(top); collarTop.rotation.z = Math.PI / 2 + .2; collarEnd.position.set(end.x, end.y - .02, 0);
    W.hoseEnd = end;
  };
  W.updHose(99);
  /* stream: a slightly irregular, heavy column of wet concrete */
  const SEG = 36, RAD = 14, sg = new THREE.CylinderGeometry(.075, .09, 1, RAD, SEG, true); sg.translate(0, -.5, 0);
  const sMat = phys({ color: 0x9b9c9b, roughness: .42, clearcoat: .5, clearcoatRoughness: .3, map: TX.fresh, bumpMap: TX.fresh, bumpScale: 2 }); sMat.map = TX.fresh.clone(); sMat.map.needsUpdate = true; sMat.map.repeat.set(1, 3); sMat.bumpMap = sMat.map;
  const stream = new THREE.Mesh(sg, sMat); stream.frustumCulled = false; stream.castShadow = true; scene.add(stream); const sp0 = sg.attributes.position.array.slice();
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(.035, 10, 8), phys({ color: 0x9d9e9d, roughness: .4, clearcoat: .5 }), 34); drops.frustumCulled = false; scene.add(drops);
  const ringM = new THREE.MeshBasicMaterial({ color: 0xe8e6e0, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const rings = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 48), ringM.clone()); m.rotation.x = -Math.PI / 2; m.frustumCulled = false; scene.add(m); return m; });
  const vibR = [-3.6, -.7, 3.0].map(x => { const m = new THREE.Mesh(new THREE.RingGeometry(.92, 1, 48), ringM.clone()); m.rotation.x = -Math.PI / 2; m.frustumCulled = false; scene.add(m); return { m, x }; });
  const dummy = new THREE.Object3D();
  W.updStream = (t) => {
    const act = t >= 8.3 && W.hoseEnd; stream.visible = drops.visible = !!act; rings.forEach(r => r.visible = !!act); if (!act) return;
    const top = W.hoseEnd.clone().add(new V3(0, -.05, 0)), x = top.x, surf = W.heightAt(x, t), len = Math.max(.01, (top.y - surf) * sm(seg(t, 8.3, 8.75)));
    const p = sg.attributes.position, la = sg.attributes.position.count;
    for (let i = 0; i < la; i++) {
      const ox = sp0[i * 3], oy = sp0[i * 3 + 1], oz = sp0[i * 3 + 2], th = Math.atan2(oz, ox), rr = Math.hypot(ox, oz), yy = -oy;
      const k = 1 + .14 * Math.sin(yy * 17 - t * 15 + th * 2) + .08 * Math.sin(yy * 31 - t * 23) + .35 * Math.max(0, yy - .93) * .0 + .22 * Math.pow(yy, 6) * 1.0;
      const wob = Math.sin(yy * 9 - t * 8) * .012 * yy;
      p.setXYZ(i, x + Math.cos(th) * rr * k * (1 + yy * .1) + wob, top.y + oy * len, Math.sin(th) * rr * k * (1 + yy * .1));
    }
    p.needsUpdate = true; sMat.map.offset.y = -t * 1.4; sg.computeVertexNormals();
    drops.visible = len > .5;
    for (let k = 0; k < 34; k++) { const ph = ((t * 1.7 + k / 34) % 1), a = k * 2.399, sd = .5 + (k % 5) * .22; dummy.position.set(x + Math.cos(a) * sd * ph * .8, surf + (1.9 * ph - 4.4 * ph * ph) * .55 * (.6 + (k % 4) * .2) + .03, Math.sin(a) * sd * ph * .5); const s = (1 - ph) * (.7 + (k % 3) * .2); dummy.scale.setScalar(Math.max(.01, s)); dummy.updateMatrix(); drops.setMatrixAt(k, dummy.matrix); }
    drops.instanceMatrix.needsUpdate = true;
    rings.forEach((r, i) => { const ph = ((t * .8 + i * .5) % 1); r.position.set(x, surf + .012, 0); r.scale.setScalar(.12 + ph * 1.1); r.material.opacity = (1 - ph) * .55 * sm(seg(t, 8.8, 9.4)) * (1 - sm(seg(t, 13, 14.5)) * .6); });
  };
  W.updVib = (t) => {
    const a = sm(seg(t, 12.1, 12.7)) * (1 - sm(seg(t, 13.6, 14.4)));
    vibR.forEach((v, i) => { v.m.visible = a > .01; const ph = ((t * .9 + i * .33) % 1); v.m.position.set(v.x, W.heightAt(v.x, t) + .012, .3); v.m.scale.set(.2 + ph * .9, .2 + ph * .9, 1); v.m.material.opacity = (1 - ph) * .5 * a; });
  };

  /* —— the timeline —— */
  W.state = (t) => {
    const e = eio, k = e(seg(t, 0, 1.5));
    cB.constant = lerp(-5.6, 1, k) + (t > 1.5 ? 99 : 0);
    key.intensity = lerp(1.2, 2.1, sm(seg(t, 0, 1.5)));
    const r = e(seg(t, 1.6, 2.6)); cRX.constant = lerp(-7, 8, r) + (t > 2.7 ? 99 : 0);
    const c = e(seg(t, 2.5, 3.5)); cRY.constant = lerp(-3.2, 1.4, c) + (t > 3.6 ? 99 : 0);
    pulse.value = t > 3.2 && t < 4.7 ? lerp(-6.8, 6.6, seg(t, 3.2, 4.6)) : -99;
    const mv = e(seg(t, 3.5, 4.8)), pv = e(seg(t, 3.7, 5.0));
    cMix.constant = lerp(5.9, 11, mv) + (t > 4.9 ? 99 : 0); cPmp.constant = lerp(6.4, 11, pv) + (t > 5.1 ? 99 : 0);
    mixer.position.x = X(290) - (1 - mv) * .7; pump.position.x = (1 - pv) * .7; boom.position.x = (1 - pv) * .7;
    W.mixSpin.rotation.x = -t * .9 * sm(seg(t, 3.6, 4.6));
    W.updBoom(t); W.updHose(t); W.updLayer2(t); W.updStream(t); W.updVib(t);
  };
  return W;
}

/* ═════════════ runtime ═════════════ */
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const LABELS = { rein: [14.0, 14.5], layers: [14.45, 14.95], comp: [14.9, 15.4], boom: [15.3, 15.8], chips: [14.6, 15.4] };
function stepAt(t) { return t < 5 ? 1 : t < 10.5 ? 2 : t < 12 ? 3 : 4; }

export class PourFigure {
  constructor(fig) {
    this.fig = fig; this.cv = fig.querySelector('canvas.p3-cv'); this.t = 0; this.stopAt = END; this.playing = false; this.paused = false; this.vis = false; this.started = false; this.hold = 0; this.step = 0; this.dirty = true; this.q = 1;
  }
  async boot() {
    const R = this.R = new THREE.WebGLRenderer({ canvas: this.cv, antialias: true, alpha: true, powerPreference: 'high-performance' });
    R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.04; R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap; R.localClippingEnabled = true; R.setClearColor(0, 0);
    this.world = buildWorld(R);
    const d = 36, fov = 2 * Math.atan((8.87 / 2) / d) / D2R; this.cam = new THREE.PerspectiveCamera(fov, 2, 5, 120); const el = 9 * D2R; this.el = el; this.look = new V3(0, Y(443.5), 0); this.camBase = new V3(0, this.look.y + d * Math.sin(el), d * Math.cos(el));
    this.cv.addEventListener('webglcontextlost', e => { e.preventDefault(); this.fig.classList.remove('p3-on'); this.lost = true; });
    this.size();
    /* compile every shader of every phase in parallel, off the main thread, and draw the warm-up frames one per animation frame: the synchronous first draws linked the shaders on the main thread (a 1-2 s freeze while the page was loading or scrolling) */
    R.debug.checkShaderErrors = false; for (const t0 of [0, 2, 4, 6, 9, 12, 15]) { this.world.state(t0); try { await R.compileAsync(this.world.scene, this.cam); await compileShadows(R, this.world.scene, this.cam); R.shadowMap.needsUpdate = true; await warmProgressive(R, this.world.scene, this.cam); } catch (e) {} this.draw(t0); }
    this.draw(0);
    this.fig.classList.add('p3-on'); this.labelEls = [...this.fig.querySelectorAll('[data-lab]')];
    this.io = new IntersectionObserver(es => { this.vis = es[0].isIntersecting; if (this.vis && !this.started) { this.started = true; if (reduceMotion) { this.t = END; this.draw(END); this.labels(END); this.emit(4); } else this.play(0, END); } this.wake(); }, { threshold: .35 });
    this.io.observe(this.fig);
    new ResizeObserver(() => { this.size(); this.dirty = true; this.wake(); }).observe(this.fig);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.wake(); });
    return this;
  }
  size() { const w = this.cv.clientWidth || 800, h = this.cv.clientHeight || 400, dpr = Math.min(window.devicePixelRatio || 1, matchMedia('(hover:none)').matches ? 1.4 : 1.75) * this.q; const W = Math.round(w * dpr), H = Math.round(h * dpr); if (this.R.domElement.width !== W || this.R.domElement.height !== H) this.R.setSize(W, H, false); this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); }
  draw(t) {
    const w = this.world; w.state(t);
    const z = lerp(1.045, 1, sm(seg(t, 0, 14))) / Math.cos(this.el); this.cam.zoom = z; this.cam.updateProjectionMatrix();
    this.cam.position.set(this.camBase.x + (1 - sm(seg(t, 0, 14))) * .12, this.camBase.y, this.camBase.z); this.cam.lookAt(this.look.x, this.look.y, 0);
    this.R.render(w.scene, this.cam);
  }
  labels(t) {
    const set = (name, a, b, line) => { const g = this.fig.querySelector('[data-lab=' + name + ']'); if (!g) return; const k = sm(seg(t, a, b)); g.style.opacity = k; const ln = g.querySelector('.ldr'); if (ln) ln.style.strokeDashoffset = 1 - k; };
    set('rein', ...LABELS.rein); set('boom', ...LABELS.boom); set('layers', ...LABELS.layers); set('comp', ...LABELS.comp); set('chips', ...LABELS.chips);
    const grid = this.fig.querySelector('.p3-grid'); if (grid) grid.style.opacity = sm(seg(t, 0, .6)) * (1 - sm(seg(t, 3.5, 6)) * .55);
  }
  emit(n) { if (n === this.step) return; this.step = n; this.fig.setAttribute('data-step', n); this.fig.dispatchEvent(new CustomEvent('p3step', { detail: n, bubbles: true })); }
  play(from, to) { this.t = from; this.stopAt = to; this.playing = true; this.paused = false; this.hold = 0; this.fig.classList.add('p3-run'); this.syncBtn(); this.wake(); }
  jumpStep(n) { const [a, b] = STEPS[n - 1]; this.fig.classList.add('p3-run'); this.started = true; if (reduceMotion) { this.t = b; this.draw(b); this.labels(b); this.emit(n); return; } this.play(a, b); this.emit(n); }
  replay() { this.fig.classList.add('p3-run'); if (reduceMotion) { this.t = END; this.draw(END); this.labels(END); return; } this.play(0, END); }
  toggle() { if (this.playing) { this.paused = !this.paused; } else { this.paused = !this.paused; } this.syncBtn(); this.wake(); }
  syncBtn() { const b = this.fig.querySelector('[data-p3=pause]'); if (b) { b.textContent = this.paused ? 'Play' : 'Pause'; b.setAttribute('aria-pressed', this.paused ? 'true' : 'false'); } }
  wake() { if (!this.raf && this.vis && !document.hidden && !this.lost) { this.last = performance.now(); this.raf = requestAnimationFrame(n => this.loop(n)); } }
  loop(now) {
    this.raf = 0; const dt = Math.min(.05, (now - this.last) / 1000); this.last = now;
    if (!this.paused) {
      if (this.playing) { this.t += dt; if (this.t >= this.stopAt) { this.t = this.stopAt; this.playing = false; this.hold = this.stopAt >= END ? 1 : 0; } this.dirty = true; }
      else if (this.hold) { this.t += dt; this.dirty = true; }
    }
    if (this.dirty) { const a = performance.now(); this.draw(this.t); this.labels(Math.min(this.t, END)); this.emit(stepAt(Math.min(this.t, END - .001))); const ms = performance.now() - a; if (ms > 34) { this.slow = (this.slow || 0) + 1; if (this.slow > 20 && this.q > .6) { this.q = .75; this.size(); this.slow = 0; } } this.dirty = false; }
    if (this.playing || this.hold) { if (this.hold) { setTimeout(() => this.wake(), 33); this.raf = 0; return; } this.raf = requestAnimationFrame(n => this.loop(n)); }
  }
  poster(w, h, t) { this.R.setSize(w, h, false); this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); this.draw(t); return this.R.domElement.toDataURL('image/png'); }
}
export async function init(fig) { const p = new PourFigure(fig); await p.boot(); fig.__p3 = p; window.__p3 = p; return p; }
