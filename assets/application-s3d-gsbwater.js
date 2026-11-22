/* scene: water, filters and load in a pavement section. Three sets, one module.
   drain  : a cut section: subgrade, a granular drainage layer, a base course with a crack at the surface. Water enters, moves through the voids and leaves through an edge outlet.
            Switch the outlet off and the same water collects: a permeable layer needs a working outlet.
   filter : two interfaces side by side. A compatible arrangement retains the soil particles; an incompatible one lets fines migrate into the voids.
   load   : a wheel on the surface and a stress field spreading through surface, base, GSB and subgrade.
   Drawings. No permeability, flow rate, filter criterion, stress value or finite-element result is shown, and none is implied. Not a filter or drainage design. */
import { THREE, L, studio, rng, instStones } from '/assets/application-s3d.js';
import { layerBlock, soilMat, reduceM } from '/assets/application-s3d-wmkit.js';
const { M, mk, clamp, sm, lerp, TAU, canvasTex } = L;
const V3 = THREE.Vector3;

export default function build({ state }) {
  const set = state.set || 'drain';
  const scene = new THREE.Scene(); studio(scene, { ext: 50, key: 2.2, shadow: .2, map: 2048 });
  const out = { scene, fov: 30, wide: true };
  const lab = (id, text, a, show, tone, side = 'r') => ({ id, text, side, tone, anchor: a, show: show || (() => true) });
  const stoneM = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .9, emissive: 0x3a3a3a });
  const fineM = new THREE.MeshStandardMaterial({ color: 0xb08a5e, roughness: 1 });
  const dropM = new THREE.MeshBasicMaterial({ color: 0x4f9ccf });
  const o = new THREE.Object3D(); let T = 0;
  const go = st => st.play !== false && !reduceM();

  if (set === 'drain') {
    const W = 56, D = 16, SUB = 5, GSB = 6, BASE = 4;
    const sub = mk(new THREE.BoxGeometry(W, SUB, D), new THREE.MeshStandardMaterial({ map: (() => { const s = soilMat(3); s.map.repeat.set(4, 1); return s.map; })(), roughness: 1 })); sub.position.y = -SUB / 2; scene.add(sub);
    /* the drainage layer: a dark block of voids with stones through it */
    const gsb = layerBlock(W, GSB, D, 'gsb', 7, 0x7d7a73); gsb.position.y = GSB / 2; scene.add(gsb);
    const base = layerBlock(W, BASE, D, 'wmm', 11, 0x2d2e31); base.position.y = GSB + BASE / 2; scene.add(base);
    const crack = mk(new THREE.BoxGeometry(.5, BASE, D - 1), new THREE.MeshBasicMaterial({ color: 0x0d0d0f }), { cast: false }); crack.position.set(-10, GSB + BASE / 2 + .01, 0); scene.add(crack);
    /* the edge outlet: a pipe and a side drain */
    const pipe = mk(new THREE.CylinderGeometry(1.1, 1.1, 5, 20), new THREE.MeshStandardMaterial({ color: 0x4f7fa6, roughness: .5 })); pipe.rotation.z = Math.PI / 2; pipe.position.set(W / 2 + 2.4, 1.2, 0); scene.add(pipe);
    const drain = mk(new THREE.BoxGeometry(7, 1.2, D), new THREE.MeshStandardMaterial({ color: 0xcfd6dc, roughness: .8 })); drain.position.set(W / 2 + 7.5, -.6, 0); scene.add(drain);
    const pool = mk(new THREE.BoxGeometry(W - .4, 1, .12), new THREE.MeshPhysicalMaterial({ color: 0x6fc0e6, roughness: .08, transparent: true, opacity: .45, depthWrite: false }), { cast: false }); pool.position.set(0, .7, D / 2 + .1); pool.scale.y = .01; scene.add(pool);
    const N = 90, drops = new THREE.InstancedMesh(new THREE.SphereGeometry(.34, 8, 6), dropM, N); drops.frustumCulled = false; scene.add(drops);
    const r = rng(12), dr = Array.from({ length: N }, (_, i) => ({ z: D / 2 + .25 + r() * .15, ph: r(), x: (r() - .5) * 2, k: r() }));
    out.views = { all: { az: -14, el: 13, dist: 118, t: [6, 2, 0] } }; out.limits = { az: [-50, 40], el: [4, 45], dist: [40, 150] };
    out.labels = [lab('c', 'Water enters at a crack', new V3(-10, GSB + BASE + .5, D / 2), null, ''), lab('b', 'Base course', new V3(-W / 2 + 6, GSB + BASE / 2, D / 2), null, '', 'l'), lab('d', 'Drainage-grade granular layer', new V3(-W / 2 + 6, GSB / 2, D / 2), null, 'hot', 'l'), lab('s', 'Subgrade', new V3(-W / 2 + 6, -SUB / 2, D / 2), null, '', 'l'), lab('o', 'Edge outlet', new V3(W / 2 + 3, 2.6, 0), st => st.outlet !== false, 'hot'), lab('x', 'No outlet: the water collects', new V3(W / 2 - 6, 3.4, D / 2), st => st.outlet === false, 'warn', 'l')];
    let level = 0; out.seek = v => { T = v; level = 1e9; };
    out.update = (t, dt, st) => {
      if (go(st)) T += dt; const open = st.outlet !== false;
      const want = open ? 0 : 1; if (level > 1e8) level = want; level += (want - level) * (reduceM() ? 1 : 1 - Math.exp(-dt * .6)); pool.scale.y = .01 + level * GSB * .8; pool.position.y = .3 + (GSB * .8 * level) / 2; pool.visible = level > .02;
      dr.forEach((d, i) => {
        const u = (T * (.16 + d.k * .08) + d.ph) % 1; let x, y;
        if (u < .3) { const k = u / .3; x = -10 + d.x * (1 - k) * 2; y = GSB + BASE - k * (BASE + .5); }
        else { const k = (u - .3) / .7; const kk = open ? k : Math.min(k, .55 + level * 0); x = -10 + d.x + kk * (W / 2 + 10 - d.x); y = GSB - .6 - (d.k) * 2.2 - (open ? 0 : kk * 0) + Math.sin(k * 9 + i) * .15; if (open && k > .93) y = 1.2; }
        o.position.set(x, y, d.z); o.scale.setScalar(1); o.rotation.set(0, 0, 0); o.updateMatrix(); drops.setMatrixAt(i, o.matrix);
      }); drops.instanceMatrix.needsUpdate = true;
      return go(st) || level > .01 && level < .99;
    };
    return out;
  }

  if (set === 'filter') {
    const mkSide = (x0, compatible) => {
      const g = new THREE.Group(); g.position.x = x0; scene.add(g);
      const W = 22, D = 12, SUB = 6, GSB = 8;
      const sub = mk(new THREE.BoxGeometry(W, SUB, D), new THREE.MeshStandardMaterial({ color: 0x9a6b45, roughness: 1 })); sub.position.y = -SUB / 2; g.add(sub);
      const items = [], r = rng(compatible ? 5 : 6); for (let i = 0; i < 160; i++) { const rr = .5 + r() * 1.1; items.push([(r() - .5) * (W - 2), .8 + r() * (GSB - 1.6), (r() - .5) * (D - 2), rr]); }
      const base = mk(new THREE.BoxGeometry(W, GSB, D), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .1, transparent: true, opacity: .1, depthWrite: false }), { cast: false }); base.position.y = GSB / 2; g.add(base);
      instStones(g, items, stoneM, compatible ? 21 : 22, false);
      const sheet = mk(new THREE.BoxGeometry(W + .4, .22, D + .4), new THREE.MeshStandardMaterial({ color: compatible ? 0x3f9d6a : 0xd9c9a8, roughness: .8, transparent: true, opacity: compatible ? .9 : .25 }), { cast: false }); sheet.position.y = .12; g.add(sheet);
      const FN = 110, fm = new THREE.InstancedMesh(new THREE.SphereGeometry(.3, 8, 6), fineM, FN); fm.frustumCulled = false; g.add(fm);
      const WN = 50, wm = new THREE.InstancedMesh(new THREE.SphereGeometry(.26, 8, 6), dropM, WN); wm.frustumCulled = false; g.add(wm);
      const rf = rng(30 + x0), fines = Array.from({ length: FN }, () => ({ x: (rf() - .5) * (W - 2), z: (rf() - .5) * (D - 2), h: .6 + rf() * (GSB - 1.2), p: rf(), y0: -rf() * SUB * .8 }));
      const wat = Array.from({ length: WN }, () => ({ x: (rf() - .5) * (W - 2), z: (rf() - .5) * (D - 2), ph: rf() }));
      return { g, fm, wm, fines, wat, W, SUB, GSB, compatible };
    };
    const A = mkSide(-17, true), B = mkSide(17, false);
    out.views = { all: { az: -10, el: 16, dist: 74, t: [0, 3, 0] } }; out.limits = { az: [-45, 40], el: [4, 45], dist: [30, 110] };
    out.labels = [lab('a', 'Compatible: fines retained, water moves', new V3(-17, 10.6, 0), null, 'hot'), lab('b', 'Incompatible: fines migrate, voids restrict', new V3(17, 10.6, 0), null, 'warn'), lab('f', 'Filter layer', new V3(-28, .3, 6), null, '', 'l'), lab('s', 'Soil', new V3(-28, -3, 6), null, '', 'l'), lab('g', 'Granular layer', new V3(-28, 4, 6), null, '', 'l')];
    out.seek = v => { T = v; };
    out.update = (t, dt, st) => {
      if (go(st)) T += dt; const cyc = (T * .09) % 1;
      [A, B].forEach(S => {
        S.fines.forEach((f, i) => { let y = f.y0, x = f.x, z = f.z; if (S.compatible) y = Math.min(f.y0 + cyc * 1.5, -.3); else { const k = clamp(cyc * 1.3 - f.p * .3); y = f.y0 + k * (f.h - f.y0 + .4); } o.position.set(x, y, z); o.scale.setScalar(S.compatible ? 1 : 1 + clamp(cyc * 1.3) * .5); o.rotation.set(0, 0, 0); o.updateMatrix(); S.fm.setMatrixAt(i, o.matrix); });
        S.wat.forEach((w, i) => { const u = (T * .25 + w.ph) % 1, y = -S.SUB * .6 + u * (S.GSB + S.SUB * .6); o.position.set(w.x, y, w.z); o.scale.setScalar(S.compatible || u < .7 ? 1 : .6); o.rotation.set(0, 0, 0); o.updateMatrix(); S.wm.setMatrixAt(i, o.matrix); });
        S.fm.instanceMatrix.needsUpdate = S.wm.instanceMatrix.needsUpdate = true;
      }); return go(st);
    };
    return out;
  }

  /* load */
  const W = 50, D = 20, layers = [['sub', 'SUBGRADE', 8, null, 0x9a6b45], ['gsb', 'GSB', 6, 'gsb', 0x7d7a73], ['base', 'BASE COURSE', 5, 'wmm', 0x2d2e31], ['surf', 'SURFACE', 3, 'bc', 0x1c1d20]];
  let y = 0; const lm = {};
  layers.forEach(([id, t, h, k, c]) => { const m = k ? layerBlock(W, h, D, k, 40 + h, c) : (() => { const s = soilMat(4); s.map.repeat.set(4, 1); const b = new THREE.Mesh(new THREE.BoxGeometry(W, h, D), s); b.castShadow = b.receiveShadow = true; return b; })(); m.position.y = y + h / 2; y += h; scene.add(m); lm[id] = m; });
  const TOP = y; const wheel = mk(new THREE.CylinderGeometry(3, 3, 5, 36), M.rubber); wheel.rotation.x = Math.PI / 2; wheel.position.set(-6, TOP + 3, 0); scene.add(wheel);
  const rim = mk(new THREE.CylinderGeometry(1.6, 1.6, 5.2, 24), M.steelS); rim.rotation.x = Math.PI / 2; rim.position.copy(wheel.position); scene.add(rim);
  const axle = mk(new THREE.BoxGeometry(2, 7, 2), M.dark); axle.position.set(-6, TOP + 8, 0); scene.add(axle);
  const gtex = canvasTex(4, 128, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,94,41,.75)'); gr.addColorStop(1, 'rgba(255,94,41,.04)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); }, true);
  const cs = new THREE.Shape(); cs.moveTo(-2.4, TOP); cs.lineTo(2.4, TOP); cs.lineTo(11, 0); cs.lineTo(-11, 0); cs.closePath(); const cg = new THREE.ShapeGeometry(cs); { const p = cg.attributes.position, uv = cg.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, 0, p.getY(i) / TOP); } const cone = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ map: gtex, transparent: true, depthWrite: false, side: THREE.DoubleSide })); cone.position.set(-6, 0, D / 2 + .15); scene.add(cone);
  out.views = { all: { az: -16, el: 14, dist: 82, t: [0, 11, 0] } }; out.limits = { az: [-50, 40], el: [4, 45], dist: [30, 120] };
  out.labels = [lab('w', 'Tyre contact area', new V3(-6, TOP + 6, 0), null, ''), lab('s', 'Surface', new V3(-W / 2 + 3, 20.5, D / 2), null, '', 'l'), lab('b', 'Base course', new V3(-W / 2 + 3, 16.5, D / 2), null, '', 'l'), lab('g', 'GSB', new V3(-W / 2 + 3, 11, D / 2), null, 'hot', 'l'), lab('u', 'Subgrade', new V3(-W / 2 + 3, 4, D / 2), null, '', 'l'), lab('c', 'Stress spreading', new V3(-6, 12, D / 2), st => st.stress !== false, 'warn', 'r')];
  out.seek = v => { T = v; };
  out.update = (t, dt, st) => { if (go(st)) T += dt; const p = .5 + .5 * Math.sin(T * 2); cone.visible = st.stress !== false; cone.material.opacity = .55 + .35 * p; wheel.rotation.y = T * 2; wheel.position.y = TOP + 3 - .12 * p; return go(st); };
  return out;
}
