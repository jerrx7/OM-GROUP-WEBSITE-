/* scene: how natural sand forms, in six stages along one diorama (River Sand page): weathering of rock, particle release, water transport, abrasion and sorting, deposition in a riverbed cutaway, and the
   source-assessment step before supply (a sample is taken and tested). Photo-textured rock, the fractured / worn grain shaders of the M-Sand figures (application-s3d-msand.js), glossy water with a moving normal map,
   and a glass-walled riverbed section painted layer by layer. A drawing of natural sediment processes: it is NOT a map or picture of any river, source or extraction site, and nothing here is OM GROUP's
   operation. Grains are enlarged and generated; real deposits differ in grading, shape and mineral content. Numbered markers, key beside the figure. */
import { THREE, studio, rng } from '/assets/application-s3d.js';
import { crushed, grainMat, plant, mineral, buildHeap } from '/assets/application-s3d-msand.js';
import { rbox, cvs, tex, rgb, wrapDraw } from '/assets/application-s3d-msmasonry.js';
import { realStones, realStoneMaterial } from '/assets/s3dstone/real-stone.js';
const V3 = THREE.Vector3, TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), sm = v => { v = clamp(v); return v * v * (3 - 2 * v); };
const TT = [2.5, 1.85, 1.05];                                     /* warm quartz-and-feldspar tint of river grains */
const P = [[-27, -9], [-12, -9], [7, -9], [-22, 8], [-5, 8], [13, 8]];   /* the six stations (x, z) */

/* fast speckle: squares batched by colour */
function speck(g, r, W, H, n, sz, cols, a0, a1) { const st = []; cols.forEach(c => { for (let k = 0; k < 4; k++) st.push(c.replace('A', (a0 + (a1 - a0) * (k + .5) / 4).toFixed(2))); }); const per = st.map(() => []); for (let i = 0; i < n; i++) { const k = (r() * st.length) | 0, q = sz * (.5 + r() * 1.5); per[k].push(r() * W, r() * H, q); } per.forEach((a, k) => { g.fillStyle = st[k]; for (let i = 0; i < a.length; i += 3) g.fillRect(a[i], a[i + 1], a[i + 2], a[i + 2]); }); }
/* a painted section through a sediment layer: a matrix, then grains of one size class as faceted polygons (n grains of about s px) */
function layerTex(seed, base, classes) {
  const r = rng(seed), W = 1024, H = 512, c = cvs(W, H), g = c.getContext('2d'), hc = cvs(W, H), hg = hc.getContext('2d');
  g.fillStyle = rgb(...base); g.fillRect(0, 0, W, H); hg.fillStyle = '#707070'; hg.fillRect(0, 0, W, H);
  for (let i = 0; i < 26; i++) { const x = r() * W, y = r() * H, q = 60 + r() * 140, dk = r() < .5, gr = g.createRadialGradient(x, y, 0, x, y, q), col = dk ? [base[0] * .8, base[1] * .8, base[2] * .8] : [Math.min(255, base[0] * 1.15), Math.min(255, base[1] * 1.15), Math.min(255, base[2] * 1.12)]; gr.addColorStop(0, rgb(...col, .3)); gr.addColorStop(1, rgb(...col, 0)); g.fillStyle = gr; wrapDraw(g, W, H, () => g.fillRect(x - q, y - q, q * 2, q * 2)); }
  classes.forEach(([n, s, cols, rnd]) => {
    if (s < 5) { speck(g, r, W, H, n, s, cols.map(q => rgb(...q, 'A').replace(',A)', ',A)')), .3, .85); speck(hg, r, W, H, n, s, ['rgba(255,255,255,A)', 'rgba(0,0,0,A)'], .3, .7); return; }
    for (let i = 0; i < n; i++) {
      const x = r() * W, y = r() * H, q = s * (.6 + r() * .8), col = cols[(r() * cols.length) | 0], a0 = r() * TAU, k = rnd ? 9 : 6, sh = .82 + r() * .3;
      g.beginPath(); for (let t = 0; t < k; t++) { const a = t / k * TAU + a0, rr = q * (rnd ? .9 + r() * .1 : .72 + r() * .45); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * sh); } g.closePath();
      const gr = g.createRadialGradient(x - q * .3, y - q * .35, q * .1, x, y, q * 1.05); gr.addColorStop(0, rgb(Math.min(255, col[0] * 1.2), Math.min(255, col[1] * 1.2), Math.min(255, col[2] * 1.2), .98)); gr.addColorStop(1, rgb(col[0] * .78, col[1] * .78, col[2] * .78, .98)); g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(24,20,16,.6)'; g.lineWidth = Math.max(1, q * .07); g.stroke();
      hg.beginPath(); hg.arc(x, y, q, 0, TAU); hg.fillStyle = 'rgba(255,255,255,.5)'; hg.fill();
    }
  });
  return { map: tex(c), bump: tex(hc, false) };
}
/* ripples for the water: a tileable normal map from layered noise */
function rippleNormal() {
  const N = 256, h = new Float32Array(N * N), r = rng(3); const ph = Array.from({ length: 7 }, () => [r() * 6, r() * 6, 1 + (r() * 4 | 0), 1 + (r() * 4 | 0)]);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let v = 0; ph.forEach(([a, b, kx, ky], i) => { v += Math.sin(TAU * (kx * x / N + ky * y / N) + a) * Math.cos(TAU * (ky * x / N - kx * y / N) + b) / (1 + i * .4); }); h[y * N + x] = v; }
  const c = cvs(N, N), g = c.getContext('2d'), im = g.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const dx = h[y * N + (x + 1) % N] - h[y * N + (x + N - 1) % N], dy = h[((y + 1) % N) * N + x] - h[((y + N - 1) % N) * N + x], l = Math.hypot(dx * .9, dy * .9, 1), i = (y * N + x) * 4; im.data[i] = (-dx * .9 / l * .5 + .5) * 255; im.data[i + 1] = (-dy * .9 / l * .5 + .5) * 255; im.data[i + 2] = (1 / l * .5 + .5) * 255; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0); const t = tex(c, false); t.repeat.set(5, 1.6); return t;
}

export default function build({ state }) {
  const scene = new THREE.Scene(), { key } = studio(scene, { ext: 50, key: 2.5, shadow: .22, map: 4096, ground: false });
  key.shadow.bias = -.0001; key.shadow.normalBias = .03;
  const mat = grainMat({ bump: .1, rough: .7 }), matR = grainMat({ bump: .05, rough: .6 });
  const G = { ang: [0, 1, 2, 3, 4, 5].map(i => crushed(100 + i * 17, 'ang')), sub: [0, 1, 2].map(i => crushed(900 + i * 17, 'sub')), round: [0, 1, 2, 3].map(i => crushed(700 + i * 19, 'round')), small: [0, 1, 2, 3].map(i => crushed(200 + i * 13, 'small')), roundS: [0, 1, 2, 3].map(i => crushed(800 + i * 7, 'round')), tiny: [0, 1, 2].map(i => crushed(500 + i * 11, 'tiny')) };
  G.river = G.sub.concat(G.round.slice(0, 3));
  const T = c => [c[0] * TT[0], c[1] * TT[1], c[2] * TT[2]];

  /* the bench: pale speckled laminate */
  { const b = cvs(512, 512), g = b.getContext('2d'), rr = rng(5); g.fillStyle = '#d4d1ca'; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 14000; i++) { const v = 188 + rr() * 50 | 0; g.fillStyle = 'rgba(' + v + ',' + v + ',' + (v - 5) + ',.55)'; g.fillRect(rr() * 512, rr() * 512, 1.2 + rr() * 1.4, 1.2 + rr() * 1.4); }
    const t = tex(b); t.repeat.set(28, 14); const bench = new THREE.Mesh(new THREE.BoxGeometry(150, 2, 70), new THREE.MeshStandardMaterial({ map: t, roughness: .55, metalness: 0, envMapIntensity: .75 })); bench.position.set(-6, -1, 0); bench.receiveShadow = true; scene.add(bench); }
  const grp = i => { const g = new THREE.Group(); g.position.set(P[i][0], 0, P[i][1]); scene.add(g); return g; };
  const heapAt = (parent, x, z, o) => { const sc = o.sc, csk = o.csk ?? 1, h = buildHeap({ R: 15, nC: o.nC ?? 120, nM: o.nM ?? 900, nF: o.nF ?? 3000, nH: 0, seed: o.seed, maxD: o.maxD ?? 3, gs: o.gs ?? 1, tint: o.tint, csf: .24 * sc * csk, csm: .6 * sc * csk, dust: o.dust ?? .2 }); h.group.scale.setScalar(sc); h.group.position.set(x, o.y ?? 0, z); parent.add(h.group);
    const gm = o.mat || mat; if (o.nC !== 0) plant(h.group, h.items.coarse, o.gC, gm, o.seed + 1, true); plant(h.group, h.items.mid, o.gM, gm, o.seed + 2, true); plant(h.group, h.items.fine, G.tiny, gm, o.seed + 3, false); return h; };

  /* ───────── 1 · weathering of rock ───────── */
  const s1 = grp(0), QS = realStones('quarry'), rockM = realStoneMaterial({ tint: .34, bump: .2, floor: 0, gain: 1.0, contrast: .9, scale: .5, soft: 1, grain: .3 });
  [[0, 2.9, 0, [3.7, 3.1, 2.9], 0, .4], [-3.1, 1.6, 1.2, [2.2, 1.7, 1.7], 2, 1.3], [3, 1.5, .8, [2.3, 1.6, 1.8], 3, 2.1], [.8, 5.2, -.4, [1.9, 1.5, 1.5], 4, .8]].forEach(([x, y, z, sc, si, ry]) => { const m = new THREE.Mesh(QS[si % QS.length], rockM); m.position.set(x, y, z); m.scale.set(...sc); m.rotation.set(.1 * si, ry, .05 * si); m.castShadow = m.receiveShadow = true; s1.add(m); });
  const QL = realStones('low'), fragM = realStoneMaterial({ tint: .36, bump: .1, floor: 0, gain: 1.0, contrast: .85, scale: 1.2, soft: 1, grain: .2 }), FALL = 22, fm = new THREE.InstancedMesh(QL[2], fragM, FALL); fm.frustumCulled = false; fm.castShadow = true; s1.add(fm);
  const r1 = rng(5), fl = []; for (let i = 0; i < FALL; i++) fl.push({ x: (r1() - .3) * 8, z: 1.6 + r1() * 3, y0: 1.5 + r1() * 4.5, ph: r1(), s: .14 + r1() * .26, o: r1() * 6 });
  heapAt(s1, 1.5, 5.2, { sc: .27, seed: 11, gC: G.ang, gM: G.small, tint: [1.1, 1.08, 1.05], maxD: 4.5, nC: 220, nM: 1100, nF: 3500 });

  /* ───────── 2 · particle release: fresh, angular grains ───────── */
  const s2 = grp(1); heapAt(s2, 0, -.6, { sc: .36, seed: 21, gC: G.ang, gM: G.small, tint: [1.75, 1.4, 1.02], maxD: 4.2, nC: 260, nM: 1500, nF: 4500, dust: .24 });
  const bigG = new THREE.Group(); bigG.position.set(0, 0, 5.6); s2.add(bigG); const bigM = grainMat({ bump: .14, rough: .66 });
  [[-2.5, .85, 0], [0, 1.05, 1], [2.5, .8, 2]].forEach(([x, s, i]) => { const m = new THREE.Mesh(G.ang[i], bigM); m.scale.setScalar(1.1 + s * .5); m.position.set(x, .95 + s * .1, 0); m.castShadow = m.receiveShadow = true; m.rotation.set(i, i * 2, .2); bigG.add(m); });
  bigG.children.forEach((m, i) => { m.material = grainMat({ bump: .14, rough: .66 }); const t = [[2.1, 1.5, 1.0], [1.5, 1.25, 1.05], [1.0, 1.0, 1.0]][i]; m.material.color.setRGB(t[0] * .75, t[1] * .75, t[2] * .75); });   /* each magnified grain a different tone */

  /* ───────── 3 · water transport: a channel ───────── */
  const s3 = grp(2), CL = 20, CD = 5, BED = .5, WH = 3.1;
  { const bt = layerTex(41, [150, 128, 96], [[2600, 10, [[190, 168, 128], [140, 120, 90], [96, 84, 70]], true], [9000, 2, [[200, 180, 140], [120, 100, 80]]]]);
    const bed = new THREE.Mesh(rbox(CL + .6, .5, CD + .6, .05, 2, .12), new THREE.MeshStandardMaterial({ map: bt.map, bumpMap: bt.bump, bumpScale: 1.6, roughness: 1 })); bed.position.y = .25; bed.receiveShadow = true; s3.add(bed);
    const wt = layerTex(42, [128, 122, 110], [[90, 13, [[152, 144, 126], [112, 106, 94], [170, 158, 134], [92, 88, 80]], true], [9000, 2.2, [[168, 160, 142], [84, 80, 72]]]]), wall = new THREE.MeshStandardMaterial({ map: wt.map, bumpMap: wt.bump, bumpScale: 2.4, roughness: .95 });
    [-1, 1].forEach(sd => { const w = new THREE.Mesh(rbox(CL + .6, 1.4, .5, .08, 3, .2), wall); w.position.set(0, 1.2, sd * (CD / 2 + .05)); w.castShadow = w.receiveShadow = true; s3.add(w); w.visible = sd > 0; }); }
  const rip = rippleNormal();
  const water = new THREE.Mesh(new THREE.BoxGeometry(CL, WH - BED, CD), new THREE.MeshPhysicalMaterial({ color: 0x4f9db8, roughness: .04, metalness: 0, transparent: true, opacity: .46, depthWrite: false, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 2.2, normalMap: rip, normalScale: new THREE.Vector2(.35, .35), ior: 1.33 })); water.position.set(0, (WH + BED) / 2, 0); water.renderOrder = 6; s3.add(water);
  const wedge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(CL, WH - BED + .02, CD)), new THREE.LineBasicMaterial({ color: 0xd4dde2, transparent: true, opacity: .6 })); wedge.position.copy(water.position); s3.add(wedge);
  const CLS = [{ n: 34, r: .19, spd: 1, stop: [.28, .4], geos: G.round, mode: 'roll' }, { n: 80, r: .13, spd: 1.5, stop: [.5, .68], geos: G.sub, mode: 'hop' }, { n: 150, r: .07, spd: 2.2, stop: [.82, .97], geos: G.tiny, mode: 'float' }].map((c, k) => {
    const r = rng(60 + k), im = new THREE.InstancedMesh(c.geos[0], matR, c.n), col = new THREE.Color(); im.frustumCulled = false; im.castShadow = k < 2; s3.add(im);
    const it = []; for (let i = 0; i < c.n; i++) { it.push({ ph: r(), z: (r() - .5) * (CD - .9), stop: c.stop[0] + r() * (c.stop[1] - c.stop[0]), o: r() * 6, w: .6 + r() * .8, h: .4 + r() * .6 }); const cc = T(mineral(r)); col.setRGB(cc[0], cc[1], cc[2]); im.setColorAt(i, col); }
    return { ...c, im, it };
  });
  const o3 = new THREE.Object3D();

  /* ───────── 4 · abrasion and sorting: angular, sub-rounded, rounded ───────── */
  const s4 = grp(3), enamel = new THREE.MeshPhysicalMaterial({ color: 0xf1efea, roughness: .26, clearcoat: .6, clearcoatRoughness: .2, envMapIntensity: .9 }), p4 = [];
  [['ang', -4.6], ['sub', 0], ['round', 4.6]].forEach(([kind, x], i) => {
    const pl = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.7, .5, 48), enamel); pl.position.set(x, .25, 0); pl.castShadow = pl.receiveShadow = true; s4.add(pl);
    const gm = grainMat({ bump: i === 2 ? .05 : .14, rough: i === 2 ? .6 : .68 }); gm.color.setRGB(...[[1.9, 1.5, 1.05], [2.1, 1.6, 1.0], [2.4, 1.8, 1.05]][i].map(v => v * .8));
    const m = new THREE.Mesh([G.ang[1], G.sub[0], G.round[1]][i], gm); m.scale.setScalar(1.55); m.position.set(x, 1.55, 0); m.castShadow = m.receiveShadow = true; m.rotation.set(.4, i * 1.7, .2); s4.add(m); p4.push(m);
  });
  { const ar = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, 12.4, 10), new THREE.MeshStandardMaterial({ color: 0xff5e29, roughness: .4, emissive: 0xff5e29, emissiveIntensity: .15 })); ar.rotation.z = Math.PI / 2; ar.position.set(0, .2, 3.4); s4.add(ar); const ah = new THREE.Mesh(new THREE.ConeGeometry(.28, .7, 14), ar.material); ah.rotation.z = -Math.PI / 2; ah.position.set(6.4, .2, 3.4); s4.add(ah); }
  heapAt(s4, 0, -4.4, { sc: .22, seed: 31, gC: G.river, gM: G.roundS, tint: TT, maxD: 2.4, nC: 90, nM: 900, nF: 3500, csk: 1.1, dust: .1, mat: matR });

  /* ───────── 5 · deposition: a glass-walled riverbed section ───────── */
  const s5 = grp(4), BW = 9.6, BD = 5, FC = [[196, 178, 140], [168, 146, 108], [120, 104, 84], [214, 198, 160], [90, 82, 72]], FD = [[110, 100, 86], [86, 80, 72], [140, 128, 108], [70, 66, 60]];
  const LAY = [
    { y: 0, h: 1.45, base: [104, 94, 80], cl: [[44, 34, [[176, 160, 128], [138, 124, 100], [96, 88, 78], [196, 176, 138]], true], [1300, 9, FC.map(c => c)], [4000, 3, FC]] },
    { y: 1.45, h: 1.3, base: [176, 142, 96], cl: [[1300, 11, FC, true], [5000, 4, FC]] },
    { y: 2.75, h: 1.2, base: [214, 192, 150], cl: [[2600, 7, FC, true], [7000, 2.4, FC]] },
    { y: 3.95, h: .9, base: [124, 112, 98], cl: [[8000, 2.4, FD], [9000, 1.6, FD]] },
  ];
  { const bs = new THREE.Mesh(rbox(BW + .8, .5, BD + .8, .06, 2, .2), new THREE.MeshPhysicalMaterial({ color: 0xe6e2d8, roughness: .3, clearcoat: .5, clearcoatRoughness: .25 })); bs.position.y = .25; bs.receiveShadow = true; s5.add(bs); }
  LAY.forEach((ly, i) => { const lt = layerTex(50 + i, ly.base, ly.cl.map(c => [c[0], c[1], c[2], c[3] ?? false])), m = new THREE.Mesh(new THREE.BoxGeometry(BW, ly.h, BD - .3), new THREE.MeshStandardMaterial({ map: lt.map, bumpMap: lt.bump, bumpScale: 3, roughness: .95, envMapIntensity: .4 })); m.position.set(0, .5 + ly.y + ly.h / 2, -.15); m.castShadow = m.receiveShadow = true; s5.add(m); });
  { const pr = rng(77), it = []; for (let i = 0; i < 22; i++) { const s = .2 + pr() * .22; it.push({ x: (pr() - .5) * (BW - 1.2), y: .5 + s * .9 + pr() * (1.45 - s * 1.5), z: BD / 2 - .28 - s * .2, s, c: T(mineral(pr)), flat: .9 + pr() * .2, jx: 1, jz: .8, q: new THREE.Quaternion().setFromEuler(new THREE.Euler(pr() * 6, pr() * 6, pr() * 6)) }); } plant(s5, it, G.round, matR, 78, true); }
  { const gl = new THREE.Mesh(new THREE.BoxGeometry(BW + .1, 4.9, BD + .1), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .03, transparent: true, opacity: .1, depthWrite: false, side: THREE.DoubleSide, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 2.4 })); gl.position.y = .5 + 2.45; gl.renderOrder = 5; s5.add(gl);
    const bw = new THREE.Mesh(new THREE.BoxGeometry(BW, 1.2, BD - .1), new THREE.MeshPhysicalMaterial({ color: 0x74b6cc, roughness: .04, transparent: true, opacity: .32, depthWrite: false, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 2.2, normalMap: rip, normalScale: new THREE.Vector2(.3, .3) })); bw.position.y = .5 + 4.85 + .6; bw.renderOrder = 6; s5.add(bw);
    const e5 = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(BW + .1, 6.1, BD + .1)), new THREE.LineBasicMaterial({ color: 0xcfd6dc, transparent: true, opacity: .6 })); e5.position.y = .5 + 3.05; s5.add(e5); }

  /* ───────── 6 · source assessment: a sample is taken and tested ───────── */
  const s6 = grp(5), steel = new THREE.MeshStandardMaterial({ color: 0xb4b8be, metalness: .92, roughness: .3, envMapIntensity: 1.2 }), brass = new THREE.MeshStandardMaterial({ color: 0xc8a96c, metalness: .85, roughness: .3, envMapIntensity: 1.1 });
  { const b = new THREE.Mesh(rbox(17, .5, 7, .08, 3, .2), new THREE.MeshPhysicalMaterial({ color: 0xe9e6de, roughness: .3, clearcoat: .5, clearcoatRoughness: .25, envMapIntensity: .9 })); b.position.set(0, .25, 0); b.receiveShadow = true; s6.add(b); }
  const hp = heapAt(s6, 4.6, .3, { sc: .27, seed: 61, gC: G.river, gM: G.roundS, tint: TT, maxD: 2.4, nC: 90, nM: 900, nF: 3500, csk: 1.1, dust: .1, mat: matR, y: .5 });
  { const sc = new THREE.Group(); sc.position.set(3.4, 2.3, 1.6); sc.rotation.set(0, -.5, -.35); s6.add(sc);        /* the scoop, pushed into the heap */
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 16, 0, TAU, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xb4b8be, metalness: .92, roughness: .3, envMapIntensity: 1.2, side: THREE.DoubleSide })); bowl.scale.set(1.5, .85, 1.1); bowl.rotation.x = Math.PI; bowl.position.y = .5; bowl.castShadow = true; sc.add(bowl);
    const hd = new THREE.Mesh(new THREE.CylinderGeometry(.13, .15, 4, 14), steel); hd.rotation.z = Math.PI / 2; hd.position.set(-3.2, .9, 0); hd.castShadow = true; sc.add(hd); const cap = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, 1.2, 16), new THREE.MeshStandardMaterial({ color: 0xff5e29, roughness: .45 })); cap.rotation.z = Math.PI / 2; cap.position.set(-5.4, .9, 0); cap.castShadow = true; sc.add(cap); }
  { const fb = cvs(256, 256), g = fb.getContext('2d'), rr = rng(8); g.fillStyle = '#ece5d4'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 256; i += 2) { g.fillStyle = 'rgba(120,104,80,' + (.1 + rr() * .1) + ')'; g.fillRect(i, 0, 1, 256); g.fillRect(0, i, 256, 1); } speck(g, rr, 256, 256, 3500, 1, ['rgba(255,252,244,A)', 'rgba(150,136,110,A)'], .1, .4);
    const ft = tex(fb); ft.repeat.set(3, 3); const fabric = new THREE.MeshStandardMaterial({ map: ft, bumpMap: ft, bumpScale: .5, roughness: .96, envMapIntensity: .35 });
    const prof = [[0, 0], [1.2, .02], [1.95, .35], [2.15, 1.0], [1.85, 1.75], [1.2, 2.45], [.62, 2.9], [.5, 3.05], [.9, 3.45], [1.05, 3.85], [.8, 4.0]].map(p => new THREE.Vector2(p[0], p[1]));
    const bg = new THREE.LatheGeometry(prof, 72, 0, TAU), bp = bg.attributes.position, wr = rng(12), ph = [wr() * 6, wr() * 6, wr() * 6];
    for (let i = 0; i < bp.count; i++) { const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i), an = Math.atan2(z, x), rr = Math.hypot(x, z), w = 1 + .045 * Math.sin(an * 9 + ph[0] + y * 1.3) + .03 * Math.sin(an * 17 + ph[1] - y * 2.1) + (y > 2.6 ? .09 * Math.sin(an * 11 + ph[2]) : 0), sag = y > 2.6 ? 1 : 1 - .06 * Math.sin(an * 3 + ph[0]); bp.setXYZ(i, Math.cos(an) * rr * w * sag, y * (1 + .02 * Math.sin(an * 5 + ph[1])), Math.sin(an) * rr * w * sag); } bg.computeVertexNormals();
    const bag = new THREE.Mesh(bg, fabric); bag.scale.setScalar(.9); bag.position.set(-3, .5, 1.2); bag.rotation.y = .4; bag.castShadow = bag.receiveShadow = true; s6.add(bag);
    const tie = new THREE.Mesh(new THREE.TorusGeometry(.5 * .9, .08, 12, 32), new THREE.MeshStandardMaterial({ color: 0xff5e29, roughness: .5 })); tie.rotation.x = Math.PI / 2; tie.position.set(-3, .5 + 2.98 * .9, 1.2); tie.castShadow = true; s6.add(tie); }
  { const mc = cvs(128, 128), g = mc.getContext('2d'); g.clearRect(0, 0, 128, 128); g.strokeStyle = 'rgba(40,40,44,.9)'; g.lineWidth = 3; for (let i = 0; i <= 128; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); } const mt = tex(mc); mt.repeat.set(4, 4);
    [0, 1, 2].forEach(i => { const y = .5 + i * 1.05, fr = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, .95, 56, 1, true), brass); fr.position.set(-7.2, y + .48, -1.4); fr.castShadow = fr.receiveShadow = true; s6.add(fr); const rim = new THREE.Mesh(new THREE.TorusGeometry(1.9, .07, 10, 56), brass); rim.rotation.x = Math.PI / 2; rim.position.set(-7.2, y + .95, -1.4); s6.add(rim);
      const mesh = new THREE.Mesh(new THREE.CircleGeometry(1.84, 48), new THREE.MeshStandardMaterial({ color: 0x9a9da3, metalness: .9, roughness: .4, map: mt, alphaMap: mt, transparent: true, alphaTest: .05, side: THREE.DoubleSide })); mesh.rotation.x = -Math.PI / 2; mesh.position.set(-7.2, y + .35, -1.4); s6.add(mesh); });
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 1.95, .22, 56), brass); lid.position.set(-7.2, .5 + 3 * 1.05 + .08, -1.4); lid.castShadow = true; s6.add(lid); }

  /* ───────── views and markers ───────── */
  const WP = (i, x, y, z = 0) => new V3(P[i][0] + x, y, P[i][1] + z);
  const views = { all: { az: -4, el: 40, dist: matchMedia("(max-width:640px)").matches ? 66 : 58, t: [-5, 0, -.5] }, ...Object.fromEntries(P.map((p, i) => ['s' + (i + 1), { az: -16, el: i < 3 ? 34 : 18, dist: [22, 22, 30, 27, 24, 29][i], t: [p[0], i === 2 ? 1.6 : i === 5 ? 2.6 : 2.4, p[1]] }])) };
  const lab = (id, text, a, side, vs, tone) => ({ id, text, side, tone, anchor: a, show: st => st.view === 'all' || vs.includes(st.view) }), sub = (id, text, a, side, vs, tone) => ({ id, text, side, tone, anchor: a, show: st => vs.includes(st.view) });
  const labels = [
    lab('s1', 'Weathering of rock', WP(0, 0, 8), 'r', ['s1']), lab('s2', 'Particle release', WP(1, 0, 3.6), 'r', ['s2']), lab('s3', 'Water transport', WP(2, 0, 4.3), 'r', ['s3']),
    lab('s4', 'Abrasion and sorting', WP(3, 0, 3.6), 'r', ['s4']), lab('s5', 'Deposition', WP(4, 0, 7.2), 'r', ['s5']), lab('s6', 'Source assessment', WP(5, -3, 4.6, 1.2), 'r', ['s6'], 'hot'),
    sub('s3a', 'Faster flow carries finer grains further', WP(2, 4, 2.7, 2.5), 'r', ['s3']), sub('s3b', 'Coarser grains settle sooner', WP(2, -6, .9, 2.5), 'l', ['s3']),
    sub('s4a', 'Angular', WP(3, -4.6, 3.4), 'l', ['s4']), sub('s4b', 'Sub-rounded', WP(3, 0, 3.4), 'r', ['s4']), sub('s4c', 'Rounded', WP(3, 4.6, 3.4), 'r', ['s4']),
    sub('s5a', 'Different layers, different particle sizes', WP(4, 4.6, 3.6, 2.5), 'r', ['s5']),
    sub('s6a', 'A sample is taken and tested: bag, scoop, sieves', WP(5, -7.2, 4.4, -1.4), 'r', ['s6'], 'hot'),
  ];
  return {
    scene, views, fov: 30, wide: true, labels, limits: { az: [-70, 70], el: [6, 62], dist: [10, 130] },
    update(t, dt, st) {
      const still = matchMedia('(prefers-reduced-motion: reduce)').matches, Tm = still ? 3 : t;
      fl.forEach((f, i) => { const u = still ? f.ph : (Tm * .11 + f.ph) % 1, fall = sm((u - .18) / .5); o3.position.set(f.x + fall * .8, f.y0 * (1 - fall * fall) + .25 * fall, f.z + fall * 1.2); o3.scale.setScalar(f.s * (u < .06 ? u / .06 : u > .94 ? (1 - u) / .06 : 1)); o3.rotation.set(f.o + u * 9, f.o, u * 5); o3.updateMatrix(); fm.setMatrixAt(i, o3.matrix); }); fm.instanceMatrix.needsUpdate = true;
      CLS.forEach(c => { c.it.forEach((p, i) => { const per = 20 / c.spd, u = still ? p.ph : ((Tm / per) + p.ph) % 1, run = clamp(u / .78), e = sm(run), x0 = -CL / 2 + .8, xs = x0 + (CL / 2 - .8 - x0) * p.stop, x = x0 + (xs - x0) * e;
        let y = BED + c.r * .55; if (run < 1) { if (c.mode === 'hop') y += .12 + .5 * Math.abs(Math.sin(Tm * 2.6 * c.spd + p.o)) * p.h; else if (c.mode === 'float') y = BED + .5 + (WH - BED - .8) * (.15 + .75 * p.h) * (1 - sm((run - .86) / .14) * .92) + Math.sin(Tm * 1.7 + p.o) * .12; }
        const sc = u < .05 ? u / .05 : u > .94 ? (1 - u) / .06 : 1; o3.position.set(x, y, p.z); o3.scale.setScalar(c.r * sc * (c.mode === 'roll' ? 1.3 : 1.2)); o3.rotation.set(p.o + (run < 1 ? Tm * 2 * c.spd * p.w : 0), p.o * 2, p.o); o3.updateMatrix(); c.im.setMatrixAt(i, o3.matrix); }); c.im.instanceMatrix.needsUpdate = true; });
      for (let i = 0; i < 3; i++) p4[i].rotation.y = still ? i * 1.7 : Tm * .22 + i * 1.7;
      rip.offset.x = still ? 0 : -Tm * .04;
      return !still;
    },
  };
}
