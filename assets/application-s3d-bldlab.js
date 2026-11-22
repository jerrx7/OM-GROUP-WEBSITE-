/* scene: natural-stone laboratory and exposure. Three sets, one module.
   comp  : a compression frame loads a cut stone specimen until it fails (a gauge needle, no numbers).
   pore  : a stone block cut open to show its pores, standing in water: as it saturates the accessible pores fill (a switch compares dry and saturated).
   weath : a sound stone beside a weathered one through rain and wet-dry cycles; the weak one breaks down at the surface. No service life is implied.
   Generic laboratory and exposure drawings. No strength, density, absorption, porosity or durability value, certificate or OM GROUP result is shown or implied. */
import { THREE, L, studio, rng, instStones } from '/assets/application-s3d.js';
import { boulder, boulderGeo, boulderMat, reduceM } from '/assets/application-s3d-bldkit.js';
import { realStoneMaterial } from '/assets/s3dstone/real-stone.js';
const { M, mk, clamp, sm, lerp, TAU, canvasTex } = L;
const V3 = THREE.Vector3;
const stoneTex = (seed, w = 512, h = 512, pores = 0) => canvasTex(w, h, (x, cw, ch) => {
  x.fillStyle = '#4a4b4f'; x.fillRect(0, 0, cw, ch); const r = rng(seed);
  for (let i = 0; i < 2600; i++) { const t = (.2 + r() * .3) * 255 | 0; x.fillStyle = 'rgba(' + t + ',' + t + ',' + (t + 6) + ',.7)'; const s = 1 + r() * 4; x.fillRect(r() * cw, r() * ch, s, s * (.6 + r())); }
  for (let i = 0; i < 6; i++) { x.strokeStyle = 'rgba(225,225,220,.35)'; x.lineWidth = 1.5 + r() * 2; x.beginPath(); x.moveTo(r() * cw, 0); x.lineTo(r() * cw, ch); x.stroke(); }
  if (pores) { const rp = rng(seed + 100); for (let i = 0; i < pores; i++) { x.fillStyle = 'rgba(12,12,14,.92)'; const px = rp() * cw, py = rp() * ch, rd = 2 + rp() * 5; x.beginPath(); x.ellipse(px, py, rd, rd * (.7 + rp() * .5), rp() * 3, 0, TAU); x.fill(); } }
}, true);
const poresTex = (seed, w, h, n) => canvasTex(w, h, (x, cw, ch) => { x.clearRect(0, 0, cw, ch); const rp = rng(seed + 100); for (let i = 0; i < n; i++) { const px = rp() * cw, py = rp() * ch, rd = 2 + rp() * 5; x.fillStyle = 'rgba(79,156,207,.95)'; x.beginPath(); x.ellipse(px, py, rd + 1.5, (rd + 1.5) * (.7 + rp() * .5), rp() * 3, 0, TAU); x.fill(); } }, true);

export default function build({ state }) {
  const set = state.set || 'comp';
  const scene = new THREE.Scene(); studio(scene, { ext: 14, key: 2.3, shadow: .2, map: 2048 });
  const out = { scene, fov: 28, wide: true }; let T = 0; out.seek = v => { T = v; };
  const lab = (id, text, a, show, tone, side = 'r') => ({ id, text, side, tone, anchor: a, show: show || (() => true) });
  const go = st => st.play !== false && !reduceM();

  if (set === 'comp') {
    const base = mk(new THREE.BoxGeometry(11, 1, 8), M.dark); base.position.y = .5; scene.add(base);
    [-4.6, 4.6].forEach(x => { const c = mk(new THREE.CylinderGeometry(.42, .42, 14.5, 16), M.steelS); c.position.set(x, 8.2, -2.2); scene.add(c); });
    const beam = mk(new THREE.BoxGeometry(10.8, 1.2, 2.6), M.steel); beam.position.set(0, 15.2, -2.2); scene.add(beam);
    const lower = mk(new THREE.CylinderGeometry(2.2, 2.4, .5, 40), M.steelS); lower.position.y = 1.25; scene.add(lower);
    const tex = stoneTex(5), specM = [new THREE.MeshStandardMaterial({ map: tex, roughness: .95 }), new THREE.MeshStandardMaterial({ map: stoneTex(6, 256, 256), roughness: .95 }), new THREE.MeshStandardMaterial({ map: stoneTex(7, 256, 256), roughness: .95 })];
    const specG = new THREE.Group(); specG.position.y = 1.5; scene.add(specG); const lo = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 2.4, 40), specM); lo.position.y = 1.2; lo.castShadow = true; specG.add(lo);
    const cr = new THREE.Mesh(new THREE.BoxGeometry(.06, 3.1, 2.7), new THREE.MeshBasicMaterial({ color: 0x050506 })); cr.position.y = 1.2; cr.rotation.z = .5; cr.visible = false; specG.add(cr);
    const up = new THREE.Group(); scene.add(up); const pl = mk(new THREE.CylinderGeometry(2.2, 2.2, .5, 40), M.steelS); up.add(pl); const ram = mk(new THREE.CylinderGeometry(.8, .8, 7, 20), M.chrome); ram.position.y = 3.7; up.add(ram);
    const gauge = new THREE.Group(); gauge.position.set(5.9, 6.5, 2.2); scene.add(gauge); const gf = mk(new THREE.CylinderGeometry(1.7, 1.7, .5, 40), M.white); gf.rotation.x = Math.PI / 2; gauge.add(gf); const nd = new THREE.Group(); gauge.add(nd); const needle = mk(new THREE.BoxGeometry(.12, 1.3, .1), M.red); needle.position.y = .6; nd.add(needle); nd.position.z = .3;
    out.views = { all: { az: -18, el: 12, dist: 32, t: [0, 6.4, 0] } }; out.limits = { az: [-55, 45], el: [3, 40], dist: [16, 62] };
    out.labels = [lab('p', 'Platen applies a load', () => new V3(0, up.position.y + .5, 0), null, 'hot'), lab('s', 'Specimen cut from the stone', new V3(-1.6, 2.7, 1.4), null, '', 'l'), lab('g', 'Gauge: no reading is shown', new V3(5.9, 8.4, 2.2), null, 'warn', 'r'), lab('f', 'Failure: the specimen cracks', new V3(0, 2.7, 1.6), st => (st.__cl || 0) > .88, 'warn', 'r')];
    out.update = (t, dt, st) => {
      if (go(st) && st.drive !== 'manual') T += dt; const auto = (T * .12) % 1.25; const ld = st.drive === 'manual' || !go(st) ? clamp(st.load || 0) : clamp(auto / 1);
      st.__cl = ld; const hlo = 2.4 * (1 - ld * .06), top = 1.5 + hlo; lo.scale.y = 1 - ld * .06; lo.position.y = 1.2 * lo.scale.y; up.position.y = top + .25; cr.visible = ld > .88; specG.position.y = 1.5;
      lo.scale.x = lo.scale.z = ld > .92 ? 1.06 : 1; nd.rotation.z = -ld * 4.6; return go(st);
    };
    return out;
  }

  if (set === 'pore') {
    /* a block of stone cut open, standing in a glass tank. The stone's pores are real pits in its surface (a 3D pore field in the stone shader); the wet front climbs the block
       as it saturates, darkening it, and the pores it reaches fill with water. Air bubbles escape from the submerged part. No value is shown. */
    const SZ = 8, WL = 2.7;
    const stoneM = realStoneMaterial({ tint: .5, bump: .06, floor: 0, gain: .95, contrast: .34, scale: .3, soft: 1.5, grain: .6, pores: 2.0, own: true }), PU = stoneM.userData.uniforms; PU.uPoreWet.value = 1;
    const bg = new THREE.BoxGeometry(SZ, SZ, SZ); bg.setAttribute('aCell', new THREE.Float32BufferAttribute(new Float32Array(bg.attributes.position.count).fill(4), 1));
    const blockG = new THREE.Group(); blockG.position.y = .4 + SZ / 2; scene.add(blockG);
    const blk = new THREE.Mesh(bg, stoneM); blk.castShadow = blk.receiveShadow = true; blockG.add(blk);
    /* glass tank: faint glass faces, bright edges */
    const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .03, metalness: 0, transparent: true, opacity: .07, depthWrite: false, envMapIntensity: 1.6, side: THREE.DoubleSide });
    const tank = mk(new THREE.BoxGeometry(14, 12, 12), glass, { cast: false }); tank.position.y = 6; scene.add(tank);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(tank.geometry), new THREE.LineBasicMaterial({ color: 0xaec4cc, transparent: true, opacity: .75 })); edges.position.y = 6; scene.add(edges);
    /* water: a tinted, glossy volume with a rippling surface (a normal map that drifts) */
    const rip = (() => {
      const N = 256, h = new Float32Array(N * N), W = [[3, 5, 1], [7, 2, .6], [11, 13, .35], [19, 17, .2]];
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let v = 0; W.forEach(([aa, bb, w], k) => { v += w * Math.sin((x / N * aa + y / N * bb) * 6.2832 + k * 1.7) * Math.cos((y / N * aa - x / N * bb * .7) * 6.2832 + k); }); h[y * N + x] = v; }
      const cv = document.createElement('canvas'); cv.width = cv.height = N; const g = cv.getContext('2d'), im = g.createImageData(N, N);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const dx = h[y * N + (x + 1) % N] - h[y * N + (x + N - 1) % N], dy = h[((y + 1) % N) * N + x] - h[((y + N - 1) % N) * N + x], l = Math.hypot(dx * 1.6, dy * 1.6, 1), i = (y * N + x) * 4; im.data[i] = (-dx * 1.6 / l * .5 + .5) * 255; im.data[i + 1] = (-dy * 1.6 / l * .5 + .5) * 255; im.data[i + 2] = (1 / l * .5 + .5) * 255; im.data[i + 3] = 255; }
      g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2.5, 2.5); return t;
    })();
    const waterM = new THREE.MeshPhysicalMaterial({ color: 0x8fcfe0, roughness: .04, metalness: 0, transparent: true, opacity: .46, depthWrite: false, envMapIntensity: 1.5, ior: 1.33, clearcoat: 1, clearcoatRoughness: .04 });
    const water = mk(new THREE.BoxGeometry(13.9, WL, 11.9), waterM, { cast: false }); water.position.y = WL / 2; scene.add(water);
    const surf = new THREE.Mesh(new THREE.PlaneGeometry(13.9, 11.9), new THREE.MeshPhysicalMaterial({ color: 0xcfeaf2, roughness: .02, metalness: 0, transparent: true, opacity: .5, depthWrite: false, envMapIntensity: 2.2, normalMap: rip, normalScale: new THREE.Vector2(.5, .5), clearcoat: 1 })); surf.rotation.x = -Math.PI / 2; surf.position.y = WL + .01; scene.add(surf);
    /* bubbles of air leaving the submerged stone while it saturates */
    const NB = 46, bub = new THREE.InstancedMesh(new THREE.SphereGeometry(.07, 10, 8), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0, transparent: true, opacity: .6, envMapIntensity: 2.2, depthWrite: false }), NB); bub.frustumCulled = false; bub.castShadow = false; scene.add(bub);
    const o = new THREE.Object3D(), rp = rng(3), bd = Array.from({ length: NB }, () => ({ x: (rp() - .5) * (SZ - .8), z: SZ / 2 + .1, ph: rp(), sp: .18 + rp() * .16, r: .6 + rp() * 1.1, w: rp() * 6 }));
    const cur = { w: 0 }; out.seek = v => { T = v; cur.w = 1e9; };
    out.views = { all: { az: -14, el: 12, dist: 44, t: [0, 5.2, 0] } }; out.limits = { az: [-55, 45], el: [3, 40], dist: [18, 70] };
    out.labels = [lab('p', 'Pores in the stone', new V3(-1.6, 6.2, SZ / 2), null, '', 'l'), lab('w', 'Accessible pores fill with water', new V3(1.8, 3.2, SZ / 2), st => (st.wet || 0) > .4, 'hot', 'r'), lab('t', 'Stone block, cut open', new V3(0, 9.6, 0), null, '', 'r'), lab('n', 'Absorption is not permeability', new V3(5.6, 8.8, 0), null, 'warn', 'r')];
    out.update = (t, dt, st) => {
      const goal = st.wet == null ? 0 : st.wet; if (cur.w > 1e8) cur.w = goal; cur.w += (goal - cur.w) * (reduceM() ? 1 : 1 - Math.exp(-dt * 1.4)); const mv = Math.abs(goal - cur.w) > .003; if (!mv) cur.w = goal;
      PU.uPoreY.value = lerp(WL - .2, SZ + .6, sm(cur.w));
      if (go(st)) T += dt; rip.offset.set(T * .006, T * .004);
      const on = cur.w > .03 && cur.w < .97;
      for (let i = 0; i < NB; i++) { const d = bd[i], u = (T * d.sp + d.ph) % 1, y = .5 + u * (WL - .5); o.position.set(d.x + Math.sin(T * 2 + d.w) * .06, y, d.z); o.scale.setScalar(on ? d.r * (.7 + .5 * u) : .0001); o.updateMatrix(); bub.setMatrixAt(i, o.matrix); } bub.instanceMatrix.needsUpdate = true;
      return mv || go(st);
    };
    return out;
  }

  /* weath */
  const floor = mk(new THREE.BoxGeometry(24, .3, 12), new THREE.MeshStandardMaterial({ color: 0xe7e4de, roughness: .7 })); floor.position.y = -.15; scene.add(floor);
  const sound = boulder(31, 1.7, 1.1, 1.3, 'nat', 0, 5); sound.position.x = -6; scene.add(sound);
  const weak = boulder(32, 1.7, 1.1, 1.3, 'nat', .75, 5); weak.position.x = 6; scene.add(weak);
  const crackM = new THREE.MeshBasicMaterial({ color: 0x050506 }); const cracks = []; for (let i = 0; i < 5; i++) { const c = mk(new THREE.BoxGeometry(.05, .9 + i * .1, .05), crackM, { cast: false }); c.position.set(5 + i * .55 - .6, 1.3 + (i % 2) * .3, 1.2); c.rotation.z = (i - 2) * .4; c.visible = false; scene.add(c); cracks.push(c); }
  const chipI = (() => { const items = []; const r = rng(4); for (let i = 0; i < 40; i++) items.push([6 + (r() - .5) * 4.4, .12, (r() - .5) * 4.4, .08 + r() * .1]); return instStones(scene, items, new THREE.MeshStandardMaterial({ color: 0x8a6b4a, roughness: 1 }), 11, false); })();
  const N = 90, rain = new THREE.InstancedMesh(new THREE.SphereGeometry(.07, 6, 5), new THREE.MeshBasicMaterial({ color: 0x4f9ccf }), N); rain.frustumCulled = false; scene.add(rain); const o = new THREE.Object3D(), rr = rng(6), rd = Array.from({ length: N }, () => ({ x: (rr() - .5) * 20, z: (rr() - .5) * 8, ph: rr() }));
  const cur = { c: 0 }; out.seek = v => { T = v; cur.c = 1e9; };
  out.views = { all: { az: -12, el: 13, dist: 30, t: [0, 1.4, 0] } }; out.limits = { az: [-55, 45], el: [4, 45], dist: [12, 50] };
  out.labels = [lab('a', 'Sound stone', new V3(-6, 3.4, 0), null, 'hot', 'r'), lab('b', 'Weathered stone: weak zones and surface breakdown', new V3(6, 3.4, 0), null, 'warn', 'r'), lab('c', 'Cracks and loose fragments', new V3(6, .6, 2.6), st => (st.cycle || 0) > .5, '', 'r'), lab('r', 'Rainfall and wet-dry cycles', new V3(0, 7.4, 0), st => (st.cycle || 0) > .02 && (st.cycle || 0) < .6, '', 'r'), lab('n', 'No service life is implied', new V3(0, 5.4, 0), null, 'warn', 'r')];
  out.update = (t, dt, st) => {
    if (go(st) && st.drive !== 'manual') T += dt; const goal = st.drive === 'manual' || !go(st) ? (st.cycle || 0) : clamp((T * .08) % 1.2);
    if (cur.c > 1e8) cur.c = goal; cur.c += (goal - cur.c) * (reduceM() ? 1 : 1 - Math.exp(-dt * 6)); const c = clamp(cur.c); st.__c = c;
    cracks.forEach((k, i) => { k.visible = c > .4 + i * .08; }); chipI.forEach(im => { im.visible = c > .55; }); weak.scale.setScalar(1 - .03 * clamp((c - .5) * 2)); weak.position.y = -weak.userData.bb.min.y * weak.scale.x;
    const raining = c > .02 && c < .55; rd.forEach((d, i) => { const u = (T * 1.2 + d.ph) % 1; o.position.set(d.x, 7 - u * 7, d.z); o.scale.setScalar(raining ? 1 : .001); o.updateMatrix(); rain.setMatrixAt(i, o.matrix); }); rain.instanceMatrix.needsUpdate = true;
    return go(st) || Math.abs(goal - cur.c) > .003;
  };
  return out;
}
