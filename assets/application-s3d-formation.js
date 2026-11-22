/* scene: how natural sand forms, in six stages along one diorama: weathering of rock, particle release, water transport, abrasion and sorting, deposition in a
   riverbed cutaway, and the source-verification step before supply. A drawing of natural sediment processes: it is NOT a map or picture of any river,
   source or extraction site, and nothing here is OM GROUP's operation. Grains are generated; real deposits differ in grading, shape and mineral content. */
import { THREE, L, studio, rng } from '/assets/application-s3d.js';
import { grainGeos, grainMat, hotMat, inst, moundItems, moundBase, mineralGrain, reduce, V3, TAU } from '/assets/application-s3d-sand.js';
const { M, mk, stone, canvasTex } = L;

const X = [-38, -23, -4, 17, 34, 52], DX = [11, 11, 11, -39, -39, -39], DZ = [-9, -9, -9, 8, 8, 8];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), sm = v => { v = clamp(v); return v * v * (3 - 2 * v); };

export default function build({ state }) {
  const scene = new THREE.Scene(); studio(scene, { ext: 44, key: 2.3, shadow: .22, map: 2048 });
  const rowA = new THREE.Group(), rowB = new THREE.Group(); rowA.position.set(DX[0], 0, DZ[0]); rowB.position.set(DX[3], 0, DZ[3]); scene.add(rowA, rowB); let cur = rowA;
  const add = (m, x, y, z) => { m.position.set(x, y, z); cur.add(m); return m; };
  const bx = (w, h, d, mat, x, y, z) => add(mk(new THREE.BoxGeometry(w, h, d), mat), x, y, z);
  const cy = (rt, rb, h, mat, x, y, z, sg = 24) => add(mk(new THREE.CylinderGeometry(rt, rb, h, sg), mat), x, y, z);
  const gmat = grainMat(), hot = hotMat();
  { const f = mk(new THREE.BoxGeometry(76, .3, 34), new THREE.MeshStandardMaterial({ color: 0xe6e3dc, roughness: .85 })); f.position.set(-5, -.15, -.5); cur.add(f); }

  /* ── 1 · weathering of rock ── */
  const r1 = rng(5); const rock = new THREE.Group(); rock.position.set(X[0], 0, 0); cur.add(rock);
  const rockMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85, metalness: 0, envMapIntensity: .6 });
  [[0, 2.9, 0, [3.7, 3.1, 2.9], 3], [-3, 1.7, 1.2, [2.1, 1.7, 1.7], 8], [2.9, 1.5, .8, [2.2, 1.6, 1.8], 12], [.8, 5.3, -.4, [1.9, 1.5, 1.5], 17]].forEach(([x, y, z, sc, sd]) => { const m = new THREE.Mesh(mineralGrain('ang', sd, { w: 220, h: 150, cuts: 12, rough: .09, wob: .16, tone: 'rock', cracks: .035 }), rockMat); m.scale.set(sc[0], sc[1], sc[2]); m.position.set(x, y, z); m.castShadow = true; m.rotation.y = sd; rock.add(m); });
  const FALL = 22, fgeo = grainGeos('ang', 'granite'), fm = new THREE.InstancedMesh(fgeo[2], grainMat(), FALL); fm.frustumCulled = false; cur.add(fm);
  const fl = []; for (let i = 0; i < FALL; i++) fl.push({ x: X[0] + (r1() - .3) * 8, z: 1.4 + r1() * 3, y0: 1.5 + r1() * 4.5, ph: r1(), s: .12 + r1() * .26, o: r1() * 6 });
  const cr = new THREE.Group(); cr.position.set(X[0] + 1, 0, 4.5); cur.add(cr); const rr = rng(9);
  cr.add(moundBase(3.2, .9, 0x6f6a60)); inst(cr, moundItems(500, 3, .85, () => .08 + rr() * .17, rr), grainGeos('ang', 'river'), gmat, 3, false);

  /* ── 2 · particle release: angular fresh grains, magnified ── */
  const p2 = new THREE.Group(); p2.position.set(X[1], 0, 0); cur.add(p2); const r2 = rng(14);
  p2.add(moundBase(5.2, 2.2, 0x8b7e69)); inst(p2, moundItems(1500, 5, 2.1, () => .11 + Math.pow(r2(), 1.6) * .3, r2), grainGeos('ang', 'river'), gmat, 21, false);
  const MG = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .62, envMapIntensity: .9 }); const big = new THREE.Group(); big.position.set(0, 0, 4.4); p2.add(big);
  [[-2.4, .85, .2], [0, 1, 0], [2.4, .75, -.2]].forEach(([x, s, z], i) => { const m = new THREE.Mesh(mineralGrain('ang', 40 + i * 7, { w: 160, h: 110 }), MG); m.scale.setScalar(.95 + s * .25); m.position.set(x, .95, z); m.castShadow = true; m.rotation.set(i, i * 2, 0); big.add(m); });

  /* ── 3 · water transport: a channel cross-section with grain classes moving at different speeds ── */
  const CX = X[2], CL = 20, CD = 5, BED = .5, WH = 3.1;
  bx(CL + .6, .5, CD + .6, new THREE.MeshStandardMaterial({ color: 0xb59f7c, roughness: 1 }), CX, .25, 0);
  const water = new THREE.Mesh(new THREE.BoxGeometry(CL, WH - BED, CD), new THREE.MeshPhysicalMaterial({ color: 0x6fc0e6, roughness: .08, transparent: true, opacity: .2, depthWrite: false, envMapIntensity: 1.2 })); water.position.set(CX, (WH + BED) / 2, 0); water.renderOrder = 3; cur.add(water);
  const wedge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(CL, WH - BED + .02, CD)), new THREE.LineBasicMaterial({ color: 0x5a6068, transparent: true, opacity: .55 })); wedge.position.copy(water.position); cur.add(wedge);
  const flowM = new THREE.MeshStandardMaterial({ color: 0x2a7fb0, roughness: .5, emissive: 0x1a5f8a, emissiveIntensity: .3 });
  [[2.6, 8, -6], [1.8, 6, -4], [1.1, 3.6, -3]].forEach(([y, len, x0]) => { const s = mk(new THREE.CylinderGeometry(.055, .055, len, 8), flowM); s.rotation.z = Math.PI / 2; s.position.set(CX + x0 + len / 2 - 1, y, -CD / 2 + .05); cur.add(s); const h = mk(new THREE.ConeGeometry(.2, .5, 12), flowM); h.rotation.z = -Math.PI / 2; h.position.set(CX + x0 + len - 1 + .25, y, -CD / 2 + .05); cur.add(h); });
  const CLS = [
    { n: 34, r: .17, spd: 1, stop: [.28, .4], kind: 'rnd', mode: 'roll', geoIdx: 0 },
    { n: 80, r: .12, spd: 1.5, stop: [.5, .68], kind: 'sub', mode: 'hop', geoIdx: 1 },
    { n: 150, r: .065, spd: 2.2, stop: [.82, .97], kind: 'subf', mode: 'float', geoIdx: 2 },
  ].map((c, k) => {
    const r = rng(60 + k), g = grainGeos(c.kind, 'river'), im = new THREE.InstancedMesh(g[c.geoIdx], gmat, c.n); im.frustumCulled = false; cur.add(im);
    const it = []; for (let i = 0; i < c.n; i++) it.push({ ph: r(), z: (r() - .5) * (CD - .9), stop: c.stop[0] + r() * (c.stop[1] - c.stop[0]), o: r() * 6, w: .6 + r() * .8, h: .4 + r() * .6 });
    return { ...c, im, it };
  });
  const o3 = new THREE.Object3D();

  cur = rowB;
  /* ── 4 · abrasion and sorting: the same family of grains from angular to rounded, enlarged ── */
  const p4 = new THREE.Group(); p4.position.set(X[3], 0, 0); cur.add(p4);
  [['ang', -4.6], ['sub', 0], ['rnd', 4.6]].forEach(([kind, x], i) => {
    const pl = mk(new THREE.CylinderGeometry(1.55, 1.7, .5, 36), M.white); pl.position.set(x, .25, 0); p4.add(pl);
    const m = new THREE.Mesh(mineralGrain(kind, [11, 27, 43][i], { w: 180, h: 120 }), MG); m.scale.setScalar(1.6); m.position.set(x, 1.65, 0); m.castShadow = true; m.rotation.set(.4, i * 1.7, .2); p4.add(m); p4.userData['g' + i] = m;
  });
  const arrow = mk(new THREE.CylinderGeometry(.07, .07, 12.4, 10), M.orange); arrow.rotation.z = Math.PI / 2; arrow.position.set(0, .2, 3.4); p4.add(arrow);
  const ah = mk(new THREE.ConeGeometry(.28, .7, 14), M.orange); ah.rotation.z = -Math.PI / 2; ah.position.set(6.4, .2, 3.4); p4.add(ah);
  const r4 = rng(77); const tray = new THREE.Group(); tray.position.set(0, 0, -3.8); p4.add(tray); tray.add(moundBase(5.2, .8, 0x8a7b62)); inst(tray, moundItems(900, 5, .75, () => .04 + Math.pow(r4(), 2) * .18, r4), grainGeos('sub', 'river'), gmat, 31, false);

  /* ── 5 · deposition: a riverbed cutaway with layers of different grain size ── */
  const p5 = new THREE.Group(); p5.position.set(X[4], 0, 0); cur.add(p5); const BW = 9.6, BD = 5, LAY = [
    { y: 0, h: 1.45, c: 0x8a7c66, n: 150, lo: .2, hi: .34, k: 'rnd', z: 'stone' },
    { y: 1.45, h: 1.3, c: 0xb7a07c, n: 800, lo: .09, hi: .18, k: 'sub' },
    { y: 2.75, h: 1.2, c: 0xc8b58f, n: 1900, lo: .055, hi: .1, k: 'subf' },
    { y: 3.95, h: .9, c: 0x9b9082, n: 2800, lo: .03, hi: .06, k: 'subf' },
  ];
  bx(BW + .8, .5, BD + .8, new THREE.MeshStandardMaterial({ color: 0xd9d4ca, roughness: .8 }), X[4], .25, 0);
  const layerBoxes = [];
  LAY.forEach((ly, i) => {
    const r = rng(300 + i); const g = new THREE.Group(); g.position.set(0, .5 + ly.y, 0); p5.add(g);
    const base = new THREE.Mesh(new THREE.BoxGeometry(BW, ly.h, BD - .3), new THREE.MeshStandardMaterial({ color: ly.c, roughness: 1 })); base.position.set(0, ly.h / 2, -.15); g.add(base);
    const items = []; for (let q = 0; q < ly.n; q++) { const s = ly.lo + r() * (ly.hi - ly.lo); items.push([(r() - .5) * (BW - .3), s + r() * (ly.h - s * 1.4), BD / 2 - .12 - r() * .3, s]); }
    inst(g, items, grainGeos(ly.k, 'river'), gmat, 330 + i, false); layerBoxes.push(g);
  });
  const glass = new THREE.Mesh(new THREE.BoxGeometry(BW + .1, 4.9, BD + .1), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .05, transparent: true, opacity: .1, depthWrite: false, side: THREE.DoubleSide })); glass.position.set(0, .5 + 2.45, 0); p5.add(glass);
  const bedW = new THREE.Mesh(new THREE.BoxGeometry(BW, 1.2, BD - .1), new THREE.MeshPhysicalMaterial({ color: 0x6fc0e6, roughness: .06, transparent: true, opacity: .26, depthWrite: false })); bedW.position.set(0, .5 + 4.85 + .6, 0); bedW.renderOrder = 3; p5.add(bedW);
  const edge5 = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(BW + .1, 6.1, BD + .1)), new THREE.LineBasicMaterial({ color: 0x5a6068, transparent: true, opacity: .5 })); edge5.position.set(0, .5 + 3.05, 0); p5.add(edge5);

  /* ── 6 · source assessment and lawful supply: six neutral document cards, checked in turn ── */
  const p6 = new THREE.Group(); p6.position.set(X[5], 0, 0); cur.add(p6);
  const TITLES = ['Source identification', 'Authorisation check', 'Environmental documents', 'Dispatch documents', 'Quantity and transport', 'Procurement approval'];
  const checks = [];
  const tickTex = canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#ff5e29'; c.beginPath(); c.arc(64, 64, 62, 0, TAU); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 15; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(36, 66); c.lineTo(56, 86); c.lineTo(93, 44); c.stroke(); }, true);
  TITLES.forEach((t, i) => {
    const x = (i - 2.5) * 2.7, z = -Math.abs(i - 2.5) * .35 + .5, ry = (i - 2.5) * .11;
    const tex = canvasTex(256, 340, (c, w, h) => {
      c.fillStyle = '#26282c'; c.fillRect(0, 0, w, h); c.fillStyle = '#ff5e29'; c.fillRect(0, 0, w, 10);
      c.fillStyle = '#ff7a4d'; c.font = '700 74px Inter, Arial'; c.fillText('0' + (i + 1), 22, 104);
      c.fillStyle = '#f4f2ee'; c.font = '600 27px Inter, Arial'; const words = t.split(' '); let line = '', yy = 160; words.forEach(wd => { if (c.measureText(line + wd).width > w - 44) { c.fillText(line.trim(), 22, yy); yy += 33; line = ''; } line += wd + ' '; }); c.fillText(line.trim(), 22, yy);
      c.fillStyle = 'rgba(255,255,255,.22)'; [236, 262, 288].forEach((q, k) => c.fillRect(22, q, k === 2 ? 90 : w - 44, 8));
    }, true);
    const card = new THREE.Mesh(new THREE.BoxGeometry(2.3, 3.05, .12), [new THREE.MeshStandardMaterial({ color: 0x26282c }), new THREE.MeshStandardMaterial({ color: 0x26282c }), new THREE.MeshStandardMaterial({ color: 0x26282c }), new THREE.MeshStandardMaterial({ color: 0x26282c }), new THREE.MeshStandardMaterial({ map: tex, roughness: .6 }), new THREE.MeshStandardMaterial({ color: 0x26282c })]); card.castShadow = true; card.position.set(x, 2.1, z); card.rotation.y = ry; p6.add(card);
    const ck = new THREE.Mesh(new THREE.PlaneGeometry(.78, .78), new THREE.MeshBasicMaterial({ map: tickTex, transparent: true })); ck.position.set(x + .7 * Math.cos(ry) , 1.0, z + .7 * Math.sin(-ry) * 0 + .08); ck.rotation.y = ry; ck.scale.setScalar(0); p6.add(ck); checks.push(ck);
  });
  bx(17, .5, 5.4, new THREE.MeshStandardMaterial({ color: 0xcfcac0, roughness: .8 }), X[5], .25, 0);

  const WP = (i, x, y, z = 0) => new V3(X[i] + DX[i] + x, y, DZ[i] + z);
  const views = { all: { az: -4, el: 40, dist: 72, t: [-2, 0, -1] }, ...Object.fromEntries(X.map((x, i) => ['s' + (i + 1), { az: -16, el: i < 3 ? 34 : 18, dist: i === 2 ? 30 : i === 3 ? 27 : i === 5 ? 29 : 22, t: [x + DX[i], i === 2 ? 1.6 : i === 5 ? 2.6 : 2.4, DZ[i]] }])) };
  views.s5.dist = 24;
  const lab = (id, text, a, side, vs, tone) => ({ id, text, side, tone, anchor: a, show: st => st.view === 'all' || vs.includes(st.view) });
  const sub = (id, text, a, side, vs, tone) => ({ id, text, side, tone, anchor: a, show: st => vs.includes(st.view) });
  const labels = [
    lab('s1', '1 · Weathering of rock', WP(0, 0, 8), 'r', ['s1']),
    lab('s2', '2 · Particle release', WP(1, 0, 3.6), 'r', ['s2']),
    lab('s3', '3 · Water transport', WP(2, 0, 4.3), 'r', ['s3']),
    lab('s4', '4 · Abrasion and sorting', WP(3, 0, 3.6), 'r', ['s4']),
    lab('s5', '5 · Deposition', WP(4, 0, 7.2), 'r', ['s5']),
    lab('s6', '6 · Source assessment', WP(5, 0, 5.6), 'r', ['s6'], 'hot'),
    sub('s3a', 'Faster flow carries finer grains further', WP(2, 4, 2.7, 2.5), 'r', ['s3']),
    sub('s3b', 'Coarser grains settle sooner', WP(2, -6, .9, 2.5), 'l', ['s3']),
    sub('s4a', 'Angular', WP(3, -4.6, 3.2), 'l', ['s4']), sub('s4b', 'Sub-rounded', WP(3, 0, 3.2), 'r', ['s4']), sub('s4c', 'Rounded', WP(3, 4.6, 3.2), 'r', ['s4']),
    sub('s5a', 'Different layers, different particle sizes', WP(4, 4.8, 3.6, 2.5), 'r', ['s5']),
    sub('s6a', 'Checked against each supply requirement', WP(5, 6.6, 3.9), 'r', ['s6'], 'hot'),
  ];

  return {
    scene, views, fov: 30, wide: true, labels, limits: { az: [-70, 70], el: [6, 62], dist: [10, 130] },
    update(t, dt, st) {
      const still = reduce(), T = still ? 3 : t;
      /* 1: fragments loosen and fall from the face, then land in the talus */
      fl.forEach((f, i) => { const u = still ? f.ph : (T * .11 + f.ph) % 1, fall = sm((u - .18) / .5); o3.position.set(f.x + fall * .8, f.y0 * (1 - fall * fall) + .25 * fall, f.z + fall * 1.2); o3.scale.setScalar(f.s * (u < .06 ? u / .06 : u > .94 ? (1 - u) / .06 : 1)); o3.rotation.set(f.o + u * 9, f.o, u * 5); o3.updateMatrix(); fm.setMatrixAt(i, o3.matrix); }); fm.instanceMatrix.needsUpdate = true;
      /* 3: grains travel at different speeds and come to rest at different distances */
      CLS.forEach(c => {
        c.it.forEach((p, i) => {
          const per = 20 / c.spd, u = still ? p.ph : ((T / per) + p.ph) % 1, run = clamp(u / .78), e = sm(run), x0 = CX - CL / 2 + .8, xs = x0 + (CX + CL / 2 - .8 - x0) * p.stop, x = x0 + (xs - x0) * e;
          let y = BED + c.r * .55; if (run < 1) { if (c.mode === 'hop') y += .12 + .5 * Math.abs(Math.sin(T * 2.6 * c.spd + p.o)) * p.h; else if (c.mode === 'float') y = BED + .5 + (WH - BED - .8) * (.15 + .75 * p.h) * (1 - sm((run - .86) / .14) * .92) + Math.sin(T * 1.7 + p.o) * .12; }
          const sc = u < .05 ? u / .05 : u > .94 ? (1 - u) / .06 : 1;
          o3.position.set(x, y, p.z); o3.scale.setScalar(c.r * sc * (c.mode === 'roll' ? 1.3 : 1.2)); o3.rotation.set(p.o + (run < 1 ? T * 2 * c.spd * p.w : 0), p.o * 2, p.o); o3.updateMatrix(); c.im.setMatrixAt(i, o3.matrix);
        }); c.im.instanceMatrix.needsUpdate = true;
      });
      /* 4: the three grains turn slowly */
      for (let i = 0; i < 3; i++) { const g = p4.userData['g' + i]; if (g) g.rotation.y = still ? i * 1.7 : T * .22 + i * 1.7; }
      /* 6: the cards are checked off one after another */
      const cyc = (T * .22) % 1.9; checks.forEach((c, i) => { const k = still ? 1 : sm((cyc - i * .22) / .25); c.scale.setScalar(.001 + k); });
      return !still;
    },
  };
}
