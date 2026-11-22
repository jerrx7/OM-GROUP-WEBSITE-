/* OM GROUP — PCC and foundation: an engineering cross-section built as a real 3D scene (three.js, procedural models), played by a deterministic
   14-second timeline so any moment can be shown, scrubbed or captured as a poster. Same engine family as the large-placement figure
   (assets/application-pour3d.js) and the same shared model library (assets/application-lab3d.js).
   t 0-4   prepared soil: excavated pit in layered soil; a plate compactor works across the subgrade
   t 4-8   PCC layer: plain concrete placed over the subgrade (no reinforcement), stones in the section
   t 8-14  reinforced foundation: reinforcement mats and column starter bars, then the structural concrete rises around them
   Note: not a specific project, not to scale; the stones are drawn as examples of the size relationship. */
import * as THREE from '/assets/vendor/three/three.module.min.js';
import { M, STONES, rbox, mk, put, cyl, canvasTex, mulberry32, makeEnv, clamp, sm, eio, seg, lerp, TAU, compileShadows, warmProgressive } from '/assets/application-lab3d.js';

const V3 = THREE.Vector3, D2R = Math.PI / 180;
/* reference picture space (1774 x 887 px) -> world units: x centred on the picture, y = 0 at the ground line (same frame as the placement figure) */
export const px = x => 887 + x * 100, py = y => 398 - y * 100;
export const END = 14;
export const STEPS = [[0, 4], [4, 8], [8, 14]];
/* layout (world units) */
const PIT = 6.5, GROUND = .55, SUB = -3.0, PCC_T = -2.2, RC_T = -.5, DEP = 1.8;
const BAR_Y = [-1.95, -.95];

/* ───────── clipping planes: visible where n·p + c >= 0 ───────── */
const cPcc = new THREE.Plane(new V3(0, -1, 0), SUB);          /* PCC concrete + stones: visible y <= c */
const cRc = new THREE.Plane(new V3(0, -1, 0), PCC_T);         /* reinforced concrete + stones: visible y <= c */
const cRX = new THREE.Plane(new V3(-1, 0, 0), -8);            /* bar mats: visible x <= c */
const cCage = new THREE.Plane(new V3(0, -1, 0), -3.2);        /* starter cage: visible y <= c */
const cComp = new THREE.Plane(new V3(-1, 0, 0), -8);          /* compacted subgrade: visible x <= c */
const cLoose = new THREE.Plane(new V3(1, 0, 0), 8);           /* loose subgrade: visible x >= -c */
const clipMats = new Map(), planeId = new WeakMap(); let planeN = 0;
function cm(mat, plane) { if (!planeId.has(plane)) planeId.set(plane, ++planeN); const k = mat.uuid + ':' + planeId.get(plane); if (!clipMats.has(k)) { const m = mat.clone(); m.clippingPlanes = [plane]; m.clipShadows = true; clipMats.set(k, m); } return clipMats.get(k); }

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
/* the compacted subgrade: dark, tight, fine; the loose subgrade: light, crumbly with clods */
function subTex(loose, seed) {
  return canvasTex(512, 256, (x, w, h) => {
    const r = mulberry32(seed); x.fillStyle = loose ? '#a8835a' : '#6f5338'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < (loose ? 900 : 5200); i++) { const v = r(); x.fillStyle = v < .4 ? 'rgba(30,16,4,.16)' : v < .8 ? 'rgba(255,230,190,.13)' : 'rgba(120,120,115,.3)'; const s = loose ? 2 + r() * 7 : .8 + r() * 2.2; x.beginPath(); x.ellipse(r() * w, r() * h, s, s * (.5 + r() * .5), r() * 3, 0, TAU); x.fill(); }
    if (!loose) for (let i = 0; i < 26; i++) { x.strokeStyle = 'rgba(255,235,200,.07)'; x.lineWidth = 3; x.beginPath(); const yy = r() * h; x.moveTo(0, yy); x.lineTo(w, yy + (r() - .5) * 6); x.stroke(); }
  }, true);
}
const TX = {
  soilA: soilTex(5), soilB: soilTex(17), soilC: soilTex(29), conc: speckTex('#bdbbb5', 9000, 3, 512), concDark: speckTex('#8d8c88', 11000, 8, 512, .14), matrix: speckTex('#868583', 16000, 12, 512, .16),
  pcc: speckTex('#a6a49f', 14000, 21, 512, .12),
  fresh: canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = '#a2a3a2'; x.fillRect(0, 0, w, h); const r = mulberry32(44);
    for (let i = 0; i < 26; i++) { x.fillStyle = r() < .5 ? 'rgba(40,40,44,.06)' : 'rgba(255,255,255,.07)'; x.beginPath(); x.ellipse(r() * w, r() * h, 20 + r() * 80, 6 + r() * 26, (r() - .5) * .5, 0, TAU); x.fill(); }
    for (let i = 0; i < 6000; i++) { x.fillStyle = r() < .5 ? 'rgba(0,0,0,.07)' : 'rgba(255,255,255,.07)'; x.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
  }, true),
  rib: canvasTex(64, 64, (x, w, h) => { x.fillStyle = '#808080'; x.fillRect(0, 0, w, h); x.fillStyle = '#d0d0d0'; for (let i = 0; i < 8; i++) x.fillRect(0, i * 8, w, 3); }, false),
  loose: subTex(true, 9), tight: subTex(false, 10),
};
[TX.soilA, TX.soilB, TX.soilC, TX.conc, TX.concDark, TX.matrix, TX.pcc, TX.fresh, TX.loose, TX.tight].forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; });

const mat = o => new THREE.MeshStandardMaterial(o), phys = o => new THREE.MeshPhysicalMaterial(o);
function ribbed(len, r) {
  const n = Math.max(2, Math.round(len / .075)), pts = [];
  for (let i = 0; i <= n; i++) pts.push(new THREE.Vector2(i % 2 ? r * 1.22 : r, i / n * len));
  const g = new THREE.LatheGeometry(pts, 8); g.rotateZ(-Math.PI / 2); return g;
}
function pulsify(m, u) {
  m.onBeforeCompile = sh => {
    sh.uniforms.uPx = u;
    sh.vertexShader = 'varying vec3 vW;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vW=(modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader = 'varying vec3 vW;uniform float uPx;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n float gg=exp(-pow((vW.x-uPx)*1.1,2.));totalEmissiveRadiance+=vec3(1.,.36,.12)*gg*1.15;');
  }; m.customProgramCacheKey = () => 'f3pulse'; return m;
}

/* stones scattered in a rectangle, kept clear of given horizontal bands, circles and each other (returns {x,y,s}) */
function scatter(seed, n, x0, x1, y0, y1, smin, smax, avoid, fixed) {
  const r = mulberry32(seed), out = (fixed || []).slice(); let tries = 0;
  while (out.length < n + (fixed || []).length && tries++ < 6000) {
    const s = smin + r() * (smax - smin), x = x0 + s + r() * (x1 - x0 - 2 * s), y = y0 + s * .75 + r() * (y1 - y0 - 1.5 * s);
    if (avoid && avoid(x, y, s)) continue;
    if (out.some(o => Math.hypot(o.x - x, (o.y - y) * 1.1) < (o.s + s) * 1.02)) continue;
    out.push({ x, y, s });
  }
  return out;
}
function stoneSet(parent, list, mat, seed, z0) {
  const r = mulberry32(seed), o = new THREE.Object3D(), buckets = STONES.map(() => []);
  list.forEach((p, i) => buckets[i % STONES.length].push(p));
  buckets.forEach((arr, v) => {
    if (!arr.length) return; const im = new THREE.InstancedMesh(STONES[v], mat, arr.length);
    arr.forEach((p, i) => { o.position.set(p.x, p.y, z0 + r() * .04); o.scale.set(p.s * (1 + r() * .35), p.s * (.78 + r() * .3), p.s * .6); o.rotation.set(r() * .5, r() * .5, r() * 6); o.updateMatrix(); im.setMatrixAt(i, o.matrix); const t = .74 + r() * .5; im.setColorAt(i, new THREE.Color(t, t * .99, t * .97)); });
    im.castShadow = true; im.receiveShadow = true; parent.add(im);
  });
}

/* ═════════════ the scene ═════════════ */
export function buildWorld(R) {
  const scene = new THREE.Scene(); scene.environment = makeEnv(R);
  const key = new THREE.DirectionalLight(0xfff1e0, 2.1); key.position.set(-7, 11, 13); key.target.position.set(0, -1.5, 0); scene.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -11, right: 11, top: 7, bottom: -7, near: 1, far: 40 }); key.shadow.bias = -.0005; key.shadow.normalBias = .03;
  const rim = new THREE.DirectionalLight(0xff9a70, .35); rim.position.set(9, 4, -6); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xfff6ea, 0xc9b9a4, .35));
  const W = { scene, key, planes: { cPcc, cRc, cRX, cCage, cComp, cLoose } };

  /* —— soil: two side walls and the bed under the pit, layered, with pebbles in the cut faces —— */
  const soilMat = (tex, rx, ry) => { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return mat({ map: t, bumpMap: t, bumpScale: 2.2, roughness: .96 }); };
  const soilDark = mat({ color: 0x3f2a18, roughness: 1 });
  function soilBlock(x0, x1, y0, y1, tex, seed) {
    const w = x1 - x0, h = y1 - y0, g = new THREE.Group();
    const geo = new THREE.PlaneGeometry(w, h, Math.max(4, Math.round(w * 9)), Math.max(4, Math.round(h * 9))), p = geo.attributes.position, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) + cx, y = p.getY(i) + cy; const n = Math.sin(x * 3.1 + seed) * Math.cos(y * 2.7 + seed * 1.3) * .5 + Math.sin(x * 9.7 + y * 7.1 + seed) * .25; p.setZ(i, n * .08); }
    geo.computeVertexNormals(); const f = mk(geo, soilMat(tex, w / 4.2, h / 2.4)); f.position.set(cx, cy, 0); g.add(f);
    put(g, mk(new THREE.BoxGeometry(w, h, DEP), soilDark), cx, cy, -DEP / 2 - .06);
    put(g, mk(new THREE.BoxGeometry(w, .03, DEP), mat({ map: TX.soilC, roughness: 1, color: 0xb59a78 })), cx, y1 + .015, -DEP / 2);
    return g;
  }
  const soil = new THREE.Group(); scene.add(soil);
  soil.add(soilBlock(-9.6, -PIT, -5.6, GROUND, TX.soilA, 1.7));
  soil.add(soilBlock(PIT, 9.6, -5.6, GROUND, TX.soilB, 4.1));
  soil.add(soilBlock(-PIT, PIT, -5.6, SUB - .12, TX.soilC, 7.3));
  const pebM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9 }), rp = mulberry32(88);
  [[-9.5, -PIT - .03, -5.5, GROUND - .1, 90], [PIT + .03, 9.5, -5.5, GROUND - .1, 90], [-PIT, PIT, -5.5, SUB - .2, 110]].forEach(([a, b, c, d, n], j) => {
    for (let v = 0; v < 2; v++) {
      const im = new THREE.InstancedMesh(STONES[(j * 2 + v) % STONES.length], pebM, n), o = new THREE.Object3D();
      for (let i = 0; i < n; i++) { const s = .03 + rp() * .075; o.position.set(a + rp() * (b - a), c + rp() * (d - c), .035); o.scale.set(s, s * .8, s * .5); o.rotation.set(rp() * 6, rp() * 6, rp() * 6); o.updateMatrix(); im.setMatrixAt(i, o.matrix); im.setColorAt(i, new THREE.Color().setHSL(.07 + rp() * .03, .2 + rp() * .2, .45 + rp() * .35)); }
      im.castShadow = false; soil.add(im);
    }
  });
  /* the subgrade surface: a thin compacted bed that is loose on one side of the compactor and tight on the other */
  const bedW = PIT * 2, bedMat = (tex, plane) => cm(mat({ map: tex, bumpMap: tex, bumpScale: 1.6, roughness: 1 }), plane);
  const mkBed = (tex, plane) => { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(bedW / 2.6, 1); const m = mat({ map: t, bumpMap: t, bumpScale: 1.8, roughness: 1 }); const b = mk(new THREE.BoxGeometry(bedW, .12, DEP), cm(m, plane)); b.position.set(0, SUB - .06, -DEP / 2); scene.add(b); return b; };
  mkBed(TX.loose, cLoose); mkBed(TX.tight, cComp);
  /* gravel on the subgrade front edge, so the surface reads as a prepared bed */
  { const gM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9 }), rg = mulberry32(31), o = new THREE.Object3D();
    const im = new THREE.InstancedMesh(STONES[0], cm(gM, cLoose), 140); for (let i = 0; i < 140; i++) { const s = .035 + rg() * .05; o.position.set(-PIT + rg() * bedW, SUB + .01, -.05 - rg() * DEP * .94); o.scale.set(s, s * .6, s * .8); o.rotation.set(rg() * 6, rg() * 6, rg() * 6); o.updateMatrix(); im.setMatrixAt(i, o.matrix); const t = .55 + rg() * .5; im.setColorAt(i, new THREE.Color(t, t * .96, t * .9)); } scene.add(im); }

  /* —— PCC layer: plain concrete, no reinforcement; one big stone is the 40 mm stone that is circled —— */
  const pccG = new THREE.Group(); scene.add(pccG); const pw = PIT * 2, pt = PCC_T - SUB;
  const pccTex = TX.pcc.clone(); pccTex.needsUpdate = true; pccTex.repeat.set(pw / 3, pt / 3);
  const pccFace = mk(new THREE.PlaneGeometry(pw, pt, 40, 6), cm(mat({ map: pccTex, bumpMap: pccTex, bumpScale: 2, roughness: .92 }), cPcc)); pccFace.position.set(0, (SUB + PCC_T) / 2, .005); pccG.add(pccFace);
  put(pccG, mk(new THREE.BoxGeometry(pw, pt, DEP), cm(mat({ color: 0x7a7977, roughness: 1 }), cPcc)), 0, (SUB + PCC_T) / 2, -DEP / 2 - .01);
  const pccStone = cm(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8 }), cPcc);
  W.hiP = { x: -2.55, y: -2.6, s: .3 };
  stoneSet(pccG, scatter(61, 36, -PIT + .15, PIT - .15, SUB + .02, PCC_T - .02, .14, .26, null, [W.hiP]), pccStone, 62, .0);
  W.pccG = pccG;

  /* —— reinforced foundation: two mats of ribbed bars (ends show in the section), orange spacer clips, a starter cage —— */
  const pulse = { value: -99 };
  const steelBar = pulsify(cm(phys({ color: 0x55575c, metalness: .85, roughness: .38, bumpMap: TX.rib, bumpScale: .4, clearcoat: .15 }), cRX), pulse);
  const rustBar = pulsify(cm(phys({ color: 0x8c3d1a, metalness: .6, roughness: .46, bumpMap: TX.rib, bumpScale: .5 }), cCage), pulse);
  const rustMat = pulsify(cm(phys({ color: 0x8c3d1a, metalness: .6, roughness: .46, bumpMap: TX.rib, bumpScale: .5 }), cRX), pulse);
  const clipOr = pulsify(cm(phys({ color: 0xff5e29, metalness: .1, roughness: .38, clearcoat: .6 }), cRX), pulse);
  const clipOrY = pulsify(cm(phys({ color: 0xff5e29, metalness: .1, roughness: .38, clearcoat: .6 }), cCage), pulse);
  const rebar = new THREE.Group(); scene.add(rebar); W.rebar = rebar;
  const bx0 = -PIT + .35, bx1 = PIT - .35, BL = bx1 - bx0, TS = .55;
  BAR_Y.forEach((y, mi) => {
    const geo = ribbed(BL, .04); [.13, -.62].forEach(z => { const b = mk(geo, steelBar); b.position.set(bx0, y, z); rebar.add(b); });
    for (let x = bx0 + .2; x < bx1 - .1; x += TS) {   /* transverse bars: their ends are the dots seen in the section */
      const t = mk(new THREE.CylinderGeometry(.04, .04, DEP * .78, 10), mi ? rustMat : steelBar); t.rotation.x = Math.PI / 2; t.position.set(x, y + (mi ? .08 : -.08), -.44); rebar.add(t);
      const e = mk(new THREE.CylinderGeometry(.042, .042, .05, 10), mi ? rustMat : steelBar); e.rotation.x = Math.PI / 2; e.position.set(x, y + (mi ? .08 : -.08), .06); rebar.add(e);
      if (Math.round((x - bx0) / TS) % 2 === 0) { const c = mk(rbox(.12, .15, .17, .03, .01), clipOr); c.position.set(x, y + (mi ? .02 : -.02), .12); rebar.add(c); }
    }
  });
  const cageTop = 2.0, cageBot = BAR_Y[0] - .04, CH = cageTop - cageBot, cages = [];
  [0].forEach(cx => {
    const g = new THREE.Group(); g.position.set(cx, 0, 0); rebar.add(g); cages.push(g);
    const rg = ribbed(CH, .028); rg.rotateZ(Math.PI / 2);
    [[-.22, .12], [.22, .12], [-.22, -.3], [.22, -.3]].forEach(([dx, dz]) => { const b = mk(rg.clone(), rustBar); b.position.set(dx, cageBot, dz); g.add(b); });
    for (let y = cageBot + .2; y < cageTop - .05; y += .31) {
      [.12, -.3].forEach(z => { const ln = mk(new THREE.CylinderGeometry(.021, .021, .56, 8), rustBar); ln.rotation.z = Math.PI / 2; ln.position.set(0, y, z); g.add(ln); });
      [-.22, .22].forEach(dx => { const lz = mk(new THREE.CylinderGeometry(.02, .02, .42, 8), rustBar); lz.rotation.x = Math.PI / 2; lz.position.set(dx, y, -.09); g.add(lz); });
      if (Math.round((y - cageBot) / .31) % 2 === 0) [-.22, .22].forEach(dx => { const c = mk(rbox(.075, .06, .08, .02, .008), clipOrY); c.position.set(dx, y, .15); g.add(c); });
    }
  });
  W.cages = cages; W.pulse = pulse;

  /* —— reinforced concrete: the structural layer, stones kept clear of bars and starter bars —— */
  const rcG = new THREE.Group(); scene.add(rcG); const rw = PIT * 2, rt = RC_T - PCC_T;
  const rcTex = TX.matrix.clone(); rcTex.needsUpdate = true; rcTex.repeat.set(rw / 3, rt / 3);
  const rcFace = mk(new THREE.PlaneGeometry(rw, rt, 40, 8), cm(mat({ map: rcTex, bumpMap: rcTex, bumpScale: 2, roughness: .9, color: 0xdad8d2 }), cRc)); rcFace.position.set(0, (PCC_T + RC_T) / 2, -.04); rcG.add(rcFace);
  put(rcG, mk(new THREE.BoxGeometry(rw, rt, DEP), cm(mat({ color: 0x77767a, roughness: 1 }), cRc)), 0, (PCC_T + RC_T) / 2, -DEP / 2 - .05);
  const rcStone = cm(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8 }), cRc);
  const clearOf = (x, y, s) => BAR_Y.some(by => Math.abs(y - by) < s + .2) || [0].some(cx => Math.abs(x - cx) < s + .42);
  W.hiR = { x: 1.55, y: -1.45, s: .3 };
  stoneSet(rcG, scatter(73, 64, -PIT + .15, PIT - .15, PCC_T + .02, RC_T - .02, .12, .27, clearOf, [W.hiR]), rcStone, 74, -.07);
  W.rcG = rcG;
  /* the fresh top of each placed layer */
  const freshTex = TX.fresh.clone(); freshTex.needsUpdate = true; freshTex.repeat.set(4, 1);
  const freshMat = phys({ color: 0xc2c3c1, roughness: .32, map: freshTex, bumpMap: freshTex, bumpScale: .5, clearcoat: .7, clearcoatRoughness: .25, envMapIntensity: 1.1 });
  const mkFresh = () => { const m = mk(new THREE.PlaneGeometry(PIT * 2, DEP, 30, 1), freshMat); m.rotation.x = -Math.PI / 2; m.castShadow = false; m.visible = false; scene.add(m); return m; };
  const freshP = mkFresh(), freshR = mkFresh(); freshP.position.z = freshR.position.z = -DEP / 2;
  { const r = mulberry32(5); [freshP, freshR].forEach(f => { const p = f.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, (Math.sin(p.getX(i) * 4.1 + i) * .5 + (r() - .5) * .3) * .004); f.geometry.computeVertexNormals(); }); }

  /* —— the plate compactor (works the subgrade in step 1) —— */
  const comp = new THREE.Group(); scene.add(comp); comp.position.z = -.55;
  const plate = mk(new THREE.BoxGeometry(1.0, .12, .8), mat({ color: 0x38393d, metalness: .8, roughness: .42 })); plate.position.y = .06; comp.add(plate);
  const body = mk(rbox(.72, .55, .62, .1, .03), M.orange); body.position.set(-.04, .45, 0); comp.add(body);
  put(comp, mk(new THREE.BoxGeometry(.5, .16, .5), mat({ color: 0x2a2c30, metalness: .6, roughness: .5 })), -.08, .18, 0);
  [-.18, .18].forEach(dz => { const hd = cyl(.025, .025, 1.415, mat({ color: 0x2a2c30, metalness: .7, roughness: .4 }), 8); hd.position.set(-.725, .9, dz); hd.rotation.z = .559; comp.add(hd); });
  { const g = cyl(.03, .03, .5, M.black, 10); g.rotation.x = Math.PI / 2; g.position.set(-1.1, 1.5, 0); comp.add(g); }
  put(comp, cyl(.07, .07, .14, M.chrome, 12), .12, .84, .1);
  W.comp = comp;

  /* —— the timeline —— */
  W.state = t => {
    key.intensity = lerp(1.7, 2.1, sm(seg(t, 0, 1.2)));
    /* step 1: compactor sweeps left to right; behind it the subgrade is tight, ahead of it loose */
    const cx = lerp(-5.5, 6.6, eio(seg(t, .5, 3.7))), leave = eio(seg(t, 3.7, 4.6));
    comp.position.x = cx + leave * 4.5; comp.visible = t < 4.7;
    const vib = Math.sin(t * 60) * .006 * (t > .5 && t < 3.7 ? 1 : 0); comp.position.y = SUB + vib; comp.rotation.z = Math.sin(t * 47) * .004 * (t > .5 && t < 3.7 ? 1 : 0);
    cComp.constant = t < .5 ? -8 : t > 3.8 ? 99 : (cx - .5); cLoose.constant = t < .5 ? 8 : t > 3.8 ? -99 : -(cx - .5);
    /* step 2: plain concrete rises */
    const p = eio(seg(t, 4.5, 7.4)); cPcc.constant = t < 4.5 ? SUB - .01 : lerp(SUB, PCC_T + .02, p) + (t > 7.5 ? 99 : 0);
    freshP.visible = t > 4.55; freshP.position.y = Math.min(PCC_T, SUB + (PCC_T - SUB) * p) + .004;
    /* step 3: mats slide in (left to right), the starter cages rise, then the structural concrete rises around them */
    const r = eio(seg(t, 8.3, 9.9)); cRX.constant = t < 8.3 ? -8 : lerp(-PIT - .5, PIT + .5, r) + (t > 10 ? 99 : 0);
    const c = eio(seg(t, 9.6, 10.9)); cCage.constant = t < 9.6 ? -3.4 : lerp(-3.2, 2.2, c) + (t > 11 ? 99 : 0);
    pulse.value = t > 8.5 && t < 11.0 ? lerp(-7, 7, seg(t, 8.5, 10.8)) : -99;
    const q = eio(seg(t, 11.0, 13.4)); cRc.constant = t < 11 ? PCC_T - .01 : lerp(PCC_T, RC_T + .02, q) + (t > 13.5 ? 99 : 0);
    freshR.visible = t > 11.05; freshR.position.y = Math.min(RC_T, PCC_T + (RC_T - PCC_T) * q) + .004;
  };
  return W;
}

/* ═════════════ runtime ═════════════ */
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const LABELS = { sub: [3.2, 3.8], pcc: [7.0, 7.6], ring1: [7.4, 8.0], rc: [13.0, 13.5], mats: [12.0, 12.6], cage: [12.5, 13.1], ring2: [13.3, 13.9], thick: [7.0, 7.6] };
function stepAt(t) { return t < 4 ? 1 : t < 8 ? 2 : 3; }

export class FoundFigure {
  constructor(fig) { this.fig = fig; this.cv = fig.querySelector('canvas.f3-cv'); this.t = 0; this.stopAt = END; this.playing = false; this.paused = false; this.vis = false; this.started = false; this.hold = 0; this.step = 0; this.dirty = true; this.q = 1; }
  async boot() {
    const R = this.R = new THREE.WebGLRenderer({ canvas: this.cv, antialias: true, alpha: true, powerPreference: 'high-performance' });
    R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.04; R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap; R.localClippingEnabled = true; R.setClearColor(0, 0);
    this.world = buildWorld(R);
    const d = 36, fov = 2 * Math.atan((8.87 / 2) / d) / D2R; this.cam = new THREE.PerspectiveCamera(fov, 2, 5, 120); const el = 9 * D2R; this.el = el; this.look = new V3(0, 398 / 100 - 443.5 / 100, 0); this.camBase = new V3(0, this.look.y + d * Math.sin(el), d * Math.cos(el));
    this.cv.addEventListener('webglcontextlost', e => { e.preventDefault(); this.fig.classList.remove('f3-on'); this.lost = true; });
    this.cv.addEventListener('webglcontextrestored', () => { this.lost = false; this.fig.classList.add('f3-on'); this.dirty = true; this.wake(); });
    this.size();
    /* warm-up: compile every shader and upload every texture while the figure is still off screen, then draw the first frame (t = 0 equals the poster) */

    /* compile every shader of every phase in parallel, off the main thread, and draw the warm-up frames one per animation frame: the synchronous first draws linked the shaders on the main thread (a 1-2 s freeze while the page was loading or scrolling) */
    R.debug.checkShaderErrors = false; for (const t0 of [0, 3, 6, 9, 12]) { this.world.state(t0); try { await R.compileAsync(this.world.scene, this.cam); await compileShadows(R, this.world.scene, this.cam); R.shadowMap.needsUpdate = true; await warmProgressive(R, this.world.scene, this.cam); } catch (e) {} this.draw(t0); }
    this.labels(0); this.draw(0);
    this.fig.classList.add('f3-on'); this.ready = true;
    this.io = new IntersectionObserver(es => { this.vis = es[0].isIntersecting; if (this.vis && !this.started) { this.started = true; if (reduceMotion) { this.t = END; this.draw(END); this.labels(END); this.emit(3); } else this.play(0, END); } this.wake(); }, { threshold: .4 });
    this.io.observe(this.fig);
    new ResizeObserver(() => { this.size(); this.dirty = true; this.wake(); }).observe(this.fig);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.wake(); });
    return this;
  }
  size() { const w = this.cv.clientWidth || 800, h = this.cv.clientHeight || 400, dpr = Math.min(window.devicePixelRatio || 1, matchMedia('(hover:none)').matches ? 1.4 : 1.75) * this.q; const W = Math.round(w * dpr), H = Math.round(h * dpr); if (this.R.domElement.width !== W || this.R.domElement.height !== H) this.R.setSize(W, H, false); this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); }
  draw(t) {
    const w = this.world; w.state(t);
    const z = lerp(1.045, 1, sm(seg(t, 0, 12))) / Math.cos(this.el); this.cam.zoom = z; this.cam.updateProjectionMatrix();
    this.cam.position.set(this.camBase.x + (1 - sm(seg(t, 0, 12))) * .12, this.camBase.y, this.camBase.z); this.cam.lookAt(this.look.x, this.look.y, 0);
    this.R.render(w.scene, this.cam);
  }
  labels(t) {
    for (const k in LABELS) { const g = this.fig.querySelector('[data-lab=' + k + ']'); if (!g) continue; const a = sm(seg(t, LABELS[k][0], LABELS[k][1])); g.style.opacity = a; const ln = g.querySelector('.ldr'); if (ln) ln.style.strokeDashoffset = 1 - a; }
    const grid = this.fig.querySelector('.f3-grid'); if (grid) grid.style.opacity = 1;
  }
  emit(n) { if (n === this.step) return; this.step = n; this.fig.setAttribute('data-step', n); this.fig.dispatchEvent(new CustomEvent('f3step', { detail: n, bubbles: true })); }
  play(from, to) { this.t = from; this.stopAt = to; this.playing = true; this.paused = false; this.hold = 0; this.fig.classList.add('f3-run'); this.syncBtn(); this.wake(); }
  jumpStep(n) { const [a, b] = STEPS[n - 1]; this.fig.classList.add('f3-run'); this.started = true; if (reduceMotion) { this.t = b; this.draw(b); this.labels(b); this.emit(n); return; } this.play(a, b); this.emit(n); }
  replay() { this.fig.classList.add('f3-run'); if (reduceMotion) { this.t = END; this.draw(END); this.labels(END); return; } this.play(0, END); }
  toggle() { this.paused = !this.paused; this.syncBtn(); this.wake(); }
  syncBtn() { const b = this.fig.querySelector('[data-f3=pause]'); if (b) { b.textContent = this.paused ? 'Play' : 'Pause'; b.setAttribute('aria-pressed', this.paused ? 'true' : 'false'); } }
  wake() { if (!this.raf && this.vis && !document.hidden && !this.lost) { this.last = performance.now(); this.raf = requestAnimationFrame(n => this.loop(n)); } }
  loop(now) {
    this.raf = 0; const dt = Math.min(.05, (now - this.last) / 1000); this.last = now;
    if (!this.paused) {
      if (this.playing) { this.t += dt; if (this.t >= this.stopAt) { this.t = this.stopAt; this.playing = false; } this.dirty = true; }
    }
    if (this.dirty) { const a = performance.now(); this.draw(this.t); this.labels(Math.min(this.t, END)); this.emit(stepAt(Math.min(this.t, END - .001))); const ms = performance.now() - a; if (ms > 34) { this.slow = (this.slow || 0) + 1; if (this.slow > 20 && this.q > .6) { this.q = .75; this.size(); this.slow = 0; } } this.dirty = false; }
    if (this.playing) this.raf = requestAnimationFrame(n => this.loop(n));
  }
  poster(w, h, t) { this.R.setSize(w, h, false); this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); this.draw(t); this.labels(t); return this.R.domElement.toDataURL('image/png'); }
}
export async function init(fig) { const p = new FoundFigure(fig); await p.boot(); fig.__f3 = p; window.__f3 = p; return p; }
