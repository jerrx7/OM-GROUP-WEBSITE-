/* scene: a general, example sequence from hard rock to classified fine aggregate: source rock, primary crushing, particle shaping, screening,
   fines management, stockpile. */
import { THREE, L, studio, rng } from '/assets/application-s3d.js';
import { grainGeos, grainMat, inst, moundItems, moundBase, reduce, V3, TAU } from '/assets/application-s3d-sand.js';
const { M, mk, canvasTex } = L;

export default function build({ state }) {
  const scene = new THREE.Scene(); studio(scene, { ext: 30, key: 2.2, shadow: .22, map: 2048 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xcfd2d6, metalness: .6, roughness: .45 }), dark = M.dark, orange = M.orange;
  const add = (m, x, y, z) => { m.position.set(x, y, z); scene.add(m); return m; };
  const bx = (w, h, d, mat, x, y, z) => add(mk(new THREE.BoxGeometry(w, h, d), mat), x, y, z);
  const cy = (rt, rb, h, mat, x, y, z, sg = 36) => add(mk(new THREE.CylinderGeometry(rt, rb, h, sg), mat), x, y, z);
  bx(42, .3, 12, new THREE.MeshStandardMaterial({ color: 0xe6e3dc, roughness: .8 }), 1, -.15, 0);
  const X = [-17, -11.5, -5, 2, 9.5, 16.5];
  /* 1 source rock */
  const r = rng(8), gm = grainMat(); const rockG = new THREE.Group(); rockG.position.set(X[0], 0, 0); scene.add(rockG); rockG.add(moundBase(3.2, 2.2, 0x45464a)); inst(rockG, moundItems(240, 3, 2.1, () => .28 + r() * .26, r), grainGeos('ang', 'stone'), gm, 3, true);
  /* 2 primary crushing: jaw-type box with a hopper and flywheel */
  bx(3, 3, 3, steel, X[1], 2, 0); add(mk(new THREE.CylinderGeometry(1.7, .8, 1.2, 4, 1, true), steel), X[1], 4.1, 0).rotation.y = Math.PI / 4; const fw = cy(1.1, 1.1, .4, orange, X[1] + 1.9, 2.4, 0); fw.rotation.x = Math.PI / 2; [[-1.2, -1.2], [1.2, 1.2], [-1.2, 1.2], [1.2, -1.2]].forEach(([a, b]) => bx(.25, .8, .25, dark, X[1] + a, .4, b));
  /* 3 particle shaping: a vertical-shaft impact crusher, cut open to show the rotor */
  cy(1.8, 1.8, 3.2, steel, X[2], 1.8, 0); add(new THREE.Mesh(new THREE.SphereGeometry(1.8, 30, 12, 0, TAU, 0, Math.PI / 2), steel), X[2], 3.4, 0); const rotor = cy(1.1, 1.1, .5, orange, X[2], 2.2, 0, 6); cy(.55, .55, .9, M.white, X[2], 4.6, 0); cy(.9, .55, 1.0, steel, X[2], 5.2, 0);
  /* 4 screening: an inclined vibrating screen with three decks and three outlets */
  const scr = new THREE.Group(); scr.position.set(X[3], 2.2, 0); scene.add(scr); scr.rotation.z = -.22; const sb = mk(new THREE.BoxGeometry(5.6, 1.4, 2.6), steel); scr.add(sb); [-.35, 0, .35].forEach(y => { const d = mk(new THREE.BoxGeometry(5.5, .06, 2.4), new THREE.MeshStandardMaterial({ color: 0x3a3d42, metalness: .5, roughness: .5 })); d.position.y = y; scr.add(d); }); [-2.2, 2.2].forEach(x => bx(.2, 1.7, .2, dark, X[3] + x, .85, 1.1));
  [[-.5, 'Coarse', 0x55575c], [0.7, 'Mid', 0x6a6c72]].forEach(([dz, t, c]) => { const o = bx(1.4, .9, 1.2, steel, X[3] + 3.4, .45, dz * 3.1 - .2); add(new THREE.Mesh(new THREE.ConeGeometry(.55, .5, 7), new THREE.MeshStandardMaterial({ color: c, roughness: 1 })), X[3] + 3.4, 1.1, dz * 3.1 - .2); });
  /* 5 fines management: a classifier tank with an inclined screw (where it is used) */
  bx(3.6, 1.7, 2.4, steel, X[4], 1.1, 0); const wat = bx(3.4, .1, 2.2, new THREE.MeshPhysicalMaterial({ color: 0x6fc0e6, roughness: .05, transparent: true, opacity: .75 }), X[4], 1.9, 0); const scw = cy(.35, .35, 4.2, M.steelS, X[4] + .6, 2.6, 0); scw.rotation.z = .5; bx(.18, 1.1, .18, dark, X[4] - 1.6, .55, 1); bx(.18, 1.1, .18, dark, X[4] + 1.6, .55, 1);
  /* 6 stockpile and dispatch */
  const sp = new THREE.Group(); sp.position.set(X[5] + .4, 0, 0); scene.add(sp); sp.add(moundBase(3.8, 2.8, 0x8c7d63)); const rs = rng(15); inst(sp, moundItems(1500, 3.6, 2.7, () => .07 + rs() * .1, rs), grainGeos('ang', 'm'), gm, 5, false);
  const tp = new THREE.Group(); tp.position.set(X[5] + 5.6, 0, 2.6); tp.rotation.y = -.5; scene.add(tp); { const q = mk(new THREE.BoxGeometry(4.2, 1.5, 2), orange); q.position.set(-.6, 1.8, 0); tp.add(q); } { const q = mk(new THREE.BoxGeometry(1.4, 1.6, 2), M.white); q.position.set(2.1, 1.7, 0); tp.add(q); } { const q = mk(new THREE.BoxGeometry(5.8, .4, 1.8), dark); q.position.set(.2, .9, 0); tp.add(q); } [-1.6, .8, 2.4].forEach(x => { const w = mk(new THREE.CylinderGeometry(.5, .5, .4, 20), M.rubber); w.rotation.x = Math.PI / 2; w.position.set(x, .5, .9); tp.add(w); const w2 = w.clone(); w2.position.z = -.9; tp.add(w2); });
  /* belts between stations */
  [[X[0] + 2, X[1] - 1.2, 1.2, 3.4], [X[1] + 1.6, X[2] - 1, 1.8, 3.9], [X[2] + 1.5, X[3] - 2.6, 3, 4.6]].forEach(([a, b, y0, y1]) => { const len = Math.hypot(b - a, y1 - y0), m = mk(new THREE.BoxGeometry(len, .2, .8), dark); m.position.set((a + b) / 2, (y0 + y1) / 2, 0); m.rotation.z = Math.atan2(y1 - y0, b - a); scene.add(m); });
  bx(3.6, .2, .8, dark, X[3] + 4.9, .5, -2); bx(3, .2, .8, dark, X[4] + 3.5, 1.2, 0).rotation.z = -.12;
  /* flowing material: four populations, each one smaller than the last */
  const SEG = [
    { n: 14, s: .42, pal: 'stone', path: [new V3(X[0] + 1.5, 2.6, 0), new V3(X[0] + 2.4, 1.6, 0), new V3(X[1] - 1.4, 3.4, 0), new V3(X[1], 4.6, 0)] },
    { n: 26, s: .26, pal: 'stone', path: [new V3(X[1], 1.2, 0), new V3(X[1] + 1.4, 1.5, 0), new V3(X[2] - 1, 3.9, 0), new V3(X[2], 5.8, 0)] },
    { n: 44, s: .14, pal: 'stone', path: [new V3(X[2], 1.2, 0), new V3(X[2] + 1.6, 3, 0), new V3(X[3] - 2.4, 4.6, 0), new V3(X[3] - 2, 4.2, 0), new V3(X[3] + 2.4, 2.4, 0)] },
    { n: 70, s: .08, pal: 'm', path: [new V3(X[3] + 2.4, 1.6, 0), new V3(X[3] + 4.9, .8, -2), new V3(X[4] - 1.4, 2.6, 0), new V3(X[4], 2.1, 0), new V3(X[4] + 2.6, 3.5, 0), new V3(X[5], 3.6, 0)] },
  ];
  const lp = (pts, u) => { const lens = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const l = pts[i].distanceTo(pts[i - 1]); lens.push(l); tot += l; } let d = u * tot; for (let i = 0; i < lens.length; i++) { if (d <= lens[i]) return pts[i].clone().lerp(pts[i + 1], d / lens[i]); d -= lens[i]; } return pts[pts.length - 1].clone(); };
  const hotM = new THREE.MeshStandardMaterial({ color: 0xff5e29, roughness: .5, emissive: 0xff5e29, emissiveIntensity: .35 });
  const pops = SEG.map((sg, si) => { const im = new THREE.InstancedMesh(grainGeos('ang', sg.pal)[0], gm, sg.n); im.frustumCulled = false; im.castShadow = false; scene.add(im); const rr = rng(40 + si); sg.it = Array.from({ length: sg.n }, () => ({ ph: rr(), o: rr() * 6, k: .8 + rr() * .5 })); return im; });
  const o3 = new THREE.Object3D();
  const S = [[X[0], 2], [X[1], 2.6], [X[2], 2.6], [X[3] + 1, 2.2], [X[4], 1.8], [X[5], 2]];
  const views = { all: { az: -14, el: 22, dist: 50, t: [0, 2.2, 0] }, ...Object.fromEntries(S.map(([x, y], i) => ['s' + (i + 1), { az: -20, el: 17, dist: 19, t: [x, y, 0] }])) };
  const lab = (id, text, a, side, vs, tone) => ({ id, text, side, tone, anchor: a, show: st => st.view === 'all' || vs.includes(st.view) });
  const labels = [
    lab('s1', 'Source rock', new V3(X[0], 3.8, 0), 'r', ['s1']), lab('s2', 'Primary crushing', new V3(X[1], 5.4, 0), 'r', ['s2']), lab('s3', 'Particle shaping', new V3(X[2], 6.4, 0), 'r', ['s3']),
    lab('s4', 'Screening and classification', new V3(X[3], 4.6, 0), 'r', ['s4']), lab('s5', 'Fines management, where used', new V3(X[4], 3.4, 1), 'r', ['s5']), lab('s6', (state.nm || 'M-Sand') + ' stockpile', new V3(X[5] + .4, 3.6, 0), 'r', ['s6'], 'hot'),
  ];
  return {
    scene, views, fov: 30, wide: true, labels, limits: { az: [-75, 75], el: [6, 60], dist: [9, 90] },
    update(t, dt, st) {
      SEG.forEach((sg, si) => { sg.it.forEach((it, i) => { const u = reduce() ? it.ph : (t * .075 + it.ph) % 1, p = lp(sg.path, u); o3.position.copy(p); o3.scale.setScalar(sg.s * it.k); o3.rotation.set(it.o + u * 6, it.o, 0); o3.updateMatrix(); pops[si].setMatrixAt(i, o3.matrix); }); pops[si].instanceMatrix.needsUpdate = true; pops[si].material = si === 3 && st.hl ? hotM : gm; });
      rotor.rotation.y = reduce() ? 0 : t * 6; scr.position.y = 2.2 + (reduce() ? 0 : Math.sin(t * 38) * .015); scw.rotation.y = reduce() ? 0 : t * 4; fw.rotation.z = reduce() ? 0 : t * 2;
      return !reduce();
    },
  };
}
