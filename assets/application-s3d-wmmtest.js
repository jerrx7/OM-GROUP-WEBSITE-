/* scene: the laboratory tests behind WMM aggregate quality. Four sets, one module.
   shape  : four particles (cubical, flaky, elongated, irregular) on stands, with length / width / thickness bars.
   la     : a Los Angeles abrasion drum with a shelf and a steel charge, turning.
   impact : an aggregate impact test: a hammer falls on a sample in a cup.
   pi     : fine material through a 425 micron sieve, then a thread rolled out for the plasticity test.
   No result, certificate, limit or OM GROUP test is shown. Particle shapes are generated, not scanned. */
import { THREE, L, studio, rng, instStones } from '/assets/application-s3d.js';
import { reduceM } from '/assets/application-s3d-wmkit.js';
const { M, mk, clamp, sm, lerp, TAU, stone, canvasTex } = L;
const V3 = THREE.Vector3;

export default function build({ state }) {
  const set = state.set || 'shape';
  const scene = new THREE.Scene(); studio(scene, { ext: 16, key: 2.3, shadow: .2, map: 2048 });
  const out = { scene, fov: 28, wide: true };
  const lab = (id, text, a, show, tone, side = 'r') => ({ id, text, side, tone, anchor: a, show });
  const disc = new THREE.MeshStandardMaterial({ color: 0xe7e4de, roughness: .6 });

  if (set === 'shape') {
    const SH = [['cub', 'Cubical', [1, 1, 1]], ['fla', 'Flaky', [1.7, .3, 1.5]], ['elo', 'Elongated', [2.5, .68, .68]], ['irr', 'Irregular', [1.2, .8, 1]]], X = [-9, -3, 3, 9], R = rng(9), parts = [];
    const bar = (a, b, c, col) => { const m = mk(new THREE.CylinderGeometry(.045, .045, 1, 8), new THREE.MeshBasicMaterial({ color: col }), { cast: false }); m.userData = { a, b }; return m; };
    SH.forEach(([k, name, sc], i) => {
      const g = new THREE.Group(); g.position.set(X[i], 0, 0); scene.add(g); const d = mk(new THREE.CylinderGeometry(2.2, 2.4, .35, 40), disc); d.position.y = .17; g.add(d);
      const pivot = new THREE.Group(); pivot.position.y = 2; g.add(pivot);
      const s = stone(R, 1, sc[0], sc[1], sc[2]); s.rotation.set(0, 0, 0); const SC = 1.05; s.scale.set(sc[0] * SC, sc[1] * SC, sc[2] * SC); if (k === 'cub') s.scale.set(SC * 1.05, SC * 1.0, SC * 1.05); pivot.add(s);
      const pl = mk(new THREE.CylinderGeometry(.5, .8, 1.2, 24), M.steelS); pl.position.y = -.5 - sc[1] * 1.0 + .4; pivot.parent.add(pl);
      pivot.position.y = 2.4 + sc[1] * .6; pl.position.y = 2.4 + sc[1] * .6 - sc[1] * .8 - .6;
      pivot.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(s), c = bb.getCenter(new V3()), hs = bb.getSize(new V3()).multiplyScalar(.5); c.sub(pivot.getWorldPosition(new V3()));
      const mkb = (len, axis, col, off) => { const b2 = mk(new THREE.CylinderGeometry(.05, .05, len, 8), new THREE.MeshBasicMaterial({ color: col }), { cast: false }); if (axis === 'x') b2.rotation.z = Math.PI / 2; if (axis === 'z') b2.rotation.x = Math.PI / 2; b2.position.set(...off); pivot.add(b2); return b2; };
      mkb(hs.x * 2, 'x', 0xff5e29, [c.x, c.y - hs.y - .3, c.z + hs.z + .3]); mkb(hs.z * 2, 'z', 0x2c86c9, [c.x + hs.x + .3, c.y - hs.y - .3, c.z]); mkb(hs.y * 2, 'y', 0x4a7a1a, [c.x + hs.x + .3, c.y, c.z + hs.z + .3]);
      parts.push({ g, pivot, k });
    });
    out.views = { all: { az: -8, el: 12, dist: 32, t: [0, 2.8, 0] }, cub: { az: -8, el: 14, dist: 15, t: [X[0], 3, 0] }, fla: { az: -8, el: 14, dist: 15, t: [X[1], 3, 0] }, elo: { az: -8, el: 14, dist: 15, t: [X[2], 3, 0] }, irr: { az: -8, el: 14, dist: 15, t: [X[3], 3, 0] } };
    out.limits = { az: [-50, 50], el: [4, 50], dist: [12, 56] };
    out.labels = SH.map(([k, name], i) => lab(k, name, new V3(X[i], 5.2 + (i % 2) * 2.2, 0), st => !st.view || st.view === 'all' || st.view === k, '', 'r')).concat([lab('l', 'Length', new V3(X[2], .4, 1.6), st => st.view === 'elo' || st.view === 'fla', '', 'r'), lab('t', 'Thickness', new V3(X[1] + 1.6, 2, 1.6), st => st.view === 'fla', 'hot', 'r')]);
    let T = 0; out.seek = v => { T = v; };
    out.update = (t, dt, st) => { const go = st.play !== false && !reduceM(); if (go) T += dt; parts.forEach((p, i) => { p.pivot.rotation.y = T * .5 + i; }); return go; };
    return out;
  }

  if (set === 'la') {
    const g = new THREE.Group(); scene.add(g); const Rr = 5, Ld = 7;
    const drum = new THREE.Group(); drum.position.y = 6.4; g.add(drum);
    const wall = mk(new THREE.CylinderGeometry(Rr, Rr, Ld, 56, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xcfd3d8, metalness: .8, roughness: .35, transparent: true, opacity: .28, side: THREE.DoubleSide, depthWrite: false }), { cast: false }); wall.rotation.x = Math.PI / 2; drum.add(wall);
    [-1, 1].forEach(s => { const cap = mk(new THREE.CylinderGeometry(Rr, Rr, .25, 56), M.steel); cap.rotation.x = Math.PI / 2; cap.position.z = s * (Ld / 2); cap.material = new THREE.MeshPhysicalMaterial({ color: 0xcfd3d8, metalness: .6, roughness: .4, transparent: true, opacity: .12, depthWrite: false }); drum.add(cap); });
    const shelf = mk(new THREE.BoxGeometry(.3, 1.4, Ld - .2), M.orange); shelf.position.set(Rr - .75, 0, 0); const sh = new THREE.Group(); sh.add(shelf); drum.add(sh);
    [-1, 1].forEach(s => { const st2 = mk(new THREE.BoxGeometry(.5, 6.4, .5), M.dark); st2.position.set(s * 6.2, 3.2, -1); g.add(st2); const ax = mk(new THREE.CylinderGeometry(.5, .5, 1, 16), M.steelS); ax.rotation.x = Math.PI / 2; ax.position.set(s * 0, 6.4, s * (Ld / 2 + .5)); g.add(ax); });
    const base = mk(new THREE.BoxGeometry(15, .6, 6), M.dark); base.position.y = .3; g.add(base);
    const r = rng(21), N = 26, balls = 11, items = [], objs = [];
    const stoneM = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .9 });
    const sm2 = new THREE.InstancedMesh(L.STONES[3], stoneM, N); sm2.frustumCulled = false; sm2.position.y = 6.4; g.add(sm2);
    const bm = new THREE.InstancedMesh(new THREE.SphereGeometry(.5, 16, 12), M.ball, balls); bm.frustumCulled = false; bm.position.y = 6.4; g.add(bm);
    for (let i = 0; i < N; i++) objs.push({ a: r() * TAU, rad: .35 + r() * .5, z: (r() - .5) * (Ld - 1.6), ph: r(), sp: .6 + r() * .6 });
    const bobjs = Array.from({ length: balls }, () => ({ a: r() * TAU, z: (r() - .5) * (Ld - 1.4), ph: r() }));
    out.views = { all: { az: -16, el: 12, dist: 34, t: [0, 6, 0] } }; out.limits = { az: [-60, 40], el: [3, 40], dist: [16, 56] };
    out.labels = [lab('d', 'Rotating drum', new V3(0, 11.8, 0), null, 'hot', 'r'), lab('s', 'Shelf lifts the charge', new V3(0, 6.4, Ld / 2 + .3), null, '', 'l'), lab('b', 'Steel charge and aggregate sample', new V3(-1.5, 3.4, 3), null, '', 'l')];
    let T = 0; out.seek = v => { T = v; }; const o = new THREE.Object3D();
    out.update = (t, dt, st) => {
      const go = st.play !== false && !reduceM(); if (go) T += dt; const rot = T * .9; drum.rotation.z = -rot; sh.rotation.z = 0;
      const place = (p, scl, im, i, ball) => { const ph = (rot * .16 + p.ph) % 1; let x, y; if (ph < .55) { const a = -Math.PI / 2 - .5 + (ph / .55) * 1.9 - rot * 0; const rr = Rr - 1.1 - (p.rad || .5) * .3; x = Math.cos(a + Math.PI) * rr * -1; y = Math.sin(a) * rr; x = Math.cos(a) * rr; } else { const k = (ph - .55) / .45, a0 = -Math.PI / 2 - .5 + 1.9, x0 = Math.cos(a0) * (Rr - 1.4), y0 = Math.sin(a0) * (Rr - 1.4), xe = -x0 * .3, ye = -Rr + 1.2; x = lerp(x0, xe, k); y = lerp(y0, ye, k * k) + Math.sin(k * Math.PI) * 1.2; }
        o.position.set(x, y, p.z); o.scale.setScalar(scl); o.rotation.set(ph * 7, ph * 5, 0); o.updateMatrix(); im.setMatrixAt(i, o.matrix); };
      /* the drum itself spins; the charge is drawn in the world frame, so counter-rotate the group of particles */
      objs.forEach((p, i) => place(p, p.rad, sm2, i)); bobjs.forEach((p, i) => place(p, 1, bm, i, true)); sm2.instanceMatrix.needsUpdate = bm.instanceMatrix.needsUpdate = true;
      return go;
    };
    return out;
  }

  if (set === 'impact') {
    const g = new THREE.Group(); scene.add(g);
    const base = mk(new THREE.CylinderGeometry(4.4, 4.8, 1.2, 40), M.dark); base.position.y = .6; g.add(base);
    const cup = mk(new THREE.CylinderGeometry(1.7, 1.55, 1.3, 36, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xcfd3d8, metalness: 1, roughness: .3, side: THREE.DoubleSide })); cup.position.y = 1.9; g.add(cup);
    const cb = mk(new THREE.CylinderGeometry(1.55, 1.55, .2, 36), M.steelS); cb.position.y = 1.35; g.add(cb);
    const samp = []; const r = rng(7); const sm3 = new THREE.InstancedMesh(L.STONES[1], new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .9 }), 18); sm3.frustumCulled = false; g.add(sm3); const o = new THREE.Object3D();
    for (let i = 0; i < 18; i++) { const a = r() * TAU, rr = Math.sqrt(r()) * 1.1; o.position.set(Math.cos(a) * rr, 1.7 + r() * .5, Math.sin(a) * rr); o.scale.setScalar(.3 + r() * .08); o.rotation.set(r() * 6, r() * 6, r() * 6); o.updateMatrix(); sm3.setMatrixAt(i, o.matrix); }
    [-1, 1].forEach(s => { const gd = mk(new THREE.CylinderGeometry(.16, .16, 13, 10), M.steelS); gd.position.set(s * 1.3, 7.6, 0); g.add(gd); }); const top = mk(new THREE.BoxGeometry(3.4, .5, 1), M.dark); top.position.y = 14.2; g.add(top);
    const ham = new THREE.Group(); g.add(ham); const hm = mk(new THREE.CylinderGeometry(1.0, 1.0, 1.7, 32), M.steelS); ham.add(hm); const tipc = mk(new THREE.CylinderGeometry(.9, .8, .4, 32), M.chrome); tipc.position.y = -1; ham.add(tipc); const knob = mk(new THREE.BoxGeometry(2.8, .5, .9), M.orange); knob.position.y = .9; ham.add(knob);
    out.views = { all: { az: -16, el: 12, dist: 40, t: [0, 6.8, 0] } }; out.limits = { az: [-60, 40], el: [3, 40], dist: [16, 60] };
    out.labels = [lab('h', 'Falling hammer', () => new V3(0, ham.position.y + 1.2, 0), null, 'hot', 'r'), lab('c', 'Steel cup with the aggregate sample', new V3(0, 2.8, 0), null, '', 'l'), lab('g', 'Guide columns', new V3(1.3, 10, 0), null, '', 'r')];
    let T = 0; out.seek = v => { T = v; };
    out.update = (t, dt, st) => { const go = st.play !== false && !reduceM(); if (go) T += dt; const u = (T * .45) % 1; const fall = u < .45 ? 1 - (u / .45) ** 2 : u < .55 ? 0 : sm((u - .55) / .45) * 1; ham.position.y = 3.6 + fall * 9; return go; };
    return out;
  }

  /* pi */
  const g = new THREE.Group(); scene.add(g);
  const pan = mk(new THREE.CylinderGeometry(3.6, 3.2, 1.2, 48), M.steel); pan.position.set(-5, .6, 0); g.add(pan);
  const sv = mk(new THREE.CylinderGeometry(3.4, 3.4, 1, 48, 1, true), M.steel); sv.position.set(-5, 2.2, 0); g.add(sv);
  const mesh = mk(new THREE.CircleGeometry(3.3, 48), M.mesh, { cast: false }); mesh.rotation.x = -Math.PI / 2; mesh.position.set(-5, 1.9, 0); g.add(mesh);
  const pow = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.2, 36), new THREE.MeshStandardMaterial({ color: 0xcdbfa6, roughness: 1 })); pow.position.set(-5, 2.5, 0); g.add(pow);
  const under = new THREE.Mesh(new THREE.ConeGeometry(1.6, .7, 28), new THREE.MeshStandardMaterial({ color: 0xcdbfa6, roughness: 1 })); under.position.set(-5, 1.55, 0); under.visible = false; g.add(under);
  const plate = mk(new THREE.BoxGeometry(9, .3, 6), new THREE.MeshPhysicalMaterial({ color: 0xd8e6ee, transparent: true, opacity: .55, roughness: .08 })); plate.position.set(6, .3, 0); g.add(plate);
  const thread = mk(new THREE.CylinderGeometry(.2, .2, 7, 14), new THREE.MeshStandardMaterial({ color: 0xa79a84, roughness: 1 })); thread.rotation.z = Math.PI / 2; thread.position.set(6, .65, .5); g.add(thread);
  const hand = mk(new THREE.BoxGeometry(2.6, .3, 1.4), new THREE.MeshStandardMaterial({ color: 0xc58a62, roughness: .8 })); hand.position.set(6, 1.1, .5); g.add(hand);
  out.views = { all: { az: -12, el: 20, dist: 26, t: [0, 1.5, 0] }, sieve: { az: -14, el: 22, dist: 18, t: [-5, 1.8, 0] }, thread: { az: -10, el: 28, dist: 18, t: [6, .6, 0] } };
  out.limits = { az: [-60, 40], el: [4, 60], dist: [10, 54] };
  out.labels = [lab('s', '425 micron IS sieve', new V3(-5, 3.6, 0), st => st.view !== 'thread', 'hot', 'r'), lab('f', 'Fines pass through to the pan', new V3(-5, 1, 3.2), st => st.view !== 'thread', '', 'l'), lab('t', 'A thread is rolled and re-rolled on a glass plate', new V3(6, 1.6, 0), st => st.view !== 'sieve', 'hot', 'r')];
  let T = 0; out.seek = v => { T = v; };
  out.update = (t, dt, st) => { const go = st.play !== false && !reduceM(); if (go) T += dt; const u = (T * .3) % 1; sv.rotation.y = T * 2; pow.scale.y = 1 - u * .6; under.visible = true; under.scale.setScalar(.4 + u * .8); hand.position.z = .5 + Math.sin(T * 4) * .5; thread.scale.set(1, 1 - Math.min(.3, u * .35), 1); return go; };
  return out;
}
