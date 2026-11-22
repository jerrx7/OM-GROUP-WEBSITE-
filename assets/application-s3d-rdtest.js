/* scene: the laboratory tests behind WMM and GSB aggregate quality. Six sets, one module.
   shape  : four photo-textured stones (cubical, flaky, elongated, irregular) on pin stands with length / width / thickness bars.
   la     : a Los Angeles abrasion machine: a turning steel drum with a shelf, on a frame with a motor, tumbling a charge of steel balls and aggregate.
   impact : an aggregate impact test: a hammer falls on a sample of stones in a steel cup between guide columns.
   pi     : fine material through a 425 micron brass sieve into a pan, then a thread rolled out on a glass plate for the plasticity test.
   cbr    : a California Bearing Ratio frame: a compacted specimen in its steel mould, a plunger driven into it, a proving ring and a dial. The soak state puts the mould in water with surcharge discs.
   abs    : a water-absorption set: a wire basket of aggregate hung in a glass water tank beside a balance.
   No result, load, certificate, limit or OM GROUP test is shown; particle shapes are the shapes of real stones, not scans of a sample. Numbered markers, key beside the figure. */
import { THREE, studio, rng } from '/assets/application-s3d.js';
import { realStones, realStoneMaterial } from '/assets/s3dstone/real-stone.js';
import { buildHeap, plant, crushed, grainMat } from '/assets/application-s3d-msand.js';
import { bakedTex, scaleUV, cvs, tex, reduceM } from '/assets/application-s3d-rdkit.js';
const V3 = THREE.Vector3, TAU = Math.PI * 2, clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), sm = v => { v = clamp(v); return v * v * (3 - 2 * v); }, lerp = (a, b, t) => a + (b - a) * t;

export default function build({ state }) {
  const set = state.set || 'shape', narrow = matchMedia('(max-width:640px)').matches;
  const scene = new THREE.Scene(), { key } = studio(scene, { ext: 16, key: 2.5, shadow: .22, map: 4096, ground: false });
  key.shadow.bias = -.0001; key.shadow.normalBias = .03;
  const out = { scene, fov: 28, wide: true };
  const lab = (id, text, a, show, tone, side = 'r') => ({ id, text, side, tone, anchor: a, show: show || (() => true) });
  const bt = (() => { const b = cvs(512, 512), g = b.getContext('2d'), rr = rng(5); g.fillStyle = '#d4d1ca'; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 14000; i++) { const v = 188 + rr() * 50 | 0; g.fillStyle = 'rgba(' + v + ',' + v + ',' + (v - 5) + ',.55)'; g.fillRect(rr() * 512, rr() * 512, 1.2 + rr() * 1.4, 1.2 + rr() * 1.4); } const t = tex(b); t.repeat.set(16, 10); return t; })();
  const bench = new THREE.Mesh(new THREE.BoxGeometry(90, 1, 60), new THREE.MeshStandardMaterial({ map: bt, roughness: .5, metalness: 0, envMapIntensity: .8 })); bench.position.set(0, -.5, 0); bench.receiveShadow = true; scene.add(bench);
  const steel = new THREE.MeshStandardMaterial({ color: 0xc9cdd3, metalness: .95, roughness: .26, envMapIntensity: 1.25 }), chrome = new THREE.MeshStandardMaterial({ color: 0xe4e7ec, metalness: 1, roughness: .1, envMapIntensity: 1.4 }), dark = new THREE.MeshStandardMaterial({ color: 0x1d1e21, metalness: .5, roughness: .5, envMapIntensity: .8 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xff5e29, roughness: .4, envMapIntensity: .7 }), brass = new THREE.MeshStandardMaterial({ color: 0xc8a96c, metalness: .85, roughness: .3, envMapIntensity: 1.2 }), enamel = new THREE.MeshPhysicalMaterial({ color: 0xf1efea, roughness: .24, clearcoat: .6, clearcoatRoughness: .2, envMapIntensity: .9 });
  const glass = () => new THREE.MeshPhysicalMaterial({ color: 0xeaf3f1, roughness: .04, transparent: true, opacity: .12, depthWrite: false, side: THREE.DoubleSide, clearcoat: 1, envMapIntensity: 1.8 });
  const water = () => new THREE.MeshPhysicalMaterial({ color: 0x5aa5c6, roughness: .04, transparent: true, opacity: .36, depthWrite: false, clearcoat: .6, envMapIntensity: 1.6 });
  const RS = realStones('quarry'), stoneM = realStoneMaterial({ tint: .4, bump: .03, floor: 0, gain: .82, contrast: .74, scale: .6, soft: 1, grain: .3, own: true });
  const mesh = (geo, mat, o = {}) => { const m = new THREE.Mesh(geo, mat); m.castShadow = o.cast !== false; m.receiveShadow = true; return m; };
  const cyl = (rt, rb, h, mat, seg = 40) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  let T = 0; out.seek = v => { T = v; }; const go = st => st.play !== false && !reduceM();

  if (set === 'shape') {
    const SH = [['cub', 'Cubical', [1, .95, 1]], ['fla', 'Flaky', [1.7, .3, 1.5]], ['elo', 'Elongated', [2.5, .68, .68]], ['irr', 'Irregular', [1.2, .8, 1]]], X = [-9, -3, 3, 9], parts = [];
    SH.forEach(([k, name, sc], i) => {
      const g = new THREE.Group(); g.position.set(X[i], 0, 0); scene.add(g); const d = mesh(new THREE.LatheGeometry([[0, 0], [2.3, 0], [2.4, .12], [2.4, .3], [2.0, .4], [0, .4]].map(p => new THREE.Vector2(p[0], p[1])), 56), enamel); g.add(d);
      const pin = cyl(.16, .2, 1.7, steel, 16); pin.position.y = 1.2; g.add(pin);
      const pivot = new THREE.Group(); pivot.position.y = 2.0 + sc[1] * .9; g.add(pivot);
      const s = mesh(RS[i % RS.length], stoneM); const SC = 1.05; s.scale.set(sc[0] * SC, sc[1] * SC, sc[2] * SC); pivot.add(s);
      pivot.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(s), c = bb.getCenter(new V3()), hs = bb.getSize(new V3()).multiplyScalar(.5); c.sub(pivot.getWorldPosition(new V3()));
      const mkb = (len, axis, col, off) => { const b2 = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, len, 8), new THREE.MeshBasicMaterial({ color: col })); if (axis === 'x') b2.rotation.z = Math.PI / 2; if (axis === 'z') b2.rotation.x = Math.PI / 2; b2.position.set(...off); pivot.add(b2); return b2; };
      mkb(hs.x * 2, 'x', 0xff5e29, [c.x, c.y - hs.y - .3, c.z + hs.z + .3]); mkb(hs.z * 2, 'z', 0x2c86c9, [c.x + hs.x + .3, c.y - hs.y - .3, c.z]); mkb(hs.y * 2, 'y', 0x4a7a1a, [c.x + hs.x + .3, c.y, c.z + hs.z + .3]);
      parts.push({ g, pivot, k });
    });
    out.views = { all: { az: -8, el: 14, dist: narrow ? 44 : 30, t: [0, 2.8, 0] }, cub: { az: -8, el: 14, dist: 14, t: [X[0], 3, 0] }, fla: { az: -8, el: 14, dist: 14, t: [X[1], 3, 0] }, elo: { az: -8, el: 14, dist: 14, t: [X[2], 3, 0] }, irr: { az: -8, el: 14, dist: 14, t: [X[3], 3, 0] } };
    out.limits = { az: [-50, 50], el: [4, 50], dist: [10, 56] };
    out.labels = SH.map(([k, name], i) => lab(k, name, new V3(X[i], 5.6 + (i % 2) * 1.8, 0), st => !st.view || st.view === 'all' || st.view === k)).concat([lab('l', 'Length', new V3(X[2], .4, 1.6), st => st.view === 'elo' || st.view === 'fla'), lab('t', 'Thickness', new V3(X[1] + 1.6, 2, 1.6), st => st.view === 'fla')]);
    out.update = (t, dt, st) => { if (go(st)) T += dt; parts.forEach((p, i) => { p.pivot.rotation.y = T * .5 + i; }); return go(st); };
    return out;
  }

  if (set === 'la') {
    const Rr = 5, Ld = 7, DY = 6.6, g = new THREE.Group(); scene.add(g);
    const drum = new THREE.Group(); drum.position.y = DY; g.add(drum);
    const wall = mesh(new THREE.CylinderGeometry(Rr, Rr, Ld, 72, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xcfd3d8, metalness: .75, roughness: .3, transparent: true, opacity: .26, side: THREE.DoubleSide, depthWrite: false, clearcoat: .6, envMapIntensity: 1.5 }), { cast: false }); wall.rotation.x = Math.PI / 2; wall.renderOrder = 6; drum.add(wall);
    [-1, 1].forEach(s => { const ring = mesh(new THREE.TorusGeometry(Rr, .16, 12, 72), steel); ring.position.z = s * (Ld / 2); drum.add(ring); const cap = mesh(new THREE.CylinderGeometry(Rr, Rr, .2, 72), new THREE.MeshPhysicalMaterial({ color: 0xcfd3d8, metalness: .6, roughness: .4, transparent: true, opacity: .1, depthWrite: false })); cap.rotation.x = Math.PI / 2; cap.position.z = s * (Ld / 2); cap.castShadow = false; drum.add(cap); const hub = cyl(.7, .7, .6, chrome, 28); hub.rotation.x = Math.PI / 2; hub.position.z = s * (Ld / 2 + .3); drum.add(hub); });
    const shelf = mesh(new THREE.BoxGeometry(.3, 1.4, Ld - .2), orange); shelf.position.set(Rr - .75, 0, 0); shelf.rotation.z = .1; drum.add(shelf);
    [-1, 1].forEach(s => { const leg = mesh(new THREE.BoxGeometry(.6, DY, .8), dark); leg.position.set(0, DY / 2, -(Ld / 2 + .9)); leg.visible = s < 0; g.add(leg); const brace = mesh(new THREE.BoxGeometry(.4, 5.4, .4), dark); brace.position.set(s * 2.4, 2.6, -(Ld / 2 + .9)); brace.rotation.z = -s * .45; g.add(brace); });
    const base = mesh(new THREE.BoxGeometry(14, .6, 5.5), dark); base.position.y = .3; g.add(base); const motor = cyl(.9, .9, 2.4, dark, 28); motor.rotation.z = Math.PI / 2; motor.position.set(-5.2, 1.5, 0); g.add(motor);
    const belt = mesh(new THREE.BoxGeometry(6, .12, .5), dark); belt.position.set(-2.6, 2.4, Ld / 2 + .9); belt.rotation.z = .2; g.add(belt);
    const r = rng(21), N = 28, balls = 11, objs = [], bobjs = [];
    const sIM = new THREE.InstancedMesh(RS[1], stoneM, N); sIM.frustumCulled = false; sIM.position.y = DY; sIM.castShadow = true; g.add(sIM);
    const bIM = new THREE.InstancedMesh(new THREE.SphereGeometry(.5, 24, 16), chrome, balls); bIM.frustumCulled = false; bIM.position.y = DY; bIM.castShadow = true; g.add(bIM);
    for (let i = 0; i < N; i++) objs.push({ rad: .32 + r() * .3, z: (r() - .5) * (Ld - 1.8), ph: r() });
    for (let i = 0; i < balls; i++) bobjs.push({ z: (r() - .5) * (Ld - 1.6), ph: r() });
    out.views = { all: { az: -16, el: 12, dist: narrow ? 46 : 34, t: [0, 6, 0] } }; out.limits = { az: [-60, 40], el: [3, 40], dist: [16, 60] };
    out.labels = [lab('d', 'Rotating drum', new V3(0, 12, 0), null, 'hot'), lab('s', 'Shelf lifts the charge', new V3(0, DY, Ld / 2 + .5), null, '', 'l'), lab('b', 'Steel charge and aggregate sample', new V3(-1.5, 3.8, 3), null, '', 'l')];
    const o = new THREE.Object3D();
    out.update = (t, dt, st) => {
      if (go(st)) T += dt; const rot = T * .9; drum.rotation.z = -rot;
      const place = (p, scl, im, i, ball) => { const ph = (rot * .17 + p.ph) % 1, rr = Rr - 1.1 - (ball ? .1 : p.rad * .3); let x, y;
        if (ph < .6) { const a = -1.4 - (ph / .6) * 2.3; x = Math.cos(a) * rr; y = Math.sin(a) * rr; }
        else { const k = (ph - .6) / .4, a = -3.7, xe = Math.cos(a) * rr, ye = Math.sin(a) * rr, x1 = rr * .45, y1 = -rr + .55; x = lerp(xe, x1, k); y = lerp(ye, y1, k) + 4 * 2.4 * k * (1 - k); }
        o.position.set(x, y, p.z); o.scale.setScalar(scl); o.rotation.set(ph * 7, ph * 5, 0); o.updateMatrix(); im.setMatrixAt(i, o.matrix); };
      objs.forEach((p, i) => place(p, p.rad * 1.2, sIM, i)); bobjs.forEach((p, i) => place(p, 1, bIM, i, true)); sIM.instanceMatrix.needsUpdate = bIM.instanceMatrix.needsUpdate = true;
      return go(st);
    };
    return out;
  }

  if (set === 'impact') {
    const g = new THREE.Group(); scene.add(g);
    const base = mesh(new THREE.LatheGeometry([[0, 0], [4.6, 0], [4.8, .2], [4.5, 1.1], [0, 1.2]].map(p => new THREE.Vector2(p[0], p[1])), 56), dark); g.add(base);
    const cup = mesh(new THREE.LatheGeometry([[0, 1.25], [1.55, 1.25], [1.6, 1.4], [1.7, 2.7], [1.82, 2.74], [1.82, 2.6], [1.62, 2.55]].map(p => new THREE.Vector2(p[0], p[1])), 48), steel); g.add(cup);
    const o = new THREE.Object3D(), r = rng(7), sIM = new THREE.InstancedMesh(RS[1], stoneM, 16); sIM.frustumCulled = false; sIM.castShadow = true; g.add(sIM);
    for (let i = 0; i < 16; i++) { const a = r() * TAU, rr = Math.sqrt(r()) * 1.05, ly = 1.7 + r() * .75; o.position.set(Math.cos(a) * rr, ly, Math.sin(a) * rr); o.scale.setScalar(.34 + r() * .1); o.rotation.set(r() * 6, r() * 6, r() * 6); o.updateMatrix(); sIM.setMatrixAt(i, o.matrix); }
    [-1, 1].forEach(s => { const gd = cyl(.16, .16, 13.4, chrome, 14); gd.position.set(s * 1.5, 7.9, 0); g.add(gd); const fx = cyl(.4, .4, .3, steel, 20); fx.position.set(s * 1.5, 1.35, 0); g.add(fx); });
    const top = mesh(new THREE.BoxGeometry(4.2, .6, 1.1), dark); top.position.y = 14.8; g.add(top);
    const ham = new THREE.Group(); g.add(ham); ham.add(cyl(1.0, 1.0, 1.8, steel, 36)); const tipc = cyl(.92, .82, .4, chrome, 36); tipc.position.y = -1.0; ham.add(tipc); const knob = mesh(new THREE.BoxGeometry(3.2, .5, .9), orange); knob.position.y = .95; ham.add(knob);
    out.views = { all: { az: -16, el: 12, dist: narrow ? 50 : 40, t: [0, 7.2, 0] } }; out.limits = { az: [-60, 40], el: [3, 40], dist: [16, 64] };
    out.labels = [lab('h', 'Falling hammer', () => new V3(0, ham.position.y + 1.2, 0), null, 'hot'), lab('c', 'Steel cup with the aggregate sample', new V3(0, 2.9, 0), null, '', 'l'), lab('g', 'Guide columns', new V3(1.5, 10, 0))];
    out.update = (t, dt, st) => { if (go(st)) T += dt; const u = (T * .45) % 1, fall = u < .45 ? 1 - (u / .45) ** 2 : u < .55 ? 0 : sm((u - .55) / .45); ham.position.y = 3.8 + fall * 9.5; return go(st); };
    return out;
  }

  if (set === 'pi') {
    const g = new THREE.Group(); scene.add(g);
    const pan = mesh(new THREE.LatheGeometry([[0, 0], [3.0, 0], [3.5, .2], [3.9, 1.3], [4.0, 1.4], [3.8, 1.3], [3.35, .35], [0, .3]].map(p => new THREE.Vector2(p[0], p[1])), 72), steel); pan.position.set(-5.2, 0, 0); g.add(pan);
    const sv = mesh(new THREE.LatheGeometry([[3.5, 1.35], [3.55, 2.7], [3.7, 2.76], [3.7, 2.55], [3.45, 2.5], [3.4, 1.4]].map(p => new THREE.Vector2(p[0], p[1])), 72), brass); sv.position.set(-5.2, .3, 0); g.add(sv);
    const wv = cvs(256, 256), wg = wv.getContext('2d'); wg.fillStyle = '#7e7b72'; wg.fillRect(0, 0, 256, 256); for (let i = 0; i < 256; i += 4) { wg.fillStyle = 'rgba(214,210,200,.9)'; wg.fillRect(i, 0, 1.6, 256); wg.fillRect(0, i, 256, 1.6); wg.fillStyle = 'rgba(40,38,34,.55)'; wg.fillRect(i + 2, 0, 1, 256); wg.fillRect(0, i + 2, 256, 1); }
    const wt = tex(wv); wt.repeat.set(9, 9); const meshM = new THREE.Mesh(new THREE.CircleGeometry(3.38, 64), new THREE.MeshStandardMaterial({ map: wt, metalness: .7, roughness: .4, side: THREE.DoubleSide, envMapIntensity: .9 })); meshM.rotation.x = -Math.PI / 2; meshM.position.set(-5.2, 2.35, 0); g.add(meshM);
    const sc = .17, hp = buildHeap({ R: 15, nC: 0, nM: 500, nF: 4200, nH: 0, seed: 71, maxD: .7, gs: .6, tint: [2.0, 1.65, 1.2], csf: .14 * sc, csm: .35 * sc, dust: .45 }); hp.group.scale.setScalar(sc); hp.group.position.set(-5.2, 2.38, 0); g.add(hp.group);
    const GT = [0, 1, 2].map(i => crushed(500 + i * 11, 'tiny')), gm = grainMat({ bump: .1 }); plant(hp.group, hp.items.mid, GT, gm, 72, true); plant(hp.group, hp.items.fine, GT, gm, 73, false);
    const hp2 = buildHeap({ R: 15, nC: 0, nM: 300, nF: 2500, nH: 0, seed: 81, maxD: .5, gs: .5, tint: [2.2, 1.8, 1.3], csf: .12 * .11, csm: .3 * .11, dust: .55 }); hp2.group.scale.setScalar(.11); hp2.group.position.set(-5.2, .32, 0); hp2.group.visible = false; g.add(hp2.group);
    const plate = mesh(new THREE.BoxGeometry(9, .3, 6), new THREE.MeshPhysicalMaterial({ color: 0xd8e6ee, transparent: true, opacity: .5, roughness: .06, clearcoat: 1, envMapIntensity: 1.6, depthWrite: false })); plate.position.set(6, .15, 0); g.add(plate);
    const clay = new THREE.MeshStandardMaterial({ color: 0x9d8a6c, roughness: .95, bumpMap: tex((() => { const c = cvs(128, 128), q = c.getContext('2d'), rr = rng(3); q.fillStyle = '#808080'; q.fillRect(0, 0, 128, 128); for (let i = 0; i < 900; i++) { const v = 80 + rr() * 100 | 0; q.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; q.fillRect(rr() * 128, rr() * 128, 2, 2); } return c; })(), false), bumpScale: 1.6 });
    const thread = mesh(new THREE.CylinderGeometry(.18, .18, 7, 16), clay); thread.rotation.z = Math.PI / 2; thread.position.set(6, .48, .4); g.add(thread);
    const spat = mesh(new THREE.BoxGeometry(2.8, .1, 1.6), steel); spat.position.set(6, 1.0, .4); g.add(spat); const spatH = cyl(.1, .1, 1.9, new THREE.MeshStandardMaterial({ color: 0xb98a52, roughness: .65 }), 12); spatH.rotation.x = Math.PI / 2; spatH.position.set(6, 1.06, 1.6); g.add(spatH);
    const fall = new THREE.InstancedMesh(GT[0], gm, 90); fall.frustumCulled = false; g.add(fall); const rf = rng(41), fp = Array.from({ length: 90 }, () => ({ x: (rf() - .5) * 5, z: (rf() - .5) * 5, ph: rf(), s: .035 + rf() * .06 }));
    out.views = { all: { az: -12, el: 22, dist: narrow ? 38 : 27, t: [0, 1.5, 0] }, sieve: { az: -14, el: 24, dist: 16, t: [-5, 1.8, 0] }, thread: { az: -10, el: 30, dist: 16, t: [6, .6, 0] } };
    out.limits = { az: [-60, 40], el: [4, 60], dist: [9, 54] };
    out.labels = [lab('s', '425 micron IS sieve', new V3(-5.2, 3.6, 0), st => st.view !== 'thread', 'hot'), lab('f', 'Fines pass through to the pan', new V3(-5.2, 1, 3.8), st => st.view !== 'thread', '', 'l'), lab('t', 'A thread is rolled and re-rolled on a glass plate', new V3(6, 1.5, 0), st => st.view !== 'sieve', 'hot')];
    const o = new THREE.Object3D();
    out.update = (t, dt, st) => {
      if (go(st)) T += dt; const u = (T * .3) % 1; sv.rotation.y = meshM.rotation.z = 0; hp.group.scale.y = sc * (1 - u * .55); hp2.group.visible = true; hp2.group.scale.set(.11 * (.5 + u * .6), .11 * (.4 + u * .8), .11 * (.5 + u * .6));
      spat.position.z = .4 + Math.sin(T * 4) * .4; spatH.position.z = 1.6 + Math.sin(T * 4) * .4; thread.scale.set(1, 1 - Math.min(.3, u * .35), 1);
      fp.forEach((p, i) => { const k = go(st) ? (p.ph + T * .5) % 1 : p.ph, rr = Math.hypot(p.x, p.z), s = rr > 3 ? .0001 : p.s; o.position.set(-5.2 + p.x * .6, 2.3 - k * 1.8, p.z * .6); o.scale.setScalar(k > .9 ? s * (1 - k) * 10 : s); o.rotation.set(k * 6, k * 4, 0); o.updateMatrix(); fall.setMatrixAt(i, o.matrix); }); fall.instanceMatrix.needsUpdate = true;
      return go(st);
    };
    return out;
  }

  if (set === 'cbr') {
    const base = mesh(new THREE.BoxGeometry(15, 1, 10), dark); base.position.y = .5; scene.add(base);
    [-5.5, 5.5].forEach(x => { const c = cyl(.45, .45, 17.5, chrome, 20); c.position.set(x, 9.8, -2.6); scene.add(c); const fx = cyl(.8, .8, .5, steel, 24); fx.position.set(x, 1.25, -2.6); scene.add(fx); });
    const beam = mesh(new THREE.BoxGeometry(13.4, 1.3, 2.6), steel); beam.position.set(0, 18.6, -2.6); scene.add(beam);
    const ring = mesh(new THREE.TorusGeometry(1.3, .32, 16, 40), orange); ring.position.set(0, 15.1, 0); scene.add(ring);
    const dialG = new THREE.Group(); dialG.position.set(5.4, 12, 1.2); scene.add(dialG);
    const dcv = cvs(256, 256), dg = dcv.getContext('2d'); dg.fillStyle = '#f4f2ec'; dg.fillRect(0, 0, 256, 256); dg.strokeStyle = '#222'; dg.fillStyle = '#222'; dg.font = '20px Arial'; dg.textAlign = 'center'; for (let k = 0; k < 50; k++) { const a = -2.3 + k / 49 * 4.6; dg.lineWidth = k % 5 === 0 ? 3 : 1.4; dg.beginPath(); dg.moveTo(128 + Math.sin(a) * 100, 128 - Math.cos(a) * 100); dg.lineTo(128 + Math.sin(a) * (k % 5 === 0 ? 80 : 88), 128 - Math.cos(a) * (k % 5 === 0 ? 80 : 88)); dg.stroke(); }
    const dface = mesh(new THREE.CylinderGeometry(1.7, 1.7, .5, 48), [new THREE.MeshStandardMaterial({ color: 0x2a2b2e, metalness: .8, roughness: .35 }), new THREE.MeshStandardMaterial({ map: tex(dcv), roughness: .4 }), steel]); dface.rotation.x = Math.PI / 2; dialG.add(dface);
    const bez = mesh(new THREE.TorusGeometry(1.7, .14, 12, 48), chrome); bez.position.z = .3; dialG.add(bez); const ng = new THREE.Group(); ng.position.z = .3; dialG.add(ng); const needle = new THREE.Mesh(new THREE.BoxGeometry(.1, 1.4, .06), new THREE.MeshBasicMaterial({ color: 0xcc2a1a })); needle.position.y = .6; ng.add(needle);
    const plunger = new THREE.Group(); scene.add(plunger); const pl = cyl(.9, .9, 10, chrome, 36); pl.position.y = 5; plunger.add(pl); const pk = cyl(.92, .92, .3, steel, 36); plunger.add(pk);
    const stand = cyl(3.2, 3.4, .5, steel, 56); stand.position.y = 1.25; scene.add(stand);
    const mould = mesh(new THREE.LatheGeometry([[2.98, 1.5], [3.02, 1.5], [3.02, 5.9], [3.2, 5.96], [3.2, 5.8], [3.0, 5.8]].map(p => new THREE.Vector2(p[0], p[1])), 64), steel); scene.add(mould);
    const gT = bakedTex('gsb'), specM = new THREE.MeshStandardMaterial({ map: gT.map, bumpMap: gT.bump, bumpScale: 4, roughness: .95 });
    const spec = new THREE.Mesh(scaleUV(new THREE.CylinderGeometry(2.9, 2.9, 4.2, 56), 2.4, .6, 0), [specM, specM, new THREE.MeshStandardMaterial({ color: 0x777777 })]); spec.position.y = 3.6; spec.castShadow = spec.receiveShadow = true; scene.add(spec);
    const sur = [0, 1].map(i => { const w = cyl(2.8, 2.8, .45, dark, 40); w.position.y = 6.1 + i * .5; w.visible = false; scene.add(w); return w; });
    const tank = mesh(new THREE.BoxGeometry(9.4, 6.4, 9.4), glass(), { cast: false }); tank.position.set(0, 4.2, 0); tank.visible = false; tank.renderOrder = 6; scene.add(tank);
    const wat = mesh(new THREE.BoxGeometry(9.2, 5.2, 9.2), water(), { cast: false }); wat.position.set(0, 3.6, 0); wat.visible = false; wat.renderOrder = 5; scene.add(wat);
    out.views = { all: { az: -16, el: 12, dist: narrow ? 56 : 42, t: [0, 9, 0] } }; out.limits = { az: [-50, 40], el: [3, 40], dist: [18, 70] };
    out.labels = [lab('p', 'Plunger', () => new V3(0, plunger.position.y + 4, 0), null, 'hot'), lab('r', 'Proving ring: measures the load', new V3(1.3, 15.1, 0)), lab('d', 'Penetration dial', new V3(5.4, 13.8, 1.2)), lab('s', 'Compacted specimen in its mould', new V3(-3, 3.5, 3), null, '', 'l'), lab('w', 'Soaked: surrounded by water, with surcharge discs', new V3(4.4, 3.4, 4), st => !!st.soak, 'hot')];
    out.update = (t, dt, st) => {
      if (go(st) && st.drive !== 'manual') T += dt; const auto = (T * .14) % 1, pen = st.drive === 'manual' || !go(st) ? clamp(st.pen || 0) : (auto < .8 ? auto / .8 : 1 - (auto - .8) / .2);
      const soak = !!st.soak; tank.visible = wat.visible = soak; sur.forEach(w => { w.visible = soak; });
      plunger.position.y = lerp(soak ? 7.8 : 6.7, 5.3, pen); ng.rotation.z = -pen * 4.5; return go(st);
    };
    return out;
  }

  /* abs */
  const tank = mesh(new THREE.BoxGeometry(12, 7, 8), glass(), { cast: false }); tank.position.set(-4, 3.6, 0); tank.renderOrder = 6; scene.add(tank);
  const wat = mesh(new THREE.BoxGeometry(11.8, 5.6, 7.8), water(), { cast: false }); wat.position.set(-4, 3.1, 0); wat.renderOrder = 5; scene.add(wat);
  const fr = new THREE.Group(); [[-6.1, 0], [-1.9, 0]].forEach(([x]) => { const fp = mesh(new THREE.BoxGeometry(.25, 7.2, 8.2), steel); fp.position.set(x - 3.9 + 4, 3.6, 0); }); scene.add(fr);
  const rim = mesh(new THREE.BoxGeometry(12.3, .3, 8.3), steel); rim.position.set(-4, 7.15, 0); scene.add(rim); const bot = mesh(new THREE.BoxGeometry(12.3, .3, 8.3), steel); bot.position.set(-4, .15, 0); scene.add(bot);
  const basket = new THREE.Group(); basket.position.set(-4, 3.2, 0); scene.add(basket);
  const wc = cvs(128, 128), wq = wc.getContext('2d'); wq.clearRect(0, 0, 128, 128); wq.strokeStyle = 'rgba(220,224,230,.95)'; wq.lineWidth = 3; for (let i = 0; i <= 128; i += 16) { wq.beginPath(); wq.moveTo(i, 0); wq.lineTo(i, 128); wq.stroke(); wq.beginPath(); wq.moveTo(0, i); wq.lineTo(128, i); wq.stroke(); }
  const wt = tex(wc); wt.repeat.set(8, 2); const bk = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.1, 3.4, 40, 1, true), new THREE.MeshStandardMaterial({ map: wt, transparent: true, alphaTest: .15, metalness: .9, roughness: .3, side: THREE.DoubleSide })); basket.add(bk);
  [1.7, -1.7].forEach(y => { const ringM = mesh(new THREE.TorusGeometry(y > 0 ? 2.4 : 2.1, .06, 8, 40), steel); ringM.rotation.x = Math.PI / 2; ringM.position.y = y; basket.add(ringM); });
  const bb = cyl(2.1, 2.1, .08, steel, 40); bb.position.y = -1.7; basket.add(bb);
  const r = rng(5), o = new THREE.Object3D(), bIM = new THREE.InstancedMesh(RS[2], stoneM, 30); bIM.frustumCulled = false; bIM.castShadow = true; basket.add(bIM);
  for (let i = 0; i < 30; i++) { const a = r() * TAU, rr = Math.sqrt(r()) * 1.6; o.position.set(Math.cos(a) * rr, -1.35 + r() * 1.6, Math.sin(a) * rr); o.scale.setScalar(.34 + r() * .2); o.rotation.set(r() * 6, r() * 6, r() * 6); o.updateMatrix(); bIM.setMatrixAt(i, o.matrix); }
  const wire = cyl(.05, .05, 9, steel, 8); wire.position.set(-4, 7.9, 0); scene.add(wire);
  const bal = new THREE.Group(); bal.position.set(7, 0, 0); scene.add(bal); const bbse = mesh(new THREE.BoxGeometry(6, 1.5, 5), dark); bbse.position.y = .75; bal.add(bbse); const pan = cyl(2, 2, .25, chrome, 48); pan.position.y = 1.85; bal.add(pan);
  const disp = mesh(new THREE.BoxGeometry(2.6, .8, .1), new THREE.MeshStandardMaterial({ color: 0x103a2c, emissive: 0x1a8a5a, emissiveIntensity: .35, roughness: .3 })); disp.position.set(0, 1.0, 2.52); bal.add(disp);
  out.views = { all: { az: -12, el: 14, dist: narrow ? 50 : 36, t: [0, 4, 0] } }; out.limits = { az: [-50, 40], el: [3, 40], dist: [16, 60] };
  out.labels = [lab('t', 'Aggregate in a basket, held in water', new V3(-4, 7.6, 0), null, 'hot'), lab('b', 'Balance', new V3(7, 2.8, 0)), lab('n', 'No reading is shown', new V3(7, 5.4, 0), null, 'warn')];
  out.update = (t, dt, st) => { if (go(st)) T += dt; basket.position.y = 3.2 + Math.sin(T * 1.4) * .12; return go(st); };
  return out;
}
