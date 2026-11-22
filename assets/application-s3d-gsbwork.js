/* scene: placing a GSB layer, in five stages along one road strip.
   dump   : a tipper deposits the material in heaps on the prepared subgrade.
   spread : a motor grader spreads it to an even loose layer.
   water  : a water tanker conditions the layer: the water is controlled and its quantity comes from the specified testing.
   roll   : a vibratory roller follows and the layer becomes thinner and denser; a cut face shows the particles.
   check  : a site engineer checks levels with a staff and a straight-edge; field density, moisture and thickness are separate tests.
   Generic machines. No loose thickness, compacted thickness, roller-pass count, density or moisture value is shown or implied. */
import { THREE, L, studio, rng, instStones } from '/assets/application-s3d.js';
import { layerBlock, soilMat, tipper, roller, reduceM, yellowM } from '/assets/application-s3d-wmkit.js';
const { M, mk, clamp, sm, lerp, TAU } = L;
const V3 = THREE.Vector3;

function grader() {
  const g = new THREE.Group(), y = yellowM();
  const frame = mk(new THREE.BoxGeometry(15, .8, 1.6), y); frame.position.set(0, 3.4, 0); frame.rotation.z = .03; g.add(frame);
  const rear = mk(new THREE.BoxGeometry(5.4, 3, 4.6), y); rear.position.set(-5.4, 3.6, 0); g.add(rear);
  const cab = mk(new THREE.BoxGeometry(3, 3, 3.2), new THREE.MeshStandardMaterial({ color: 0xe5a000, roughness: .5 })); cab.position.set(-1.2, 5.6, 0); g.add(cab); const win = mk(new THREE.BoxGeometry(3.1, 1.5, 3.3), new THREE.MeshStandardMaterial({ color: 0x5a7d93, roughness: .1, metalness: .3 })); win.position.set(-1.2, 5.9, 0); g.add(win); const roof = mk(new THREE.BoxGeometry(3.6, .25, 3.8), y); roof.position.set(-1.2, 7.3, 0); g.add(roof);
  [[-6.6, -2.7], [-6.6, 2.7], [-4.2, -2.7], [-4.2, 2.7], [5, -2.2], [5, 2.2]].forEach(([x, z]) => { const w = mk(new THREE.CylinderGeometry(1.5, 1.5, 1.2, 24), M.rubber); w.rotation.x = Math.PI / 2; w.position.set(x, 1.5, z); g.add(w); const hub = mk(new THREE.CylinderGeometry(.7, .7, 1.25, 16), y); hub.rotation.x = Math.PI / 2; hub.position.set(x, 1.5, z); g.add(hub); });
  const front = mk(new THREE.BoxGeometry(1.4, 2.6, 2), y); front.position.set(6.4, 2.6, 0); g.add(front);
  const circle = mk(new THREE.BoxGeometry(5, .4, 2.4), M.dark); circle.position.set(2.6, 1.9, 0); circle.rotation.z = -.06; g.add(circle);
  const blade = new THREE.Group(); blade.position.set(2.6, 1.3, 0); blade.rotation.y = .42; g.add(blade); const bl = mk(new THREE.BoxGeometry(.4, 1.8, 8), M.steelS); bl.position.y = .4; blade.add(bl);
  return { g, blade };
}
function tanker() {
  const g = new THREE.Group(), body = new THREE.MeshStandardMaterial({ color: 0xe5a000, roughness: .5, metalness: .1 });
  const ch = mk(new THREE.BoxGeometry(15, .9, 4.4), M.dark); ch.position.set(0, 1.9, 0); g.add(ch);
  [[-5, -2.4], [-5, 2.4], [-2.8, -2.4], [-2.8, 2.4], [5, -2.4], [5, 2.4]].forEach(([x, z]) => { const w = mk(new THREE.CylinderGeometry(1.15, 1.15, 1, 22), M.rubber); w.rotation.x = Math.PI / 2; w.position.set(x, 1.15, z); g.add(w); });
  const cab = mk(new THREE.BoxGeometry(3.6, 3.6, 4.2), new THREE.MeshStandardMaterial({ color: 0xf1efe9, roughness: .5 })); cab.position.set(6.2, 4, 0); g.add(cab);
  const tank = mk(new THREE.CylinderGeometry(2, 2, 9, 32), body); tank.rotation.z = Math.PI / 2; tank.position.set(-1.4, 4.4, 0); g.add(tank);
  const bar = mk(new THREE.CylinderGeometry(.12, .12, 7, 8), M.steelS); bar.rotation.x = Math.PI / 2; bar.position.set(-6.4, 1.6, 0); g.add(bar);
  return { g };
}

export default function build({ state }) {
  const scene = new THREE.Scene(); studio(scene, { ext: 80, key: 2.2, shadow: .2, map: 2048 });
  const out = { scene, fov: 30, wide: true };
  const LEN = 150, D = 12, T0 = 2.4;
  const sub = mk(new THREE.BoxGeometry(LEN, 3, D + 12), soilMat(5)); sub.material.map.repeat.set(LEN / 14, 1); sub.position.y = -1.5; scene.add(sub);
  const loose = layerBlock(24, T0, D - .4, 'gsbl', 11, 0x6a675f), dense = layerBlock(24, T0, D - .4, 'gsb', 17, 0x6a675f); scene.add(loose, dense);
  const setBlock = (b, x0, x1, th) => { const len = Math.max(.001, x1 - x0); b.scale.set(len / 24, th / T0, 1); b.position.set((x0 + x1) / 2, th / 2, 0); b.visible = len > .1; b.material.forEach(m => { if (m.map) m.map.repeat.x = len / 24; }); };
  /* heaps on the subgrade */
  const heapM = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .9 }); const heaps = [];
  for (let i = 0; i < 5; i++) { const gp = new THREE.Group(); const r = rng(20 + i), it = []; for (let j = 0; j < 90; j++) { const a = r() * TAU, rr = 2.4 * Math.sqrt(r()); it.push([Math.cos(a) * rr, .3 + (1 - rr / 2.4) * 1.9 * r() + .25, Math.sin(a) * rr * .9, .22 + r() * .22]); } instStones(gp, it, heapM, 30 + i, false); scene.add(gp); heaps.push(gp); }
  const tp = tipper({ tarp: false }); tp.g.scale.setScalar(.72); scene.add(tp.g);
  const gr = grader(); gr.g.scale.setScalar(.82); scene.add(gr.g);
  const tk = tanker(); tk.g.scale.setScalar(.72); scene.add(tk.g);
  const rl = roller(); rl.g.scale.setScalar(.72); scene.add(rl.g);
  const spray = new THREE.InstancedMesh(new THREE.SphereGeometry(.14, 6, 5), new THREE.MeshBasicMaterial({ color: 0x6fc0e6 }), 70); spray.frustumCulled = false; scene.add(spray);
  const insp = new THREE.Group(); scene.add(insp); const body = mk(new THREE.CylinderGeometry(.4, .5, 1.5, 10), new THREE.MeshStandardMaterial({ color: 0xff7a2b, roughness: .7 })); body.position.y = .75; insp.add(body); const head = mk(new THREE.SphereGeometry(.38, 12, 10), new THREE.MeshStandardMaterial({ color: 0xc58a62, roughness: .8 })); head.position.y = 1.8; insp.add(head); const hat = mk(new THREE.SphereGeometry(.42, 12, 8, 0, TAU, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf2c200, roughness: .5 })); hat.position.y = 1.95; insp.add(hat);
  const se = mk(new THREE.BoxGeometry(.16, .16, 9), M.steelS); se.position.set(1.2, 1.1, 0); insp.add(se); const staff = mk(new THREE.BoxGeometry(.2, 3.2, .2), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .8 })); staff.position.set(1.2, 1.6, -3.6); insp.add(staff);
  out.views = { dump: { az: -18, el: 14, dist: 92, t: [14, 3, 0] }, spread: { az: -24, el: 16, dist: 62, t: [6, 2, 0] }, water: { az: -20, el: 15, dist: 68, t: [-8, 2, 0] }, roll: { az: -18, el: 11, dist: 54, t: [-20, 2, 3] }, check: { az: -22, el: 13, dist: 40, t: [-36, 1.5, 0] } };
  out.limits = { az: [-60, 40], el: [3, 40], dist: [20, 110] };
  const lab = (id, text, a, vs, tone, side = 'r') => ({ id, text, side, tone, anchor: a, show: st => vs.includes(st.view || 'spread') });
  out.labels = [
    lab('t', 'Tipper unloads in heaps', () => new V3(tp.g.position.x, 8, 0), ['dump'], 'warn'), lab('h', 'Heaps on the prepared subgrade', () => new V3(heaps[1].position.x, 5, 0), ['dump'], '', 'l'),
    lab('g', 'Motor grader spreads an even loose layer', () => new V3(gr.g.position.x, 8.8, 0), ['spread'], 'hot'), lab('m', 'Loose layer', () => new V3(gr.g.position.x - 12, 3.3, 5.8), ['spread'], '', 'l'),
    lab('w', 'Water tanker: controlled water', () => new V3(tk.g.position.x, 8, 0), ['water'], 'hot'), lab('o', 'Quantity comes from the specified testing, not from this picture', () => new V3(tk.g.position.x - 10, 2.6, 5.8), ['water'], 'warn', 'l'),
    lab('r', 'Vibratory roller: approved method and trial', () => new V3(rl.g.position.x, 9, 0), ['roll'], 'hot'), lab('d', 'Thinner, denser layer', () => new V3(rl.g.position.x - 12, 2.4, 5.8), ['roll'], '', 'l'),
    lab('s', 'Levels and straight-edge', () => new V3(insp.position.x, 4, 0), ['check'], 'hot'), lab('i', 'Field density, moisture and thickness: separate tests', () => new V3(insp.position.x + 4, 2.4, 3), ['check'], 'warn')];
  let T = 0; out.seek = v => { T = v; }; const o = new THREE.Object3D(), r2 = rng(9), sp = Array.from({ length: 70 }, () => ({ z: (r2() - .5) * 7, ph: r2(), s: r2() }));
  const cur = { v: '' };
  out.update = (t, dt, st) => {
    const go = st.play !== false && !reduceM(); if (go) T += dt; const vw = st.view || 'spread', u = (T * .05) % 1, e = go ? sm(u < .5 ? u * 2 : 2 - u * 2) : .5;
    let tx = 70, gx = 70, kx = 70, rx = -40, ix = 70, tilt = 0, showSpray = false;
    heaps.forEach((h, i) => { h.position.set(-30 + i * 12, 0, 0); h.visible = false; });
    if (vw === 'dump') { tx = lerp(30, -4, e); tilt = .1 + .5 * sm(clamp((e - .25) * 2)); heaps.forEach((h, i) => { h.visible = (-30 + i * 12) > tx + 2 || e > .5 && i < 5; h.position.x = 30 - i * 12 * .5 + -30 + 30; }); heaps.forEach((h, i) => { h.position.set(26 - i * 9, 0, 0); h.visible = h.position.x > tx - 2 || i < 2; }); setBlock(loose, 30, 30, T0); setBlock(dense, 30, 30, T0); }
    else if (vw === 'spread') { gx = lerp(-4, 16, e); setBlock(loose, -70, gx - 6, T0); setBlock(dense, 30, 30, T0); heaps.forEach((h, i) => { h.position.set(26 - i * 7, 0, 0); h.visible = h.position.x > gx + 3; }); tx = 52; }
    else if (vw === 'water') { kx = lerp(10, -22, e); showSpray = true; setBlock(loose, -70, 30, T0); setBlock(dense, 30, 30, T0); }
    else if (vw === 'roll') { rx = lerp(-34, -4, e); setBlock(loose, rx - 1, 30, T0); setBlock(dense, -70, rx - 1, T0 * .82); }
    else { setBlock(loose, 30, 30, T0); setBlock(dense, -70, 30, T0 * .82); ix = -40 + (go ? Math.sin(T * .6) * 3 : 0); rx = -4; }
    tp.g.position.set(tx, 0, 0); tp.bed.rotation.z = tilt; tp.load.scale.y = Math.max(.05, 1 - tilt * 1.5); gr.g.position.set(gx, 0, 0); tk.g.position.set(kx, 0, 0); rl.g.position.set(rx, vw === 'roll' || vw === 'check' ? T0 * .82 : 0, 0);
    rl.drum.rotation.z = -T * 2.2; insp.position.set(ix, 0, 5.4); insp.visible = vw === 'check'; rl.g.visible = vw === 'roll' || vw === 'check'; tp.g.visible = vw === 'dump'; gr.g.visible = vw === 'spread'; tk.g.visible = vw === 'water';
    sp.forEach((s, i) => { const k = (T * .8 + s.ph) % 1; o.position.set(kx - 6.6 * .72 - k * 1.2 + (s.s - .5) * .5, 1.2 + Math.sin(k * Math.PI) * 1.2 - k * .8, s.z); o.scale.setScalar(showSpray ? 1 : .001); o.rotation.set(0, 0, 0); o.updateMatrix(); spray.setMatrixAt(i, o.matrix); }); spray.instanceMatrix.needsUpdate = true;
    const ch = cur.v !== vw; cur.v = vw; return go || ch;
  };
  return out;
}
