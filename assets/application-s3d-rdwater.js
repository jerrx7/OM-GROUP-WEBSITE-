/* scene: water, filters and load in a pavement section (GSB page). Three sets, one module.
   drain  : a cut section: laterite subgrade, a granular drainage layer, a base course with a crack at the surface. Water enters, moves through the voids and leaves through an edge outlet.
            Switch the outlet off and the same water collects: a permeable layer needs a working outlet.
   filter : two interfaces side by side. A compatible arrangement (a green geotextile filter) retains the soil particles; an incompatible one lets fines migrate into the voids between real photo-textured stones.
   load   : a wheel on the surface and a stress field spreading through surface, base, GSB and subgrade.
   The layers wear painted, seamless cut-face textures. Drawings: no permeability, flow rate, filter criterion, stress value or finite-element result is shown, and none is implied. Not a filter or drainage
   design. Numbered markers, key beside the figure. */
import { THREE, studio, rng } from '/assets/application-s3d.js';
import { realStones, realStoneMaterial } from '/assets/s3dstone/real-stone.js';
import { aggBlock, cvs, tex, reduceM } from '/assets/application-s3d-rdkit.js';
const V3 = THREE.Vector3, TAU = Math.PI * 2, clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), lerp = (a, b, t) => a + (b - a) * t;

export default function build({ state }) {
  const set = state.set || 'drain', narrow = matchMedia('(max-width:640px)').matches;
  const scene = new THREE.Scene(), { key } = studio(scene, { ext: 56, key: 2.5, shadow: .22, map: 4096, ground: false });
  key.shadow.bias = -.0002; key.shadow.normalBias = .05; key.shadow.camera.near = 30; key.shadow.camera.far = 320; key.shadow.camera.updateProjectionMatrix();
  const out = { scene, fov: 30, wide: true };
  const lab = (id, text, a, show, tone, side = 'r') => ({ id, text, side, tone, anchor: a, show: show || (() => true) });
  const bc = cvs(512, 512), bg = bc.getContext('2d'), rr0 = rng(5); bg.fillStyle = '#d4d1ca'; bg.fillRect(0, 0, 512, 512); for (let i = 0; i < 14000; i++) { const v = 188 + rr0() * 50 | 0; bg.fillStyle = 'rgba(' + v + ',' + v + ',' + (v - 5) + ',.55)'; bg.fillRect(rr0() * 512, rr0() * 512, 1.2 + rr0() * 1.4, 1.2 + rr0() * 1.4); }
  const bt = tex(bc); bt.repeat.set(30, 18); const benchY = set === 'filter' ? -6.5 : set === 'drain' ? -5.5 : -8.5;
  const bench = new THREE.Mesh(new THREE.BoxGeometry(300, 2, 160), new THREE.MeshStandardMaterial({ map: bt, roughness: .55, metalness: 0, envMapIntensity: .75 })); bench.position.set(0, benchY - 1, 0); bench.receiveShadow = true; scene.add(bench);
  const RS = realStones('quarry'), stoneM = realStoneMaterial({ tint: .6, bump: .03, floor: 0, gain: .85, contrast: .7, scale: .6, soft: 1, grain: .3, own: true });
  const dropM = new THREE.MeshPhysicalMaterial({ color: 0x6fc0e6, roughness: .05, transparent: true, opacity: .75, clearcoat: 1, envMapIntensity: 1.8 }), fineM = new THREE.MeshStandardMaterial({ color: 0xb08a5e, roughness: 1 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xc4c8ce, metalness: .95, roughness: .28, envMapIntensity: 1.2 }), dark = new THREE.MeshStandardMaterial({ color: 0x1d1e21, metalness: .5, roughness: .5 });
  const part = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; return m; };
  const o = new THREE.Object3D(); let T = 0; const go = st => st.play !== false && !reduceM(); out.seek = v => { T = v; };
  const stonesIn = (parent, items, seed) => { const r = rng(seed), per = RS.map(() => []); items.forEach(it => per[(r() * RS.length) | 0].push(it)); per.forEach((arr, gi) => { if (!arr.length) return; const im = new THREE.InstancedMesh(RS[gi], stoneM, arr.length); arr.forEach((it, i) => { o.position.set(it[0], it[1], it[2]); o.scale.setScalar(it[3]); o.rotation.set(r() * 6, r() * 6, r() * 6); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }); im.castShadow = im.receiveShadow = true; im.frustumCulled = false; parent.add(im); }); };

  if (set === 'drain') {
    const W = 56, D = 16, SUB = 5, GSB = 6, BASE = 4;
    const sub = aggBlock('soil', W, SUB, D, 3); sub.position.y = -SUB / 2; scene.add(sub);
    const gsb = aggBlock('gsb', W, GSB, D, 7); gsb.position.y = GSB / 2; scene.add(gsb);
    const base = aggBlock('wmm', W, BASE, D, 11); base.position.y = GSB + BASE / 2; scene.add(base);
    const crack = new THREE.Mesh(new THREE.BoxGeometry(.5, BASE, D - 1), new THREE.MeshBasicMaterial({ color: 0x0d0d0f })); crack.position.set(-10, GSB + BASE / 2 + .01, 0); scene.add(crack);
    const pipe = part(new THREE.CylinderGeometry(1.1, 1.1, 5, 28), new THREE.MeshStandardMaterial({ color: 0x4f7fa6, metalness: .5, roughness: .35, envMapIntensity: 1 })); pipe.rotation.z = Math.PI / 2; pipe.position.set(W / 2 + 2.4, 1.2, 0); scene.add(pipe);
    const drain = part(new THREE.BoxGeometry(7, 1.2, D), new THREE.MeshStandardMaterial({ color: 0xcfd6dc, roughness: .8 })); drain.position.set(W / 2 + 7.5, -.6, 0); scene.add(drain);
    const pool = new THREE.Mesh(new THREE.BoxGeometry(W - .4, 1, .12), new THREE.MeshPhysicalMaterial({ color: 0x6fc0e6, roughness: .08, transparent: true, opacity: .45, depthWrite: false })); pool.position.set(0, .7, D / 2 + .1); pool.scale.y = .01; scene.add(pool);
    const N = 90, drops = new THREE.InstancedMesh(new THREE.SphereGeometry(.34, 12, 8), dropM, N); drops.frustumCulled = false; drops.renderOrder = 6; scene.add(drops);
    const r = rng(12), dr = Array.from({ length: N }, () => ({ z: D / 2 + .25 + r() * .15, ph: r(), x: (r() - .5) * 2, k: r() }));
    out.views = { all: { az: -14, el: 13, dist: narrow ? 160 : 118, t: [6, 2, 0] } }; out.limits = { az: [-50, 40], el: [4, 45], dist: [40, 190] };
    out.labels = [lab('c', 'Water enters at a crack', new V3(-10, GSB + BASE + .5, D / 2)), lab('b', 'Base course', new V3(-W / 2 + 6, GSB + BASE / 2, D / 2), null, '', 'l'), lab('d', 'Drainage-grade granular layer', new V3(-W / 2 + 6, GSB / 2, D / 2), null, 'hot', 'l'), lab('s', 'Subgrade', new V3(-W / 2 + 6, -SUB / 2, D / 2), null, '', 'l'), lab('o', 'Edge outlet', new V3(W / 2 + 2.4, 2.6, D / 2), st => st.outlet !== false, 'hot')];
    let level = -1;
    out.update = (t, dt, st) => {
      if (go(st)) T += dt; const open = st.outlet !== false, want = open ? 0 : 1; if (level < 0) level = want; level += (want - level) * (reduceM() ? 1 : 1 - Math.exp(-dt * .6)); pool.scale.y = .01 + level * GSB * .8; pool.position.y = .3 + (GSB * .8 * level) / 2; pool.visible = level > .02;
      dr.forEach((d, i) => {
        const u = (T * (.16 + d.k * .08) + d.ph) % 1; let x, y;
        if (u < .3) { const k = u / .3; x = -10 + d.x * (1 - k) * 2; y = GSB + BASE - k * (BASE + .5); }
        else { const k = (u - .3) / .7, kk = open ? k : Math.min(k, .55); x = -10 + d.x + kk * (W / 2 + 10 - d.x); y = GSB - .6 - d.k * 2.2 + Math.sin(k * 9 + i) * .15; if (open && k > .93) y = 1.2; }
        o.position.set(x, y, d.z); o.scale.setScalar(1); o.rotation.set(0, 0, 0); o.updateMatrix(); drops.setMatrixAt(i, o.matrix);
      }); drops.instanceMatrix.needsUpdate = true; return go(st) || (level > .01 && level < .99);
    };
    return out;
  }

  if (set === 'filter') {
    const mkSide = (x0, compatible) => {
      const g = new THREE.Group(); g.position.x = x0; scene.add(g);
      const W = 22, D = 12, SUB = 6, GSB = 8;
      const sub = aggBlock('soil', W, SUB, D, compatible ? 4 : 5); sub.position.y = -SUB / 2; g.add(sub);
      const items = [], r = rng(compatible ? 5 : 6); for (let i = 0; i < 170; i++) { const rr = .55 + r() * 1.0; items.push([(r() - .5) * (W - 2), .8 + r() * (GSB - 1.6), (r() - .5) * (D - 2), rr]); }
      const base = new THREE.Mesh(new THREE.BoxGeometry(W, GSB, D), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .1, transparent: true, opacity: .1, depthWrite: false })); base.position.y = GSB / 2; base.renderOrder = 5; g.add(base);
      stonesIn(g, items, compatible ? 21 : 22);
      const sheet = new THREE.Mesh(new THREE.BoxGeometry(W + .4, .22, D + .4), new THREE.MeshStandardMaterial({ color: compatible ? 0x3f9d6a : 0xd9c9a8, roughness: .8, transparent: true, opacity: compatible ? .9 : .25 })); sheet.position.y = .12; g.add(sheet);
      const FN = 110, fm = new THREE.InstancedMesh(new THREE.SphereGeometry(.3, 10, 8), fineM, FN); fm.frustumCulled = false; g.add(fm);
      const WN = 50, wm = new THREE.InstancedMesh(new THREE.SphereGeometry(.26, 10, 8), dropM, WN); wm.frustumCulled = false; wm.renderOrder = 6; g.add(wm);
      const rf = rng(30 + x0), fines = Array.from({ length: FN }, () => ({ x: (rf() - .5) * (W - 2), z: (rf() - .5) * (D - 2), h: .6 + rf() * (GSB - 1.2), p: rf(), y0: -rf() * SUB * .8 })), wat = Array.from({ length: WN }, () => ({ x: (rf() - .5) * (W - 2), z: (rf() - .5) * (D - 2), ph: rf() }));
      return { g, fm, wm, fines, wat, W, SUB, GSB, compatible };
    };
    const A = mkSide(-17, true), B = mkSide(17, false);
    out.views = { all: { az: -10, el: 16, dist: narrow ? 100 : 74, t: [0, 3, 0] } }; out.limits = { az: [-45, 40], el: [4, 45], dist: [30, 130] };
    out.labels = [lab('a', 'Compatible: fines retained, water moves', new V3(-17, 10.6, 0), null, 'hot'), lab('b', 'Incompatible: fines migrate, voids restrict', new V3(17, 10.6, 0), null, 'warn'), lab('f', 'Filter layer', new V3(-28, .3, 6), null, '', 'l'), lab('s', 'Soil', new V3(-28, -3, 6), null, '', 'l'), lab('g', 'Granular layer', new V3(-28, 4, 6), null, '', 'l')];
    out.update = (t, dt, st) => {
      if (go(st)) T += dt; const cyc = (T * .09) % 1;
      [A, B].forEach(S => {
        S.fines.forEach((f, i) => { let y = f.y0; if (S.compatible) y = Math.min(f.y0 + cyc * 1.5, -.3); else { const k = clamp(cyc * 1.3 - f.p * .3); y = f.y0 + k * (f.h - f.y0 + .4); } o.position.set(f.x, y, f.z); o.scale.setScalar(S.compatible ? 1 : 1 + clamp(cyc * 1.3) * .5); o.rotation.set(0, 0, 0); o.updateMatrix(); S.fm.setMatrixAt(i, o.matrix); });
        S.wat.forEach((w, i) => { const u = (T * .25 + w.ph) % 1, y = -S.SUB * .6 + u * (S.GSB + S.SUB * .6); o.position.set(w.x, y, w.z); o.scale.setScalar(S.compatible || u < .7 ? 1 : .6); o.rotation.set(0, 0, 0); o.updateMatrix(); S.wm.setMatrixAt(i, o.matrix); });
        S.fm.instanceMatrix.needsUpdate = S.wm.instanceMatrix.needsUpdate = true;
      }); return go(st);
    };
    return out;
  }

  /* load */
  const W = 50, D = 20, layers = [['sub', 8, 'soil'], ['gsb', 6, 'gsb'], ['base', 5, 'wmm'], ['surf', 3, 'bc']];
  let y = 0; layers.forEach(([id, h, k], i) => { const m = aggBlock(k, W, h, D, 40 + h + i); m.position.y = y + h / 2; y += h; scene.add(m); });
  const TOP = y, wheel = new THREE.Group(); wheel.position.set(-6, TOP + 3, 0); scene.add(wheel);
  const tyre = part(new THREE.CylinderGeometry(3, 3, 5, 48), new THREE.MeshStandardMaterial({ color: 0x141416, roughness: .85 })); tyre.rotation.x = Math.PI / 2; wheel.add(tyre);
  const rim = part(new THREE.CylinderGeometry(1.7, 1.7, 5.2, 32), steel); rim.rotation.x = Math.PI / 2; wheel.add(rim); const hub = part(new THREE.CylinderGeometry(.7, .7, 5.5, 20), dark); hub.rotation.x = Math.PI / 2; wheel.add(hub);
  const axle = part(new THREE.BoxGeometry(2, 7, 2), dark); axle.position.set(-6, TOP + 8, 0); scene.add(axle);
  const gc = cvs(4, 128), gq = gc.getContext('2d'), gr = gq.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,94,41,.75)'); gr.addColorStop(1, 'rgba(255,94,41,.04)'); gq.fillStyle = gr; gq.fillRect(0, 0, 4, 128);
  const cs = new THREE.Shape(); cs.moveTo(-2.4, TOP); cs.lineTo(2.4, TOP); cs.lineTo(11, 0); cs.lineTo(-11, 0); cs.closePath(); const cg = new THREE.ShapeGeometry(cs); { const p = cg.attributes.position, uv = cg.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, 0, p.getY(i) / TOP); }
  const cone = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ map: tex(gc), transparent: true, depthWrite: false, side: THREE.DoubleSide })); cone.position.set(-6, 0, D / 2 + .15); cone.renderOrder = 4; scene.add(cone);
  out.views = { all: { az: -16, el: 14, dist: narrow ? 110 : 82, t: [0, 11, 0] } }; out.limits = { az: [-50, 40], el: [4, 45], dist: [30, 130] };
  out.labels = [lab('w', 'Tyre contact area', new V3(-6, TOP + 6, 0)), lab('s', 'Surface', new V3(-W / 2 + 3, 20.5, D / 2), null, '', 'l'), lab('b', 'Base course', new V3(-W / 2 + 3, 16.5, D / 2), null, '', 'l'), lab('g', 'GSB', new V3(-W / 2 + 3, 11, D / 2), null, 'hot', 'l'), lab('u', 'Subgrade', new V3(-W / 2 + 3, 4, D / 2), null, '', 'l'), lab('c', 'Stress spreading', new V3(-6, 12, D / 2), st => st.stress !== false, 'warn')];
  out.update = (t, dt, st) => { if (go(st)) T += dt; const p = .5 + .5 * Math.sin(T * 2); cone.visible = st.stress !== false; cone.material.opacity = .55 + .35 * p; wheel.rotation.z = -T * 2; wheel.position.y = TOP + 3 - .12 * p; return go(st); };
  return out;
}
