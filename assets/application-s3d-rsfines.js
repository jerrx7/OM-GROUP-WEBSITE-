/* scene: two different ways of looking at the fine material in a sand sample (River Sand page, "Silt and fines").
   Left: a field silt-jar screening: a thick-walled glass jar of water in which sand, silt and a thin clay film settle in layers (each layer a painted section with its own grain size, a settling animation).
   Right: a laboratory determination of material finer than 75 microns: a brass 75 µm IS test sieve with a woven wire mesh, a sample of river sand on it, the fines passing through to an enamel pan.
   Sand grains are the worn river grains of application-s3d-msand.js. The two methods measure different things and must not be compared as if they were the same number. No percentage, result or limit is
   shown on the 3D model; layer heights and particle counts are drawn for the picture. Numbered markers, key beside the figure. */
import { THREE, studio, rng } from '/assets/application-s3d.js';
import { crushed, grainMat, plant, mineral, buildHeap, sandOf } from '/assets/application-s3d-msand.js';
import { cvs, tex, rgb, wrapDraw } from '/assets/application-s3d-msmasonry.js';
const V3 = THREE.Vector3, TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), sm = v => { v = clamp(v); return v * v * (3 - 2 * v); };
const JX = -8.5, SX = 8.5, JR = 2.1, JH = 7.2, FL = .55;         /* jar floor level */

export function speck(g, r, W, H, n, sz, cols, a0, a1) { const st = []; cols.forEach(c => { for (let k = 0; k < 4; k++) st.push(c.replace('A', (a0 + (a1 - a0) * (k + .5) / 4).toFixed(2))); }); const per = st.map(() => []); for (let i = 0; i < n; i++) { const k = (r() * st.length) | 0, q = sz * (.5 + r() * 1.5); per[k].push(r() * W, r() * H, q); } per.forEach((a, k) => { g.fillStyle = st[k]; for (let i = 0; i < a.length; i += 3) g.fillRect(a[i], a[i + 1], a[i + 2], a[i + 2]); }); }
/* a painted section through a settled layer: matrix colour, optional faceted grains (n of about s px), fine speckle */
export function sedTex(seed, base, grains, fine, W = 1024, H = 256) {
  const r = rng(seed), c = cvs(W, H), g = c.getContext('2d'), hc = cvs(W, H), hg = hc.getContext('2d');
  g.fillStyle = rgb(...base); g.fillRect(0, 0, W, H); hg.fillStyle = '#707070'; hg.fillRect(0, 0, W, H);
  for (let i = 0; i < 24; i++) { const x = r() * W, y = r() * H, q = 40 + r() * 110, dk = r() < .5, gr = g.createRadialGradient(x, y, 0, x, y, q), col = dk ? [base[0] * .82, base[1] * .82, base[2] * .82] : [Math.min(255, base[0] * 1.15), Math.min(255, base[1] * 1.15), Math.min(255, base[2] * 1.12)]; gr.addColorStop(0, rgb(...col, .3)); gr.addColorStop(1, rgb(...col, 0)); g.fillStyle = gr; wrapDraw(g, W, H, () => g.fillRect(x - q, y - q, q * 2, q * 2)); }
  grains.forEach(([n, s, cols]) => { for (let i = 0; i < n; i++) { const x = r() * W, y = r() * H, q = s * (.6 + r() * .8), col = cols[(r() * cols.length) | 0], a0 = r() * TAU, k = 6 + ((r() * 3) | 0), sh = .8 + r() * .3;
    g.beginPath(); for (let t = 0; t < k; t++) { const a = t / k * TAU + a0, rr = q * (.78 + r() * .3); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * sh); } g.closePath();
    const gr = g.createRadialGradient(x - q * .3, y - q * .35, q * .1, x, y, q * 1.05); gr.addColorStop(0, rgb(Math.min(255, col[0] * 1.2), Math.min(255, col[1] * 1.2), Math.min(255, col[2] * 1.2), .98)); gr.addColorStop(1, rgb(col[0] * .76, col[1] * .76, col[2] * .76, .98)); g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(24,20,16,.55)'; g.lineWidth = Math.max(.8, q * .07); g.stroke();
    hg.beginPath(); hg.arc(x, y, q, 0, TAU); hg.fillStyle = 'rgba(255,255,255,.5)'; hg.fill(); } });
  fine.forEach(([n, s, cols]) => { speck(g, r, W, H, n, s, cols, .3, .85); speck(hg, r, W, H, n, s, ['rgba(255,255,255,A)', 'rgba(0,0,0,A)'], .3, .7); });
  const m = tex(c), b = tex(hc, false); m.repeat.set(2, 1); b.repeat.set(2, 1); return { map: m, bump: b };
}
/* plain-weave wire cloth: colour (shaded wires) and alpha (open holes) */
function weaveTex() {
  const N = 128, P = 16, Wd = 9, c = cvs(N, N), g = c.getContext('2d'), a = cvs(N, N), ag = a.getContext('2d'), hc = cvs(N, N), hg = hc.getContext('2d');
  g.fillStyle = '#17181a'; g.fillRect(0, 0, N, N); ag.fillStyle = '#000'; ag.fillRect(0, 0, N, N); hg.fillStyle = '#404040'; hg.fillRect(0, 0, N, N);
  const wire = (x, y, w, h, vert, over) => { const gr = vert ? g.createLinearGradient(x, 0, x + w, 0) : g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, over ? '#7a7e84' : '#4a4d52'); gr.addColorStop(.35, over ? '#e2e5e9' : '#9da1a7'); gr.addColorStop(.7, over ? '#a9adb3' : '#6c7076'); gr.addColorStop(1, over ? '#6d7177' : '#3c3f43'); g.fillStyle = gr; g.fillRect(x, y, w, h); ag.fillStyle = '#fff'; ag.fillRect(x, y, w, h); hg.fillStyle = over ? '#e8e8e8' : '#9a9a9a'; hg.fillRect(x, y, w, h); };
  for (let i = 0; i < N / P; i++) for (let j = 0; j < N / P; j++) {
    const x = i * P, y = j * P, over = (i + j) % 2 === 0, cx = x + (P - Wd) / 2, cy = y + (P - Wd) / 2;
    wire(cx, y, Wd, P, true, !over); wire(x, cy, P, Wd, false, over);        /* warp then weft; the one on top is drawn last */
    if (over) wire(x, cy, P, Wd, false, true); else wire(cx, y, Wd, P, true, true);
  }
  const mt = tex(c), at = tex(a, false), bt = tex(hc, false); [mt, at, bt].forEach(t => t.repeat.set(26, 26)); return { map: mt, alpha: at, bump: bt };
}

export default function build({ state } = {}) {
  const SO = sandOf(state), TT = SO.TT || [2.5, 1.85, 1.05];                /* the sand's own tint (warm river grains by default) */
  const scene = new THREE.Scene(), { key } = studio(scene, { ext: 22, key: 2.5, shadow: 0, map: 4096, ground: false });
  key.shadow.bias = -.0001; key.shadow.normalBias = .02;
  const G = { tiny: [0, 1, 2].map(i => crushed(500 + i * 11, 'tiny')), roundS: [0, 1, 2, 3].map(i => crushed(800 + i * 7, 'round')), sub: [0, 1, 2].map(i => crushed(900 + i * 17, 'sub')) };
  const matR = grainMat({ bump: .05, rough: .62 });
  const rs = rng(21);

  /* the bench: pale speckled laminate */
  { const b = cvs(512, 512), g = b.getContext('2d'), rr = rng(5); g.fillStyle = '#d4d1ca'; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 14000; i++) { const v = 188 + rr() * 50 | 0; g.fillStyle = 'rgba(' + v + ',' + v + ',' + (v - 5) + ',.55)'; g.fillRect(rr() * 512, rr() * 512, 1.2 + rr() * 1.4, 1.2 + rr() * 1.4); }
    const t = tex(b); t.repeat.set(60, 36); const bench = new THREE.Mesh(new THREE.BoxGeometry(260, 1, 160), new THREE.MeshStandardMaterial({ map: t, roughness: .5, metalness: 0, envMapIntensity: .8 })); bench.position.set(0, -.5, 0); bench.receiveShadow = true; scene.add(bench); }

  /* ───────── the field silt jar ───────── */
  const jar = new THREE.Group(); jar.position.set(JX, 0, 0); scene.add(jar);
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0xeaf3f1, roughness: .03, metalness: 0, transparent: true, opacity: .2, side: THREE.DoubleSide, depthWrite: false, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 2.4, ior: 1.5 });
  const jprof = [[0, 0], [JR + .15, 0], [JR + .27, .12], [JR + .27, JH + .25], [JR + .36, JH + .38], [JR + .24, JH + .52], [JR + .06, JH + .42], [JR, JH + .22], [JR, FL + .1], [JR - .35, FL], [0, FL]].map(p => new THREE.Vector2(p[0], p[1]));
  const glass = new THREE.Mesh(new THREE.LatheGeometry(jprof, 96), glassM); glass.renderOrder = 8; glass.castShadow = false; jar.add(glass);
  const wprof = (h) => [[0, FL], [JR - .02, FL], [JR - .02, FL + h]].map(p => new THREE.Vector2(p[0], p[1]));
  const waterM = new THREE.MeshPhysicalMaterial({ color: 0x5aa5c6, roughness: .05, metalness: 0, transparent: true, opacity: .3, depthWrite: false, clearcoat: .25, clearcoatRoughness: .1, envMapIntensity: .8 });
  const water = new THREE.Mesh(new THREE.CylinderGeometry(JR - .02, JR - .02, JH - 1.1, 64), waterM); water.position.y = FL + (JH - 1.1) / 2; water.renderOrder = 4; jar.add(water);
  { const s = new THREE.Mesh(new THREE.CircleGeometry(JR - .03, 64), new THREE.MeshPhysicalMaterial({ color: 0xcfe6ee, roughness: .03, transparent: true, opacity: .35, depthWrite: false, clearcoat: 1, envMapIntensity: 2.4 })); s.rotation.x = -Math.PI / 2; s.position.y = FL + JH - 1.1; s.renderOrder = 5; jar.add(s); }
  /* the settled layers: sand (grains you can see), silt (very fine, grey-brown) and a thin clay-coloured film */
  const RC = [[214, 182, 136], [172, 134, 92], [118, 98, 80], [238, 220, 180], [88, 74, 64], [192, 128, 88]];
  const LP = [{ seed: 61, base: [196, 152, 98], g: [[560, 7, RC]], f: [[16000, 1.8, RC.map(c => rgb(...c, 'A'))]] }, { seed: 62, base: [150, 128, 104], g: [[300, 3, [[170, 156, 134], [112, 102, 90], [190, 176, 150]]]], f: [[26000, 1.4, ['rgba(160,148,128,A)', 'rgba(96,88,78,A)', 'rgba(188,174,150,A)']]] }, { seed: 63, base: [150, 112, 90], g: [[160, 3, [[150, 130, 110], [110, 96, 84], [170, 150, 126]]]], f: [[16000, 1.2, ['rgba(168,146,124,A)', 'rgba(96,84,72,A)', 'rgba(190,170,146,A)']]] }];
  const LAYS = [{ h: 2.2, tx: sedTex(61, LP[0].base, LP[0].g, LP[0].f) }, { h: .95, tx: sedTex(62, LP[1].base, LP[1].g, LP[1].f) }, { h: .4, tx: sedTex(63, LP[2].base, LP[2].g, LP[2].f) }];
  const layers = LAYS.map((l, i) => { const side = new THREE.MeshStandardMaterial({ map: l.tx.map, bumpMap: l.tx.bump, bumpScale: i ? 1 : 2.6, roughness: .95, envMapIntensity: .3 }), ct = sedTex(LP[i].seed + 100, LP[i].base, LP[i].g, LP[i].f, 512, 512); ct.map.repeat.set(1, 1); ct.bump.repeat.set(1, 1); const cap = new THREE.MeshStandardMaterial({ map: ct.map, bumpMap: ct.bump, bumpScale: i ? 1 : 2.6, roughness: .95, envMapIntensity: .3 }); const m = new THREE.Mesh(new THREE.CylinderGeometry(JR - .06, JR - .06, 1, 64), [side, cap, cap]); m.castShadow = false; jar.add(m); return m; });
  /* grains in suspension that settle */
  const NS = 380, sus = [0, 1, 2].map(k => { const im = new THREE.InstancedMesh(k === 0 ? G.roundS[0] : G.tiny[k], matR, NS / 3 | 0), col = new THREE.Color(); im.frustumCulled = false; jar.add(im); for (let i = 0; i < im.count; i++) { const c = [mineral(rs), mineral(rs)][0]; col.setRGB(c[0] * TT[0] * .75, c[1] * TT[1] * .75, c[2] * TT[2] * .75); im.setColorAt(i, col); } return im; });
  const sp = sus.map((im, k) => Array.from({ length: im.count }, () => ({ a: rs() * TAU, rr: Math.sqrt(rs()) * (JR - .3), ph: rs(), s: [.12, .075, .05][k] * (.8 + rs() * .5), o: rs() * 6 })));

  /* ───────── the laboratory 75 micron sieve ───────── */
  const lab = new THREE.Group(); lab.position.set(SX, 0, 0); scene.add(lab);
  const brass = new THREE.MeshStandardMaterial({ color: 0xc8a96c, metalness: .88, roughness: .28, envMapIntensity: 1.2 });
  const enamel = new THREE.MeshPhysicalMaterial({ color: 0xf3f1ec, roughness: .24, clearcoat: .6, clearcoatRoughness: .2, envMapIntensity: .9 });
  const pprof = [[0, .08], [2.55, .08], [2.95, .3], [3.38, 1.55], [3.52, 1.8], [3.44, 1.9], [3.3, 1.82], [3.24, 1.7], [2.85, .6], [0, .5]].map(p => new THREE.Vector2(p[0], p[1]));
  const pan = new THREE.Mesh(new THREE.LatheGeometry(pprof, 80), enamel); pan.castShadow = pan.receiveShadow = true; lab.add(pan);
  const sieve = new THREE.Group(); sieve.position.y = 2.55; lab.add(sieve);
  const sprof = [[3.15, -.78], [3.28, -.74], [3.3, -.6], [3.3, .6], [3.4, .66], [3.42, .8], [3.3, .84], [3.18, .76], [3.15, .6], [3.15, -.6]].map(p => new THREE.Vector2(p[0], p[1]));
  const body = new THREE.Mesh(new THREE.LatheGeometry(sprof, 80), new THREE.MeshStandardMaterial({ color: 0xc8a96c, metalness: .88, roughness: .28, envMapIntensity: 1.2, side: THREE.DoubleSide })); body.castShadow = body.receiveShadow = true; sieve.add(body);
  { const rb = new THREE.Mesh(new THREE.TorusGeometry(3.3, .09, 10, 80), brass); rb.rotation.x = Math.PI / 2; rb.position.y = -.1; sieve.add(rb); const rb2 = rb.clone(); rb2.position.y = .35; sieve.add(rb2); }
  const wv = weaveTex();
  const meshM = new THREE.MeshStandardMaterial({ map: wv.map, alphaMap: wv.alpha, alphaTest: .2, bumpMap: wv.bump, bumpScale: 1.6, color: 0xdfe2e6, metalness: .95, roughness: .38, side: THREE.DoubleSide, envMapIntensity: 1 });
  const meshD = new THREE.Mesh(new THREE.CircleGeometry(3.16, 80), meshM); meshD.rotation.x = -Math.PI / 2; meshD.position.y = -.5; meshD.receiveShadow = true; sieve.add(meshD);
  /* the sample on the mesh and the fines that have passed (the same river grains, in a flat heap) */
  const heapAt = (parent, o) => { const h = buildHeap({ R: 15, nC: 0, nM: o.nM, nF: o.nF, nH: 0, seed: o.seed, maxD: .8, gs: .9, TH: Math.tan(o.ang * Math.PI / 180), tint: o.tint, csf: .24 * o.sc * 1.1, csm: .6 * o.sc * 1.1, dust: o.dust }); h.group.scale.setScalar(o.sc); h.group.position.set(0, o.y, 0); parent.add(h.group);
    plant(h.group, h.items.mid, G.roundS, matR, o.seed + 1, true); plant(h.group, h.items.fine, G.tiny, matR, o.seed + 2, false); return h; };
  heapAt(sieve, { sc: .18, y: -.46, nM: 1300, nF: 5000, seed: 71, ang: 17, tint: TT, dust: SO.TT ? SO.dust : .12 });
  heapAt(lab, { sc: .15, y: .52, nM: 500, nF: 6500, seed: 81, ang: 22, tint: [2.7, 2.35, 1.9], dust: .6 });
  const NF = 170, fgm = new THREE.InstancedMesh(G.tiny[2], matR, NF), fc = new THREE.Color(), rf = rng(41); fgm.frustumCulled = false; fgm.castShadow = false; lab.add(fgm);
  const fp = []; for (let i = 0; i < NF; i++) { fp.push({ x: (rf() - .5) * 4.6, z: (rf() - .5) * 4.6, ph: rf(), s: .045 + rf() * .05, sp: .35 + rf() * .5 }); fc.setRGB(.55 * (.7 + rf() * .5) * 2.6, .5 * (.7 + rf() * .5) * 2.2, .42 * (.7 + rf() * .5) * 1.8); fgm.setColorAt(i, fc); }
  /* the 75 µm indicator ring, orange */
  const ind = new THREE.Mesh(new THREE.TorusGeometry(3.52, .08, 10, 80), new THREE.MeshStandardMaterial({ color: 0xff5e29, emissive: 0xff5e29, emissiveIntensity: .25, roughness: .4 })); ind.rotation.x = Math.PI / 2; ind.position.y = 2.62; lab.add(ind);

  const views = { both: { az: -6, el: 22, dist: 33, t: [0, 3.4, 0] }, jar: { az: -16, el: 14, dist: 20, t: [JX, 4, 0] }, lab: { az: -18, el: 24, dist: 20, t: [SX, 2.4, 0] }, mesh: { az: -12, el: 52, dist: 9, t: [SX + .3, 2.2, 0] } };
  if (innerWidth < 640) { views.both.dist = 40; views.jar.dist *= 1.12; views.lab.dist *= 1.12; }   /* the frame is 4:3 on phones */
  const labels = [
    { id: 'j', text: 'Field silt-jar screening', side: 'r', anchor: new V3(JX, JH + 1, 0), show: st => st.view !== 'lab' && st.view !== 'mesh' },
    { id: 'j1', text: 'Sand settles first', side: 'l', anchor: new V3(JX - JR, 1.5, 0), show: st => st.view === 'jar' },
    { id: 'j2', text: 'Finer material settles above it', side: 'l', anchor: new V3(JX - JR, 3.9, 0), show: st => st.view === 'jar' },
    { id: 'l', text: 'Laboratory: finer than 75 µm', side: 'r', tone: 'hot', anchor: new V3(SX, 5.2, 0), show: st => st.view !== 'jar' },
    { id: 'l1', text: '75 µm IS test sieve', side: 'r', tone: 'hot', anchor: new V3(SX + 3.5, 2.8, 0), show: st => st.view === 'lab' || st.view === 'mesh' },
    { id: 'l2', text: 'Fines that pass the mesh', side: 'l', anchor: new V3(SX - 1.8, 1.6, 2.4), show: st => st.view === 'lab' },
  ];
  const o3 = new THREE.Object3D(); let tp = 0, lastSync = 0;
  return {
    scene, views, fov: 30, wide: true, labels, limits: { az: [-70, 70], el: [6, 78], dist: [5, 60] },
    update(t, dt, st, fig) {
      let anim = false; const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (st.play && !still) { tp += dt; const cyc = 12, k = (tp % cyc) / cyc; st.settle = clamp(k / .8); anim = true; if (t - lastSync > .12) { lastSync = t; fig.sync(); } }
      const S = st.settle ?? 1;
      /* the layers grow in turn: sand, then silt, then the thin top film; the texture keeps its scale while the layer grows */
      let y = FL + .02; layers.forEach((m, i) => { const k = sm((S - [0, .28, .62][i]) / [.34, .36, .38][i]), h = Math.max(.001, LAYS[i].h * k); m.scale.y = h; m.position.y = y + h / 2; y += h; m.visible = h > .004; const r = Math.max(.02, k); m.material[0].map.repeat.set(2, r); m.material[0].bumpMap.repeat.set(2, r); });
      waterM.opacity = .5 - .2 * sm((S - .2) / .8); waterM.color.setRGB(.3 - .04 * S, .5, .62);
      sus.forEach((im, k) => { sp[k].forEach((p, i) => { const sSet = [.3, .66, 1][k], u = clamp(S / sSet), top = JH - 1.4, bot = y + .08 + p.ph * .12, yy = (k === 0 ? top * .9 : top) * (1 - sm(u)) + bot * sm(u), vis = u < 1 ? 1 : 0, a = p.a + (still ? 0 : t * .2);
        o3.position.set(Math.cos(a) * p.rr, FL + .25 + yy * (.35 + .65 * p.ph) * (1 - sm(u)) + (bot - FL - .25) * sm(u), Math.sin(a) * p.rr); o3.scale.setScalar(p.s * vis); o3.rotation.set(p.o + t * .3, p.o, 0); o3.updateMatrix(); im.setMatrixAt(i, o3.matrix); }); im.instanceMatrix.needsUpdate = true; });
      /* fines falling through the 75 µm mesh */
      fp.forEach((p, i) => { const u = still ? p.ph : (t * p.sp * .5 + p.ph) % 1; o3.position.set(p.x, 2.0 - u * 1.4, p.z); o3.scale.setScalar(p.s * (u < .05 ? u / .05 : 1)); o3.rotation.set(u * 5, u * 3, 0); o3.updateMatrix(); fgm.setMatrixAt(i, o3.matrix); }); fgm.instanceMatrix.needsUpdate = true;
      sieve.position.x = still ? 0 : Math.sin(t * 22) * .012; ind.material.emissiveIntensity = .22 + (st.view === 'lab' || st.view === 'mesh' ? .22 * Math.sin(t * 2.2) : 0);
      return anim || !still;
    },
    onSet(k, v) { if (k === 'play' && v) tp = 0; },
  };
}
