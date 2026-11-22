/* scene: a gabion cage with a changeable mesh opening, filled with 60 mm crushed stone and construction boulders (1 unit = 1 cm).
   Shows only the principle that stone size must suit the mesh opening. The openings are examples, not a design or a product size. */
import { THREE, L, studio, rng, instStones } from '/assets/application-s3d.js';
import { realStones, realStoneMaterial } from '/assets/s3dstone/real-stone.js';
const { M, mk, clamp, sm, lerp } = L;
const V3 = THREE.Vector3;
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function build() {
  const scene = new THREE.Scene(); studio(scene, { ext: 46, shadow: .26, y: .05 });   /* the plate top is at y = 0: the shadow plane floats just above it, so the two no longer z-fight (that was the flickering shadow) */
  const W = 48, H = 26, D = 26;
  const plate = mk(new THREE.CylinderGeometry(52, 52.6, .6, 80), new THREE.MeshStandardMaterial({ color: 0xe7e4de, roughness: .6 })); plate.position.y = -.3; scene.add(plate);
  const wireM = new THREE.MeshStandardMaterial({ color: 0xc9cdd3, metalness: .9, roughness: .3, envMapIntensity: 1.3 });
  const MAXW = 1200, wires = new THREE.InstancedMesh(new THREE.CylinderGeometry(.12, .12, 1, 6), wireM, MAXW); wires.frustumCulled = false; wires.castShadow = true; scene.add(wires);
  const o = new THREE.Object3D(); let curOpen = -1;
  function setMesh(p) {
    let n = 0; const wire = (ax, x, y, z, len) => { if (n >= MAXW) return; o.position.set(x, y, z); o.rotation.set(0, 0, 0); if (ax === 'x') o.rotation.z = Math.PI / 2; else if (ax === 'z') o.rotation.x = Math.PI / 2; o.scale.set(1, len, 1); o.updateMatrix(); wires.setMatrixAt(n++, o.matrix); };
    const nx = Math.max(1, Math.round(W / p)), ny = Math.max(1, Math.round(H / p)), nz = Math.max(1, Math.round(D / p));
    for (const sz of [D / 2, -D / 2]) { for (let i = 0; i <= nx; i++) wire('y', -W / 2 + i * W / nx, H / 2, sz, H); for (let j = 0; j <= ny; j++) wire('x', 0, j * H / ny, sz, W); }
    for (const sx of [W / 2, -W / 2]) { for (let i = 0; i <= nz; i++) wire('y', sx, H / 2, -D / 2 + i * D / nz, H); for (let j = 0; j <= ny; j++) wire('z', sx, j * H / ny, 0, D); }
    wires.count = n; wires.instanceMatrix.needsUpdate = true;
  }
  const frameM = new THREE.MeshStandardMaterial({ color: 0x80868e, metalness: .9, roughness: .3 });
  for (const [x, y, z, w, h, d] of [[0, 0, D / 2, W, .5, .5], [0, 0, -D / 2, W, .5, .5], [-W / 2, 0, 0, .5, .5, D], [W / 2, 0, 0, .5, .5, D], [0, H, D / 2, W, .5, .5], [0, H, -D / 2, W, .5, .5], [-W / 2, H, 0, .5, .5, D], [W / 2, H, 0, .5, .5, D]]) { const m = mk(new THREE.BoxGeometry(w, h, d), frameM); m.position.set(x, y, z); scene.add(m); }
  for (const [x, z] of [[-W / 2, D / 2], [W / 2, D / 2], [-W / 2, -D / 2], [W / 2, -D / 2]]) { const m = mk(new THREE.BoxGeometry(.5, H, .5), frameM); m.position.set(x, H / 2, z); scene.add(m); }

  /* real-photo stones (assets/s3dstone): boulders and 60 mm crushed stone share one photographic material */
  const RM = realStoneMaterial(), BG = realStones('boulder'), CG = realStones('crush');
  const r = rng(17), items = [], small = [];
  /* boulders: placed first, with a little room between them */
  const placeB = () => { for (let t = 0; t < 500; t++) { const rad = 6.6 + r() * 1.4, p = [(r() - .5) * (W - 2 * rad - 1), rad * .85 + r() * (H - 2 * rad - 1), (r() - .5) * (D - 2 * rad - 1)]; if (items.every(q => Math.hypot(q.p[0] - p[0], q.p[1] - p[1], q.p[2] - p[2]) > (q.rad + rad) * .95)) { const s = new THREE.Mesh(BG[(r() * BG.length) | 0], RM); s.castShadow = s.receiveShadow = true; s.scale.set(rad * (.92 + r() * .22), rad * (.84 + r() * .3), rad * (.92 + r() * .22)); s.rotation.set(r() * 6.28, r() * 6.28, r() * 6.28); s.position.set(...p); scene.add(s); items.push({ s, p, rad, ph: r(), esc: 0, out: [(r() - .5) * 40, rad * .8 + .6, D / 2 + 8 + r() * 14] }); return; } } };
  for (let i = 0; i < 7; i++) placeB();
  /* 60 mm stones fill the remaining space (instanced); the ones that can pass the opening leave through the front */
  const SN = 420, ims = CG.map(g => { const m = new THREE.InstancedMesh(g, RM, Math.ceil(SN / CG.length) + 2); m.castShadow = m.receiveShadow = true; m.frustumCulled = false; scene.add(m); return m; });
  for (let t = 0, n = 0; n < SN && t < 20000; t++) {
    const rad = 2.8 + r() * .5, p = [(r() - .5) * (W - 2 * rad - 1), rad * .85 + r() * (H - 2 * rad - 1), (r() - .5) * (D - 2 * rad - 1)];
    if (items.some(q => Math.hypot(q.p[0] - p[0], q.p[1] - p[1], q.p[2] - p[2]) < (q.rad + rad) * .92)) continue; if (small.some(q => Math.hypot(q.p[0] - p[0], q.p[1] - p[1], q.p[2] - p[2]) < (q.rad + rad) * .88)) continue;
    small.push({ p, rad, ph: r(), esc: 0, rot: [r() * 6, r() * 6, r() * 6], out: [(r() - .5) * 52, rad * .8 + .3, D / 2 + 5 + r() * 20] }); n++;
  }
  ims.forEach((m, k) => { m.count = Math.floor(small.length / ims.length) + (k < small.length % ims.length ? 1 : 0); });
  { const tint = new THREE.Color(); small.forEach((it, i) => { const t = .8 + r() * .4; tint.setRGB(t, t * (.98 + r() * .04), t * (.96 + r() * .06)); ims[i % ims.length].setColorAt(Math.floor(i / ims.length), tint); }); ims.forEach(m => { if (m.instanceColor) m.instanceColor.needsUpdate = true; }); }
  const views = { main: { az: -20, el: 19, dist: 92, t: [0, 8, 10] } };
  const labels = [
    { id: 'cage', text: 'GABION CAGE', side: 'l', anchor: new V3(-W / 2, H + .5, D / 2), show: () => true },
    { id: 'mesh', text: 'MESH OPENING', side: 'l', anchor: () => new V3(-W / 2, H * .3, D / 2), show: () => true },
    { id: 'bld', text: 'BOULDERS · RETAINED', side: 'r', anchor: () => { const b = items[0]; return new V3(b.p[0], b.p[1] + b.rad + .5, b.p[2]); }, show: () => true },
    { id: 'esc', text: '60 mm STONE · PASSES THE OPENING', tone: 'warn', side: 'r', anchor: new V3(14, .6, D / 2 + 18), show: s => s.open >= 8 },
    { id: 'hold', text: '60 mm STONE · RETAINED', side: 'r', anchor: new V3(W / 2 - 3, H - 3, D / 2), show: s => s.open < 8 },
  ];
  return {
    scene, views, fov: 30, labels, limits: { az: [-65, 65], el: [6, 58], dist: [40, 150] },
    update(t, dt, st) {
      const open = st.open || 8; if (open !== curOpen) { curOpen = open; setMesh(open); }
      let moving = false; const rk = reduce();
      const step = (it, dmin) => {
        const goal = dmin < open * .94 && it.p[2] > -2 ? 1 : 0, d = goal - it.esc;
        if (Math.abs(d) > .002) { it.esc += rk ? d : d * (1 - Math.exp(-dt * (goal ? 1.3 : 2.2) / (.55 + it.ph))); moving = true; } else it.esc = goal;
        const e = it.esc, ee = e * e * (3 - 2 * e); return [lerp(it.p[0], it.out[0], ee), lerp(it.p[1], it.out[1], Math.pow(ee, 1.5)) + Math.sin(ee * Math.PI) * 2.4, lerp(it.p[2], it.out[2], ee)];
      };
      items.forEach(it => { const q = step(it, it.rad * 2 * .84); it.s.position.set(q[0], q[1], q[2]); });
      small.forEach((it, i) => { const q = step(it, it.rad * 2 * .84); o.position.set(q[0], q[1], q[2]); o.scale.set(it.rad, it.rad * .85, it.rad * 1.05); o.rotation.set(...it.rot); o.updateMatrix(); ims[i % ims.length].setMatrixAt(Math.floor(i / ims.length), o.matrix); });
      ims.forEach(m => { m.instanceMatrix.needsUpdate = true; }); return moving;
    },
  };
}
