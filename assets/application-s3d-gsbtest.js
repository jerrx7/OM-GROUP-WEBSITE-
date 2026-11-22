/* scene: laboratory tests behind GSB acceptance. Two sets, one module.
   cbr : a California Bearing Ratio frame: a compacted specimen in its mould, a plunger driven into it, a proving ring and a dial. The soak state surrounds the mould with water and puts the surcharge weights on.
   abs : a water-absorption set: a wire basket of aggregate hung in a water tank beside a balance.
   No reading, load, result, certificate or OM GROUP test is shown. The reference loads used by the explainer come from the standard test method and are shown in the text, not here. */
import { THREE, L, studio, rng, instStones } from '/assets/application-s3d.js';
import { sectionTex, reduceM } from '/assets/application-s3d-wmkit.js';
const { M, mk, clamp, sm, lerp, TAU } = L;
const V3 = THREE.Vector3;

export default function build({ state }) {
  const set = state.set || 'cbr';
  const scene = new THREE.Scene(); studio(scene, { ext: 16, key: 2.3, shadow: .2, map: 2048 });
  const out = { scene, fov: 28, wide: true }; let T = 0; out.seek = v => { T = v; };
  const lab = (id, text, a, show, tone, side = 'r') => ({ id, text, side, tone, anchor: a, show: show || (() => true) });
  const go = st => st.play !== false && !reduceM();

  if (set === 'cbr') {
    const base = mk(new THREE.BoxGeometry(14, 1, 10), M.dark); base.position.y = .5; scene.add(base);
    [-5.5, 5.5].forEach(x => { const c = mk(new THREE.CylinderGeometry(.45, .45, 17, 16), M.steelS); c.position.set(x, 9.5, -2.6); scene.add(c); });
    const beam = mk(new THREE.BoxGeometry(13, 1.2, 2.4), M.steel); beam.position.set(0, 18, -2.6); scene.add(beam);
    const ring = mk(new THREE.TorusGeometry(1.3, .3, 12, 32), M.orange); ring.position.set(0, 14.4, 0); scene.add(ring);
    const dialG = new THREE.Group(); dialG.position.set(5.4, 12, 1.2); scene.add(dialG); const dface = mk(new THREE.CylinderGeometry(1.7, 1.7, .5, 40), M.white); dface.rotation.x = Math.PI / 2; dialG.add(dface); const needle = mk(new THREE.BoxGeometry(.12, 1.3, .1), M.red); needle.position.set(0, .55, .3); const ng = new THREE.Group(); ng.add(needle); ng.position.z = .1; dialG.add(ng);
    const plunger = new THREE.Group(); scene.add(plunger); const pl = mk(new THREE.CylinderGeometry(.9, .9, 10, 32), M.chrome); pl.position.y = 5; plunger.add(pl); const pk = mk(new THREE.CylinderGeometry(.9, .9, .3, 32), M.dark); pk.position.y = 0; plunger.add(pk);
    const stand = mk(new THREE.CylinderGeometry(3.1, 3.3, .5, 48), M.steelS); stand.position.y = 1.25; scene.add(stand);
    const mould = mk(new THREE.CylinderGeometry(3, 3, 4.4, 56, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xcfd3d8, metalness: .9, roughness: .3, side: THREE.DoubleSide })); mould.position.y = 3.7; scene.add(mould);
    const specM = [new THREE.MeshStandardMaterial({ map: sectionTex(9, 512, 128, 'gsb', [2, 1]), roughness: 1 }), new THREE.MeshStandardMaterial({ map: sectionTex(10, 256, 256, 'gsb'), roughness: 1 }), new THREE.MeshStandardMaterial({ color: 0x777 })];
    const spec = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, 4, 48), specM); spec.position.y = 3.5; spec.castShadow = true; scene.add(spec);
    const sur = []; [0, 1].forEach(i => { const w = mk(new THREE.CylinderGeometry(2.8, 2.8, .45, 40), M.dark); w.position.y = 5.7 + i * .5; w.visible = false; scene.add(w); sur.push(w); });
    const tank = mk(new THREE.BoxGeometry(9, 5.6, 9), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .05, transparent: true, opacity: .1, depthWrite: false }), { cast: false }); tank.position.set(0, 3.8, 0); tank.visible = false; scene.add(tank);
    const water = mk(new THREE.BoxGeometry(8.8, 4.6, 8.8), new THREE.MeshPhysicalMaterial({ color: 0x6fc0e6, roughness: .06, transparent: true, opacity: .32, depthWrite: false }), { cast: false }); water.position.set(0, 3.3, 0); water.visible = false; scene.add(water);
    out.views = { all: { az: -16, el: 12, dist: 40, t: [0, 8.5, 0] } }; out.limits = { az: [-50, 40], el: [3, 40], dist: [18, 62] };
    out.labels = [lab('p', 'Plunger', () => new V3(0, plunger.position.y + 4, 0), null, 'hot'), lab('r', 'Proving ring: measures the load', new V3(1.3, 14.4, 0), null, ''), lab('d', 'Penetration dial', new V3(5.4, 13.8, 1.2), null, '', 'r'), lab('s', 'Compacted specimen in its mould', new V3(-3, 3.5, 3), null, '', 'l'), lab('w', 'Soaked: water around the mould, surcharge on top', new V3(4.4, 5, 4.4), st => !!st.soak, 'warn', 'r')];
    out.update = (t, dt, st) => {
      if (go(st) && st.drive !== 'manual') T += dt; const auto = (T * .14) % 1; const pen = st.drive === 'manual' || !go(st) ? clamp(st.pen || 0) : (auto < .8 ? auto / .8 : 1 - (auto - .8) / .2);
      const soak = !!st.soak; tank.visible = water.visible = soak; sur.forEach(w => { w.visible = soak; });
      plunger.position.y = lerp(soak ? 7.2 : 6.2, 4.9, pen); ring.position.y = 14.4; ng.rotation.z = -pen * 5;
      spec.scale.y = 1; return go(st) || false;
    };
    return out;
  }
  /* abs */
  const tank = mk(new THREE.BoxGeometry(12, 7, 8), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .05, transparent: true, opacity: .1, depthWrite: false }), { cast: false }); tank.position.set(-4, 3.6, 0); scene.add(tank);
  const water = mk(new THREE.BoxGeometry(11.8, 5.6, 7.8), new THREE.MeshPhysicalMaterial({ color: 0x6fc0e6, roughness: .06, transparent: true, opacity: .34, depthWrite: false }), { cast: false }); water.position.set(-4, 3.1, 0); scene.add(water);
  const basket = new THREE.Group(); basket.position.set(-4, 3.2, 0); scene.add(basket);
  const bk = mk(new THREE.CylinderGeometry(2.4, 2.1, 3.4, 28, 1, true), M.mesh, { cast: false }); basket.add(bk); const bb = mk(new THREE.CylinderGeometry(2.1, 2.1, .1, 28), M.steelS); bb.position.y = -1.7; basket.add(bb);
  const r = rng(5), items = []; for (let i = 0; i < 28; i++) { const a = r() * TAU, rr = Math.sqrt(r()) * 1.7; items.push([Math.cos(a) * rr, -1.3 + r() * 1.8, Math.sin(a) * rr, .42 + r() * .25]); }
  instStones(basket, items, new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .9 }), 31, false);
  const wire = mk(new THREE.CylinderGeometry(.05, .05, 9, 8), M.steelS); wire.position.set(-4, 7.8, 0); scene.add(wire);
  const bal = new THREE.Group(); bal.position.set(7, 0, 0); scene.add(bal); const bbse = mk(new THREE.BoxGeometry(6, 1.4, 5), M.dark); bbse.position.y = .7; bal.add(bbse); const pan = mk(new THREE.CylinderGeometry(2, 2, .3, 36), M.steel); pan.position.y = 1.7; bal.add(pan); const disp = mk(new THREE.BoxGeometry(2.4, .8, .1), new THREE.MeshStandardMaterial({ color: 0x0c2a26, emissive: 0x2fe6b0, emissiveIntensity: .35 })); disp.position.set(0, .9, 2.55); bal.add(disp);
  out.views = { all: { az: -12, el: 14, dist: 36, t: [0, 4, 0] } }; out.limits = { az: [-50, 40], el: [3, 40], dist: [16, 56] };
  out.labels = [lab('t', 'Aggregate in a basket, held in water', new V3(-4, 7.4, 0), null, 'hot'), lab('b', 'Balance', new V3(7, 2.6, 0), null, ''), lab('n', 'No reading is shown', new V3(7, 5.4, 0), null, 'warn')];
  out.update = (t, dt, st) => { if (go(st)) T += dt; basket.position.y = 3.2 + Math.sin(T * 1.4) * .12; return go(st); };
  return out;
}
