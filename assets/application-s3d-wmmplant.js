/* scene: a GENERAL wet-mix production plant, cutaway. Five aggregate feed bins with variable-speed feeders, a collecting conveyor, a vibrating oversize screen, a twin-shaft pugmill with
   controlled water addition, a discharge hopper over a tipper, a control cabin. A switch shows the mix too dry, properly conditioned or too wet.
   A general view of the process. OM GROUP supplies the aggregate fractions, not the wet mix. No proportion, water quantity,
   output or moisture value is shown or implied. */
import { THREE, L, studio, rng, instStones } from '/assets/application-s3d.js';
import { tipper, reduceM } from '/assets/application-s3d-wmkit.js';
const { M, mk, clamp, sm, lerp, TAU } = L;
const V3 = THREE.Vector3;

export default function build({ state }) {
  const scene = new THREE.Scene(); studio(scene, { ext: 60, key: 2.2, shadow: .2, map: 2048 });
  const out = { scene, fov: 30, wide: true };
  const floor = mk(new THREE.BoxGeometry(150, .4, 50), new THREE.MeshStandardMaterial({ color: 0xe9e6df, roughness: .9 })); floor.position.set(8, -.2, 0); scene.add(floor);
  const steel = M.steelS, blue = new THREE.MeshStandardMaterial({ color: 0x4f7fa6, roughness: .5, metalness: .2 });
  const bins = new THREE.Group(); scene.add(bins); const FR = ['40', '20', '10', '6', 'Screenings'], BX = [-52, -40, -28, -16, -4], pm = [];
  FR.forEach((n, i) => {
    const g = new THREE.Group(); g.position.set(BX[i], 0, -8); bins.add(g);
    const b = mk(new THREE.CylinderGeometry(5.2, 1.6, 7, 4, 1, true), new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: .5, roughness: .5, side: THREE.DoubleSide })); b.rotation.y = Math.PI / 4; b.position.y = 12; g.add(b);
    [[-3.4, -3.4], [3.4, -3.4], [-3.4, 3.4], [3.4, 3.4]].forEach(([x, z]) => { const l = mk(new THREE.BoxGeometry(.5, 8.6, .5), steel); l.position.set(x, 4.3, z); g.add(l); });
    const pile = mk(new THREE.ConeGeometry(3.8, 2.6, 4), new THREE.MeshStandardMaterial({ color: i === 4 ? 0x8a8782 : 0x303134, roughness: 1 })); pile.rotation.y = Math.PI / 4; pile.position.y = 15; g.add(pile);
    const fd = mk(new THREE.BoxGeometry(3.2, .5, 3.2), M.dark); fd.position.y = 1.6; g.add(fd);   /* variable-speed feeder */
    const mt = mk(new THREE.CylinderGeometry(.7, .7, .8, 16), M.orange); mt.rotation.x = Math.PI / 2; mt.position.set(0, 1.6, 2.3); g.add(mt); pm.push(mt);
  });
  const coll = mk(new THREE.BoxGeometry(60, .5, 2.6), M.rubber); coll.position.set(-28, .9, -8); scene.add(coll);
  [-52, -40, -28, -16, -4].forEach(x => { const s = mk(new THREE.BoxGeometry(.4, .9, 2.4), steel, { cast: false }); s.position.set(x, .45, -8); scene.add(s); });
  /* inclined conveyor to the screen and pugmill */
  const c0 = new V3(2, 1.2, -8), c1 = new V3(24, 18, -8), cl = c0.distanceTo(c1), ang = Math.atan2(c1.y - c0.y, c1.x - c0.x);
  const ic = mk(new THREE.BoxGeometry(cl, .5, 2.6), M.rubber); ic.position.copy(c0).lerp(c1, .5); ic.rotation.z = ang; scene.add(ic);
  [.35, .7].forEach(u => { const p = c0.clone().lerp(c1, u); const lg = mk(new THREE.BoxGeometry(.4, p.y, .4), steel); lg.position.set(p.x, p.y / 2, -6.8); scene.add(lg); const lg2 = lg.clone(); lg2.position.z = -9.2; scene.add(lg2); });
  const scr = mk(new THREE.BoxGeometry(8, 3, 6), new THREE.MeshStandardMaterial({ color: 0x5b5f66, metalness: .5, roughness: .5 })); scr.position.set(27, 19, -8); scr.rotation.z = -.12; scene.add(scr);
  [[-3, -2.5], [3, -2.5], [-3, 2.5], [3, 2.5]].forEach(([x, z]) => { const l = mk(new THREE.BoxGeometry(.5, 18, .5), steel); l.position.set(27 + x, 9, -8 + z); scene.add(l); });
  /* pugmill: an open trough with two paddle shafts, over a discharge hopper */
  const pg = new THREE.Group(); pg.position.set(36, 8.5, 2); scene.add(pg);
  const trough = mk(new THREE.BoxGeometry(18, 4.4, 8), new THREE.MeshStandardMaterial({ color: 0x4a4d52, metalness: .5, roughness: .55, transparent: true, opacity: .45, depthWrite: false })); pg.add(trough);
  const paddles = [-1.7, 1.7].map(z => { const sh = new THREE.Group(); sh.position.set(0, -.2, z); pg.add(sh); const ax = mk(new THREE.CylinderGeometry(.35, .35, 17.4, 12), steel); ax.rotation.z = Math.PI / 2; sh.add(ax); for (let i = 0; i < 9; i++) { const pd = mk(new THREE.BoxGeometry(1.5, .2, .9), M.orange); pd.position.set(-8 + i * 2, 0, 0); pd.rotation.x = i * .6; const arm = new THREE.Group(); arm.add(pd); arm.rotation.x = i * .7; sh.add(arm); pd.position.set(-8 + i * 2, 1.1, 0); } return sh; });
  const mixItems = [], rm = rng(3); for (let i = 0; i < 260; i++) mixItems.push([-7.6 + rm() * 15.2, -1.9 + rm() * 1.7, -3 + rm() * 6, .22 + rm() * .45]);
  const dryM = new THREE.MeshStandardMaterial({ color: 0xcfcbc2, vertexColors: true, roughness: 1 }), okM = new THREE.MeshStandardMaterial({ color: 0x8f918f, vertexColors: true, roughness: .85 }), wetM = new THREE.MeshStandardMaterial({ color: 0x4d5054, vertexColors: true, roughness: .25, metalness: .1 });
  const mixG = new THREE.Group(); pg.add(mixG); const dry = instStones(mixG, mixItems, dryM, 3), okk = instStones(mixG, mixItems, okM, 3), wet = instStones(mixG, mixItems, wetM, 3);
  const puddle = mk(new THREE.BoxGeometry(15.2, .22, 6), new THREE.MeshPhysicalMaterial({ color: 0x6fc0e6, roughness: .06, transparent: true, opacity: .5, depthWrite: false }), { cast: false }); puddle.position.y = -1.8; pg.add(puddle);
  const dust = mk(new THREE.BoxGeometry(15.4, .08, 6.2), new THREE.MeshBasicMaterial({ color: 0xe9e6df, transparent: true, opacity: .35, depthWrite: false }), { cast: false }); dust.position.y = -1.1; pg.add(dust);
  /* water tank, pipe and spray bar */
  const tank = mk(new THREE.CylinderGeometry(3, 3, 7, 28), blue); tank.position.set(52, 3.5, 6); scene.add(tank); const wp = mk(new THREE.CylinderGeometry(.28, .28, 22, 10), blue); wp.rotation.z = Math.PI / 2; wp.position.set(41, 12.6, 5); scene.add(wp); const wv = mk(new THREE.CylinderGeometry(.28, .28, 3.6, 10), blue); wv.position.set(31, 11, 5); scene.add(wv);
  const sprayBar = mk(new THREE.CylinderGeometry(.2, .2, 14, 10), blue); sprayBar.rotation.z = Math.PI / 2; sprayBar.position.set(36, 11.3, 2); scene.add(sprayBar);
  const dropI = new THREE.InstancedMesh(new THREE.SphereGeometry(.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0x6fc0e6, transparent: true, opacity: .85 }), 60); dropI.frustumCulled = false; scene.add(dropI);
  /* discharge hopper, tipper, control cabin */
  const dh = mk(new THREE.CylinderGeometry(4.4, 1.2, 4.2, 4, 1, true), new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: .5, roughness: .5, side: THREE.DoubleSide })); dh.rotation.y = Math.PI / 4; dh.position.set(50, 11, 2); scene.add(dh);
  [[-3.4, -3.4], [3.4, -3.4], [-3.4, 3.4], [3.4, 3.4]].forEach(([x, z]) => { const l = mk(new THREE.BoxGeometry(.5, 10, .5), steel); l.position.set(50 + x, 5, 2 + z); scene.add(l); });
  const tp = tipper({ tarp: false }); tp.g.rotation.y = Math.PI; tp.g.position.set(50, 0, 2); tp.g.scale.setScalar(.8); scene.add(tp.g);
  const cab = new THREE.Group(); cab.position.set(-18, 0, 12); scene.add(cab); const cb = mk(new THREE.BoxGeometry(10, 5, 6), M.white); cb.position.y = 2.5; cab.add(cb); const win = mk(new THREE.BoxGeometry(7, 1.8, .15), new THREE.MeshStandardMaterial({ color: 0x5a7d93, roughness: .1, metalness: .3 })); win.position.set(0, 3, 3.1); cab.add(win); const lt = mk(new THREE.BoxGeometry(.4, .4, .4), M.green); lt.position.set(4.6, 5.3, 2.5); cab.add(lt);
  /* a vent stack and safety rail posts, to read as an industrial site */
  for (let i = 0; i < 6; i++) { const p = mk(new THREE.CylinderGeometry(.15, .15, 2, 8), new THREE.MeshStandardMaterial({ color: 0xe0b01c, roughness: .6 })); p.position.set(26 + i * 4.4, 1, 17); scene.add(p); }
  out.views = { all: { az: -16, el: 18, dist: 150, t: [-4, 8, -2] }, feed: { az: -10, el: 16, dist: 70, t: [-26, 6, -8] }, mix: { az: -18, el: 18, dist: 54, t: [38, 9, 2] } };
  out.limits = { az: [-50, 50], el: [4, 50], dist: [30, 180] };
  const lab = (id, text, a, vs, tone, side = 'r') => ({ id, text, side, tone, anchor: a, show: st => vs.includes(st.view || 'all') });
  out.labels = [lab('b', 'Aggregate feed bins, one per fraction', new V3(-28, 17.4, -8), ['all', 'feed'], 'hot'), lab('f', 'Variable-speed feeders', new V3(-40, 2.2, -4), ['all', 'feed']), lab('c', 'Conveyor', new V3(14, 11, -8), ['all', 'feed']), lab('s', 'Oversize screen', new V3(27, 22, -8), ['all', 'feed']), lab('p', 'Pugmill (forced mixing)', new V3(36, 12, 2), ['all', 'mix'], 'hot'), lab('w', 'Controlled water addition', new V3(36, 13.6, 2), ['mix'], '', 'l'), lab('t', 'Water supply', new V3(52, 8, 6), ['all', 'mix']), lab('d', 'Discharge to a covered tipper', new V3(52, 14, 2), ['all', 'mix']), lab('k', 'Control cabin', new V3(-18, 6, 12), ['all', 'feed']), lab('g', 'WET-MIX PRODUCTION PROCESS', new V3(2, 24, -2), ['all', 'feed', 'mix'], 'warn', 'r')];
  let T = 0; out.seek = v => { T = v; }; const o = new THREE.Object3D(), r2 = rng(44), dr = Array.from({ length: 60 }, () => ({ x: (r2() - .5) * 12, z: (r2() - .5) * 3, ph: r2() }));
  out.update = (t, dt, st) => {
    const go = st.play !== false && !reduceM(); if (go) T += dt; const cond = st.cond || 'ok';
    paddles.forEach((p, i) => { p.rotation.x = (i ? -1 : 1) * T * 1.6; }); pm.forEach(m => { m.rotation.z = T * 3; });
    dry.forEach(m => { m.visible = cond === 'dry'; }); okk.forEach(m => { m.visible = cond === 'ok'; }); wet.forEach(m => { m.visible = cond === 'wet'; }); puddle.visible = cond === 'wet'; dust.visible = cond === 'dry';
    const flow = cond === 'dry' ? .25 : 1; dropI.visible = true;
    dr.forEach((d, i) => { const u = (T * .8 * flow + d.ph) % 1; o.position.set(36 + d.x, 11.1 - u * 8.3, 2 + d.z); o.scale.setScalar(cond === 'dry' && i > 12 ? .001 : 1); o.rotation.set(0, 0, 0); o.updateMatrix(); dropI.setMatrixAt(i, o.matrix); }); dropI.instanceMatrix.needsUpdate = true;
    return go;
  };
  return out;
}
